package com.shoestore.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sent by the storefront after Stripe Elements confirmed the PaymentIntent
 * client-side. The backend verifies the status with Stripe and flips the order
 * to PAID idempotently.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfirmPaymentRequest {
    @NotBlank
    private String paymentIntentId;
}
