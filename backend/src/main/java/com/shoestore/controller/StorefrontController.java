package com.shoestore.controller;

import com.shoestore.dto.CategoryDTO;
import com.shoestore.dto.CheckoutRequest;
import com.shoestore.dto.CheckoutResponse;
import com.shoestore.dto.ConfirmPaymentRequest;
import com.shoestore.dto.StorefrontOrderDTO;
import com.shoestore.dto.StorefrontProductDTO;
import com.shoestore.service.OrderService;
import com.shoestore.service.StorefrontService;
import com.shoestore.service.StripeService;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public API consumed by the customer-facing storefront. Most endpoints are
 * whitelisted in {@link com.shoestore.config.SecurityConfig} — no JWT required.
 * The order-lookup flow is gated by a per-order HMAC token instead (C-4).
 */
@RestController
@RequestMapping("/api/storefront")
@RequiredArgsConstructor
@Slf4j
@Validated
public class StorefrontController {

    private final StorefrontService storefrontService;
    private final OrderService orderService;
    private final StripeService stripeService;

    @GetMapping("/products")
    public ResponseEntity<List<StorefrontProductDTO>> getProducts() {
        return ResponseEntity.ok(storefrontService.getProducts());
    }

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDTO>> getCategories() {
        return ResponseEntity.ok(storefrontService.getCategories());
    }

    /**
     * Customer-facing order lookup by numeric id. Kept for back-compat with
     * the order-confirmation page, which receives an {@code orderId} from
     * the create-payment-intent response and passes it on its return-from-
     * Stripe round-trip. Customers entering "Track order" should hit
     * {@link #getOrderByNumber(String, String)} instead — the order number
     * is opaque and unenumerable, the numeric id is not.
     */
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<StorefrontOrderDTO> getOrder(
            @PathVariable Long orderId,
            @RequestParam("token") @NotBlank String token) {
        return ResponseEntity.ok(orderService.getOrderForCustomer(orderId, token));
    }

    /**
     * Customer-facing order lookup by the public, opaque order number
     * ("STP-XXXXXXXX"). Same token check as the by-id variant; the
     * different path lets the storefront's Track Order form ask only for
     * the human-friendly identifier.
     */
    @GetMapping("/orders/by-number/{orderNumber}")
    public ResponseEntity<StorefrontOrderDTO> getOrderByNumber(
            @PathVariable String orderNumber,
            @RequestParam("token") @NotBlank String token) {
        return ResponseEntity.ok(
                orderService.getOrderForCustomerByNumber(orderNumber, token));
    }

    @PostMapping("/checkout/create-payment-intent")
    public ResponseEntity<CheckoutResponse> createPaymentIntent(
            @Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.initiateCheckout(request));
    }

    @PostMapping("/checkout/confirm")
    public ResponseEntity<StorefrontOrderDTO> confirmPayment(
            @Valid @RequestBody ConfirmPaymentRequest request) {
        return ResponseEntity.ok(orderService.confirmPayment(
                request.getOrderId(),
                request.getPaymentIntentId(),
                request.getLookupToken()));
    }

    @PostMapping("/checkout/webhook")
    public ResponseEntity<String> stripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        Event event = stripeService.constructWebhookEvent(payload, signature);
        if (event == null) {
            return ResponseEntity.ok("webhook-disabled");
        }

        StripeObject stripeObject = event.getDataObjectDeserializer()
                .getObject()
                .orElse(null);

        if (!(stripeObject instanceof PaymentIntent paymentIntent)) {
            return ResponseEntity.ok("ignored");
        }

        switch (event.getType()) {
            case "payment_intent.succeeded" ->
                    orderService.markPaidByWebhook(paymentIntent.getId(), paymentIntent.getStatus());
            case "payment_intent.payment_failed", "payment_intent.canceled" ->
                    orderService.markPaymentFailed(paymentIntent.getId());
            default -> log.debug("Ignoring Stripe event type {}", event.getType());
        }

        return ResponseEntity.ok("ok");
    }
}
