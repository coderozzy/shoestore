package com.shoestore.service;

import com.shoestore.dto.CheckoutRequest;
import com.shoestore.dto.CheckoutResponse;
import com.shoestore.dto.OrderDTO;
import com.shoestore.dto.OrderItemDTO;
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
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Orchestrates the lifecycle of customer-facing (online) orders. Flow:
 *
 *   1. {@link #initiateCheckout(CheckoutRequest)} — validates cart, reserves
 *      stock, creates a PENDING order and a Stripe PaymentIntent. Returns the
 *      client_secret the storefront uses with Stripe Elements.
 *   2. Stripe Elements confirms the card on the client side.
 *   3. Either {@link #confirmPayment(String)} (called by the storefront after
 *      Stripe Elements resolves) or {@link #markPaidByWebhook(String, String)}
 *      (called from the Stripe webhook) flips the order to PAID. Both are
 *      idempotent so whichever arrives first wins.
 *   4. {@link #markPaymentFailed(String)} restores stock on a failed payment.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final CustomerOrderRepository customerOrderRepository;
    private final ProductRepository productRepository;
    private final ProductSizeRepository productSizeRepository;
    private final PricingService pricingService;
    private final StockMovementService stockMovementService;
    private final StripeService stripeService;

    @Transactional
    public CheckoutResponse initiateCheckout(CheckoutRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Order must contain at least one item");
        }

        CustomerOrder order = CustomerOrder.builder()
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
            // Lock the ProductSize row to prevent two concurrent checkouts from
            // overselling the last pair of a given size.
            ProductSize productSize = productSizeRepository
                    .findByProductIdAndSizeForUpdate(product.getId(), itemRequest.getSize())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "ProductSize", "size", itemRequest.getSize()));

            if (productSize.getStockQuantity() < itemRequest.getQuantity()) {
                throw new BadRequestException("Insufficient stock for "
                        + product.getModelName() + " size " + itemRequest.getSize());
            }

            // Audit trail first so if it fails the stock is never decremented.
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

        // Persist the order first so the PaymentIntent can carry a real order_id.
        CustomerOrder savedOrder = customerOrderRepository.save(order);

        PaymentIntent paymentIntent = stripeService.createPaymentIntent(
                savedOrder.getId(),
                totalAmount,
                request.getCustomerEmail());

        savedOrder.setStripePaymentIntentId(paymentIntent.getId());
        savedOrder.setStripePaymentStatus(paymentIntent.getStatus());
        customerOrderRepository.save(savedOrder);

        return CheckoutResponse.builder()
                .orderId(savedOrder.getId())
                .clientSecret(paymentIntent.getClientSecret())
                .paymentIntentId(paymentIntent.getId())
                .amount(totalAmount)
                .currency(paymentIntent.getCurrency())
                .build();
    }

    /** Called by the storefront after Stripe Elements confirms the card. */
    @Transactional
    public OrderDTO confirmPayment(String paymentIntentId) {
        CustomerOrder order = customerOrderRepository.findByStripePaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Order", "stripePaymentIntentId", paymentIntentId));

        PaymentIntent pi = stripeService.retrievePaymentIntent(paymentIntentId);
        applyPaymentIntentState(order, pi.getStatus());
        return toDTO(customerOrderRepository.save(order));
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

    /** Called on Stripe's {@code payment_intent.payment_failed} — restores stock. */
    @Transactional
    public void markPaymentFailed(String paymentIntentId) {
        Optional<CustomerOrder> maybeOrder = customerOrderRepository
                .findByStripePaymentIntentId(paymentIntentId);
        if (maybeOrder.isEmpty()) return;

        CustomerOrder order = maybeOrder.get();
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.PAID) {
            return; // idempotent
        }
        restoreStock(order, "Online order (payment failed)");
        order.setStatus(OrderStatus.CANCELLED);
        order.setStripePaymentStatus("payment_failed");
        customerOrderRepository.save(order);
    }

    private void applyPaymentIntentState(CustomerOrder order, String stripeStatus) {
        order.setStripePaymentStatus(stripeStatus);
        if ("succeeded".equals(stripeStatus)) {
            if (order.getStatus() != OrderStatus.PAID) {
                order.setStatus(OrderStatus.PAID);
                order.setPaidAt(LocalDateTime.now());
            }
        } else if ("canceled".equals(stripeStatus) || "payment_failed".equals(stripeStatus)) {
            if (order.getStatus() != OrderStatus.CANCELLED) {
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

    @Transactional(readOnly = true)
    public OrderDTO getOrderById(Long orderId) {
        return toDTO(customerOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId)));
    }

    @Transactional
    public OrderDTO updateStatus(Long orderId, OrderStatus status) {
        CustomerOrder order = customerOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        if (status == OrderStatus.CANCELLED && order.getStatus() != OrderStatus.CANCELLED) {
            restoreStock(order, "Admin cancellation");
        }
        order.setStatus(status);
        return toDTO(customerOrderRepository.save(order));
    }

    private OrderDTO toDTO(CustomerOrder order) {
        return OrderDTO.builder()
                .id(order.getId())
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
                        .map(item -> OrderItemDTO.builder()
                                .id(item.getId())
                                .productId(item.getProduct().getId())
                                .productName(item.getProduct().getModelName())
                                .color(item.getProduct().getColor())
                                .size(item.getSize())
                                .quantity(item.getQuantity())
                                .unitPrice(item.getUnitPrice())
                                .totalPrice(item.getTotalPrice())
                                .build())
                        .toList())
                .build();
    }
}
