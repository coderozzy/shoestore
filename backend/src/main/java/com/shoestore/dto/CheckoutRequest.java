package com.shoestore.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Payload submitted by the storefront to start a checkout. Creates a PENDING
 * order and a Stripe PaymentIntent.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest {

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotBlank(message = "Customer phone is required")
    private String customerPhone;

    @NotBlank(message = "Customer email is required")
    @Email
    private String customerEmail;

    @NotBlank(message = "Shipping address line 1 is required")
    private String shippingLine1;

    private String shippingLine2;

    @NotBlank(message = "Shipping city is required")
    private String shippingCity;

    @NotBlank(message = "Postal code is required")
    private String shippingPostalCode;

    @NotBlank(message = "Country is required")
    @Size(min = 2, max = 2, message = "Country must be an ISO 3166-1 alpha-2 code")
    private String shippingCountry;

    private String notes;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<Item> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Item {
        @NotNull
        private Long productId;

        @NotNull
        private BigDecimal size;

        @NotNull
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
    }
}
