package com.shoestore.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sent by the storefront after Stripe Elements confirmed the PaymentIntent
 * client-side. The {@code lookupToken} is the HMAC we handed back at
 * create-payment-intent — the only way to prove ownership of the order
 * without a login (C-4).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfirmPaymentRequest {
    @NotNull
    private Long orderId;

    @NotBlank
    private String paymentIntentId;

    @NotBlank
    private String lookupToken;
}
