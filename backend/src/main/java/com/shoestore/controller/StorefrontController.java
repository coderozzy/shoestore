package com.shoestore.controller;

import com.shoestore.dto.CategoryDTO;
import com.shoestore.dto.CheckoutRequest;
import com.shoestore.dto.CheckoutResponse;
import com.shoestore.dto.ConfirmPaymentRequest;
import com.shoestore.dto.OrderDTO;
import com.shoestore.dto.StorefrontProductDTO;
import com.shoestore.service.OrderService;
import com.shoestore.service.StorefrontService;
import com.shoestore.service.StripeService;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public API consumed by the customer-facing storefront. All endpoints are
 * whitelisted in {@link com.shoestore.config.SecurityConfig} — no JWT required.
 */
@RestController
@RequestMapping("/api/storefront")
@RequiredArgsConstructor
@Slf4j
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

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderDTO> getOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getOrderById(orderId));
    }

    @PostMapping("/checkout/create-payment-intent")
    public ResponseEntity<CheckoutResponse> createPaymentIntent(
            @Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.initiateCheckout(request));
    }

    @PostMapping("/checkout/confirm")
    public ResponseEntity<OrderDTO> confirmPayment(
            @Valid @RequestBody ConfirmPaymentRequest request) {
        return ResponseEntity.ok(orderService.confirmPayment(request.getPaymentIntentId()));
    }

    /**
     * Stripe → backend webhook. Kept idempotent so even if the browser also
     * calls /checkout/confirm, we never double-apply state.
     */
    @PostMapping("/checkout/webhook")
    public ResponseEntity<String> stripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        Event event = stripeService.constructWebhookEvent(payload, signature);
        if (event == null) {
            // webhook secret not configured — acknowledge so Stripe stops retrying in dev.
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
