package com.shoestore.service;

import com.shoestore.config.StripeProperties;
import com.shoestore.exception.BadRequestException;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

/**
 * Thin wrapper over Stripe's Java SDK. Centralises:
 *   - PaymentIntent creation with line-item metadata
 *   - PaymentIntent retrieval (for idempotent order confirmation)
 *   - Webhook signature verification
 *
 * All amounts are passed as {@link BigDecimal} in major units (e.g. 299.90 TRY)
 * and converted to Stripe's minor-unit longs internally.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StripeService {

    private final StripeProperties properties;

    @PostConstruct
    void init() {
        if (StringUtils.hasText(properties.getSecretKey())) {
            Stripe.apiKey = properties.getSecretKey();
            log.info("Stripe SDK initialised ({} mode, currency={})",
                    properties.getSecretKey().startsWith("sk_live_") ? "LIVE" : "test",
                    properties.getCurrency());
        } else {
            log.warn("STRIPE_SECRET_KEY is empty — checkout endpoints will fail until it is set.");
        }
    }

    public PaymentIntent createPaymentIntent(Long orderId,
                                             BigDecimal amount,
                                             String customerEmail) {
        requireConfigured();

        long amountMinor = amount.setScale(2, RoundingMode.HALF_UP)
                .movePointRight(2)
                .longValueExact();

        Map<String, String> metadata = new HashMap<>();
        metadata.put("order_id", String.valueOf(orderId));

        PaymentIntentCreateParams.Builder builder = PaymentIntentCreateParams.builder()
                .setAmount(amountMinor)
                .setCurrency(properties.getCurrency())
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build())
                .putAllMetadata(metadata);

        if (StringUtils.hasText(customerEmail)) {
            builder.setReceiptEmail(customerEmail);
        }

        try {
            return PaymentIntent.create(builder.build());
        } catch (StripeException e) {
            log.error("Stripe PaymentIntent creation failed for order {}", orderId, e);
            throw new BadRequestException("Payment provider error: " + e.getMessage());
        }
    }

    public PaymentIntent retrievePaymentIntent(String paymentIntentId) {
        requireConfigured();
        try {
            return PaymentIntent.retrieve(paymentIntentId);
        } catch (StripeException e) {
            log.error("Failed to retrieve Stripe PaymentIntent {}", paymentIntentId, e);
            throw new BadRequestException("Payment provider error: " + e.getMessage());
        }
    }

    /**
     * Verifies the Stripe webhook signature and parses the event. Returns
     * {@code null} if webhook verification is not configured (e.g. local dev
     * without {@code stripe listen}).
     */
    public Event constructWebhookEvent(String payload, String sigHeader) {
        if (!StringUtils.hasText(properties.getWebhookSecret())) {
            log.warn("STRIPE_WEBHOOK_SECRET is not set — ignoring webhook payload.");
            return null;
        }
        try {
            return Webhook.constructEvent(payload, sigHeader, properties.getWebhookSecret());
        } catch (SignatureVerificationException e) {
            throw new BadRequestException("Invalid Stripe webhook signature");
        }
    }

    private void requireConfigured() {
        if (!StringUtils.hasText(properties.getSecretKey())) {
            throw new BadRequestException(
                    "Payments are not configured. Set STRIPE_SECRET_KEY in the backend environment.");
        }
    }
}
