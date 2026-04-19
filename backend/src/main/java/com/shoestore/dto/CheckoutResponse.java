package com.shoestore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Returned by {@code POST /api/storefront/checkout/create-payment-intent}.
 *
 * {@code lookupToken} is a single-purpose HMAC that the storefront must
 * present on subsequent calls to {@code /orders/{id}} and
 * {@code /checkout/confirm}. Without it, the caller can't read PII or
 * influence the payment flow — prevents IDOR and payment-flow abuse (C-4).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutResponse {
    private Long orderId;
    private String clientSecret;
    private String paymentIntentId;
    private String lookupToken;
    private BigDecimal amount;
    private String currency;
}
