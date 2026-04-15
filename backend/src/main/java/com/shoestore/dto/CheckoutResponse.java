package com.shoestore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Returned by {@code POST /api/storefront/checkout/create-payment-intent}. The
 * storefront uses {@code clientSecret} with Stripe Elements to collect the card
 * and confirm the payment.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutResponse {
    private Long orderId;
    private String clientSecret;
    private String paymentIntentId;
    private BigDecimal amount;
    private String currency;
}
