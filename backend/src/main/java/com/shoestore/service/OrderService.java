package com.shoestore.service;

import com.shoestore.dto.CheckoutRequest;
import com.shoestore.dto.CheckoutResponse;
import com.shoestore.dto.OrderDTO;
import com.shoestore.dto.OrderItemDTO;
import com.shoestore.dto.StorefrontOrderDTO;
import com.shoestore.entity.CustomerOrder;
import com.shoestore.entity.OrderItem;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductSize;
import com.shoestore.enums.MovementDirection;
import com.shoestore.enums.OrderStatus;
import com.shoestore.enums.StockMovementReason;
import com.shoestore.exception.BadRequestException;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.repository.CustomerOrderRepository;
import com.shoestore.repository.ProductRepository;
import com.shoestore.repository.ProductSizeRepository;
import com.shoestore.security.OrderLookupTokenService;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Orchestrates the lifecycle of customer-facing (online) orders.
 *
 * Status transition rules are intentionally restrictive — there's no way to
 * go CANCELLED → PAID (which was H-7: stock desync). Only the Stripe webhook
 * and the {@code /checkout/confirm} round-trip can flip PENDING → PAID.
 * Admin tooling can fulfill a paid order or cancel any non-final order.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_ADMIN_TRANSITIONS = Map.of(
            // From PENDING an admin can only cancel (refund is handled via Stripe on payment side).
            OrderStatus.PENDING, EnumSet.of(OrderStatus.CANCELLED),
            OrderStatus.PAID, EnumSet.of(OrderStatus.FULFILLED, OrderStatus.CANCELLED),
            OrderStatus.FULFILLED, EnumSet.of(OrderStatus.CANCELLED),
            OrderStatus.CANCELLED, EnumSet.noneOf(OrderStatus.class)
    );

    private final CustomerOrderRepository customerOrderRepository;
    private final ProductRepository productRepository;
    private final ProductSizeRepository productSizeRepository;
    private final PricingService pricingService;
    private final StockMovementService stockMovementService;
    private final StripeService stripeService;
    private final OrderLookupTokenService orderLookupTokenService;
    private final AuditLogService auditLogService;
    private final OrderNumberService orderNumberService;
    private final OrderEmailService orderEmailService;

    @Transactional
    public CheckoutResponse initiateCheckout(CheckoutRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Order must contain at least one item");
        }

        CustomerOrder order = CustomerOrder.builder()
                .orderNumber(orderNumberService.generateUnique())
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .customerEmail(request.getCustomerEmail())
                .notes(request.getNotes())
                .shippingLine1(request.getShippingLine1())
                .shippingLine2(request.getShippingLine2())
                .shippingCity(request.getShippingCity())
                .shippingPostalCode(request.getShippingPostalCode())
                .shippingCountry(request.getShippingCountry() == null
                        ? null
                        : request.getShippingCountry().toUpperCase())
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CheckoutRequest.Item itemRequest : request.getItems()) {
            if (itemRequest.getQuantity() == null || itemRequest.getQuantity() <= 0) {
                throw new BadRequestException("Item quantity must be greater than 0");
            }
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product", "id", itemRequest.getProductId()));
            ProductSize productSize = productSizeRepository
                    .findByProductIdAndSizeForUpdate(product.getId(), itemRequest.getSize())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "ProductSize", "size", itemRequest.getSize()));

            if (productSize.getStockQuantity() < itemRequest.getQuantity()) {
                throw new BadRequestException("Insufficient stock for "
                        + product.getModelName() + " size " + itemRequest.getSize());
            }

            stockMovementService.recordSystemMovement(
                    product,
                    itemRequest.getSize(),
                    itemRequest.getQuantity(),
                    MovementDirection.OUT,
                    StockMovementReason.SALE,
                    "Online order (reserved)"
            );

            productSize.decrementStock(itemRequest.getQuantity());
            productSizeRepository.save(productSize);

            BigDecimal unitPrice = pricingService.getEffectivePrice(product);
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));

            order.getItems().add(OrderItem.builder()
                    .order(order)
                    .product(product)
                    .size(itemRequest.getSize())
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build());
            totalAmount = totalAmount.add(lineTotal);
        }
        order.setTotalAmount(totalAmount);

        CustomerOrder savedOrder = customerOrderRepository.save(order);

        PaymentIntent paymentIntent = stripeService.createPaymentIntent(
                savedOrder.getId(),
                totalAmount,
                request.getCustomerEmail());

        savedOrder.setStripePaymentIntentId(paymentIntent.getId());
        savedOrder.setStripePaymentStatus(paymentIntent.getStatus());
        customerOrderRepository.save(savedOrder);

        String lookupToken = orderLookupTokenService.issue(
                savedOrder.getId(), paymentIntent.getId());

        return CheckoutResponse.builder()
                .orderId(savedOrder.getId())
                .orderNumber(savedOrder.getOrderNumber())
                .clientSecret(paymentIntent.getClientSecret())
                .paymentIntentId(paymentIntent.getId())
                .lookupToken(lookupToken)
                .amount(totalAmount)
                .currency(paymentIntent.getCurrency())
                .build();
    }

    /**
     * Called by the storefront after Stripe Elements confirms the card. The
     * storefront must prove ownership with the lookup token issued at
     * create-payment-intent time (C-4).
     */
    @Transactional
    public StorefrontOrderDTO confirmPayment(Long orderId, String paymentIntentId, String lookupToken) {
        orderLookupTokenService.verify(lookupToken, orderId);

        CustomerOrder order = customerOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Token binds (orderId, paymentIntentId); refuse if the client
        // is trying to confirm against a different PaymentIntent than the
        // one originally attached to this order.
        if (order.getStripePaymentIntentId() == null
                || !order.getStripePaymentIntentId().equals(paymentIntentId)) {
            throw new BadRequestException("Payment intent does not match order");
        }

        PaymentIntent pi = stripeService.retrievePaymentIntent(paymentIntentId);
        applyPaymentIntentState(order, pi.getStatus());
        return toStorefrontDTO(customerOrderRepository.save(order));
    }

    /** Idempotent: flips order to PAID if Stripe reports success. */
    @Transactional
    public void markPaidByWebhook(String paymentIntentId, String stripeStatus) {
        customerOrderRepository.findByStripePaymentIntentId(paymentIntentId)
                .ifPresent(order -> {
                    applyPaymentIntentState(order, stripeStatus);
                    customerOrderRepository.save(order);
                });
    }

    @Transactional
    public void markPaymentFailed(String paymentIntentId) {
        Optional<CustomerOrder> maybeOrder = customerOrderRepository
                .findByStripePaymentIntentId(paymentIntentId);
        if (maybeOrder.isEmpty()) return;

        CustomerOrder order = maybeOrder.get();
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.PAID) {
            return;
        }
        restoreStock(order, "Online order (payment failed)");
        order.setStatus(OrderStatus.CANCELLED);
        order.setStripePaymentStatus("payment_failed");
        customerOrderRepository.save(order);
    }

    private void applyPaymentIntentState(CustomerOrder order, String stripeStatus) {
        order.setStripePaymentStatus(stripeStatus);
        if ("succeeded".equals(stripeStatus)) {
            if (order.getStatus() == OrderStatus.PENDING) {
                order.setStatus(OrderStatus.PAID);
                order.setPaidAt(LocalDateTime.now());
                // Issue a fresh lookup token bound to this same payment intent
                // so the email magic link works for the configured TTL even if
                // the original token (handed back at create-payment-intent) is
                // close to expiring. Async send: SMTP latency must not bleed
                // back into the customer's confirm-payment HTTP latency.
                String emailToken = orderLookupTokenService.issue(
                        order.getId(), order.getStripePaymentIntentId());
                orderEmailService.sendOrderConfirmation(order, emailToken);
            } else if (order.getStatus() == OrderStatus.CANCELLED) {
                // Stock was already restored; we cannot silently re-decrement and
                // flip back to PAID because that's H-7. Payment capture after
                // cancellation is a manual refund path for the admin instead.
                log.warn("Stripe reports succeeded for cancelled order {} — requires manual review",
                        order.getId());
            }
        } else if ("canceled".equals(stripeStatus) || "payment_failed".equals(stripeStatus)) {
            if (order.getStatus() == OrderStatus.PENDING) {
                restoreStock(order, "Online order (" + stripeStatus + ")");
                order.setStatus(OrderStatus.CANCELLED);
            }
        }
    }

    private void restoreStock(CustomerOrder order, String note) {
        for (OrderItem item : order.getItems()) {
            ProductSize size = productSizeRepository
                    .findByProductIdAndSizeForUpdate(item.getProduct().getId(), item.getSize())
                    .orElse(null);
            if (size == null) continue;
            size.incrementStock(item.getQuantity());
            productSizeRepository.save(size);
            stockMovementService.recordSystemMovement(
                    item.getProduct(),
                    item.getSize(),
                    item.getQuantity(),
                    MovementDirection.IN,
                    StockMovementReason.RETURN,
                    note
            );
        }
    }

    @Transactional(readOnly = true)
    public List<OrderDTO> getOrders() {
        return customerOrderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDTO)
                .toList();
    }

    /** Storefront view — PII stripped, token-gated. */
    @Transactional(readOnly = true)
    public StorefrontOrderDTO getOrderForCustomer(Long orderId, String lookupToken) {
        orderLookupTokenService.verify(lookupToken, orderId);
        return toStorefrontDTO(customerOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId)));
    }

    /**
     * Storefront lookup by the public order number (e.g. STP-A7K9P3M2).
     * The lookup token is still bound to the numeric id internally; we
     * resolve the number → id first, then run the same HMAC check. We
     * deliberately surface a 404 (not a "wrong token" 400) when the
     * order number doesn't exist, so an attacker enumerating numbers
     * can't tell "no such order" apart from "exists but wrong token".
     */
    @Transactional(readOnly = true)
    public StorefrontOrderDTO getOrderForCustomerByNumber(String orderNumber, String lookupToken) {
        CustomerOrder order = customerOrderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "number", orderNumber));
        orderLookupTokenService.verify(lookupToken, order.getId());
        return toStorefrontDTO(order);
    }

    /**
     * Admin status update. Transitions are whitelisted to prevent H-7
     * (CANCELLED → PAID with no stock re-decrement) and to keep the audit
     * trail meaningful.
     */
    @Transactional
    public OrderDTO updateStatus(Long orderId, OrderStatus newStatus) {
        CustomerOrder order = customerOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        OrderStatus current = order.getStatus();
        if (current == newStatus) {
            return toDTO(order);
        }

        Set<OrderStatus> allowed = ALLOWED_ADMIN_TRANSITIONS.getOrDefault(
                current, EnumSet.noneOf(OrderStatus.class));
        if (!allowed.contains(newStatus)) {
            throw new BadRequestException(
                    "Illegal order status transition: " + current + " -> " + newStatus);
        }

        if (newStatus == OrderStatus.CANCELLED && current != OrderStatus.CANCELLED) {
            restoreStock(order, "Admin cancellation");
        }
        order.setStatus(newStatus);
        OrderDTO saved = toDTO(customerOrderRepository.save(order));

        auditLogService.record(
                "ORDER_STATUS_UPDATE",
                "CustomerOrder",
                orderId,
                current.name(),
                newStatus.name()
        );
        return saved;
    }

    /**
     * H-4 mitigation: sweeps PENDING orders that never completed payment so
     * their stock returns to circulation. Runs every 10 minutes, cancels
     * anything older than 30 minutes.
     */
    @Scheduled(fixedDelayString = "${app.order-sweeper.interval-ms:600000}")
    @Transactional
    public void sweepAbandonedCheckouts() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(30);
        List<CustomerOrder> stale = customerOrderRepository
                .findByStatusAndCreatedAtBefore(OrderStatus.PENDING, cutoff);
        for (CustomerOrder order : stale) {
            restoreStock(order, "Abandoned checkout sweep");
            order.setStatus(OrderStatus.CANCELLED);
            if (order.getStripePaymentStatus() == null) {
                order.setStripePaymentStatus("abandoned");
            }
            customerOrderRepository.save(order);
            log.info("Swept abandoned order {} (was PENDING for >30m)", order.getId());
        }
    }

    private OrderDTO toDTO(CustomerOrder order) {
        return OrderDTO.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerName(order.getCustomerName())
                .customerPhone(order.getCustomerPhone())
                .customerEmail(order.getCustomerEmail())
                .notes(order.getNotes())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getCreatedAt())
                .shippingLine1(order.getShippingLine1())
                .shippingLine2(order.getShippingLine2())
                .shippingCity(order.getShippingCity())
                .shippingPostalCode(order.getShippingPostalCode())
                .shippingCountry(order.getShippingCountry())
                .stripePaymentIntentId(order.getStripePaymentIntentId())
                .stripePaymentStatus(order.getStripePaymentStatus())
                .paidAt(order.getPaidAt())
                .items(order.getItems().stream()
                        .map(this::toItemDTO)
                        .toList())
                .build();
    }

    private StorefrontOrderDTO toStorefrontDTO(CustomerOrder order) {
        return StorefrontOrderDTO.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getCreatedAt())
                .paidAt(order.getPaidAt())
                .items(order.getItems().stream()
                        .map(this::toItemDTO)
                        .toList())
                .build();
    }

    private OrderItemDTO toItemDTO(OrderItem item) {
        return OrderItemDTO.builder()
                .id(item.getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getModelName())
                .color(item.getProduct().getColor())
                .size(item.getSize())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .build();
    }
}
