package com.shoestore.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Runtime Stripe configuration read from {@code stripe.*} in application.yml.
 * Values ultimately come from environment variables (see docker-compose.yml
 * and .env.example).
 */
@Component
@ConfigurationProperties(prefix = "stripe")
@Data
public class StripeProperties {
    /** Stripe secret key. Required for any checkout call. */
    private String secretKey;
    /** Webhook signing secret for Stripe → backend callbacks. Optional locally. */
    private String webhookSecret;
    /** ISO-4217 currency used for PaymentIntents. Defaults to "try". */
    private String currency = "try";
}
