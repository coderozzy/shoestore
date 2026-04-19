package com.shoestore.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest {

    @NotBlank(message = "Customer name is required")
    @Size(max = 120, message = "Customer name is too long")
    private String customerName;

    @NotBlank(message = "Customer phone is required")
    @Size(max = 32, message = "Customer phone is too long")
    @Pattern(regexp = "^[0-9+()\\-. ]{6,32}$", message = "Customer phone contains invalid characters")
    private String customerPhone;

    @NotBlank(message = "Customer email is required")
    @Size(max = 254)
    @Email
    private String customerEmail;

    @NotBlank(message = "Shipping address line 1 is required")
    @Size(max = 200)
    private String shippingLine1;

    @Size(max = 200)
    private String shippingLine2;

    @NotBlank(message = "Shipping city is required")
    @Size(max = 80)
    private String shippingCity;

    @NotBlank(message = "Postal code is required")
    @Size(max = 20)
    private String shippingPostalCode;

    @NotBlank(message = "Country is required")
    @Size(min = 2, max = 2, message = "Country must be an ISO 3166-1 alpha-2 code")
    private String shippingCountry;

    @Size(max = 1000, message = "Notes are too long")
    private String notes;

    @NotEmpty(message = "At least one item is required")
    @Size(max = 50, message = "Too many items in one order")
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
        @Max(value = 50, message = "Quantity unreasonably high")
        private Integer quantity;
    }
}
