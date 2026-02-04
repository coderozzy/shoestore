package com.shoestore.dto;

import com.shoestore.enums.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
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
public class CreateProductRequest {

    @NotBlank(message = "Model name is required")
    @Size(max = 255, message = "Model name must be less than 255 characters")
    private String modelName;

    @NotNull(message = "Gender is required")
    private Gender gender;

    @NotBlank(message = "Color is required")
    @Size(max = 50, message = "Color must be less than 50 characters")
    private String color;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private BigDecimal price;

    @Valid
    private List<SizeStockRequest> sizes;

    @NotBlank(message = "QR Code Value is required")
    private String qrCodeValue;

    private Long categoryId;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SizeStockRequest {
        @NotNull(message = "Size is required")
        @DecimalMin(value = "20.0", message = "Size must be at least 20")
        @DecimalMax(value = "55.0", message = "Size must be at most 55")
        private BigDecimal size;

        @NotNull(message = "Stock quantity is required")
        @Min(value = 0, message = "Stock quantity cannot be negative")
        private Integer stockQuantity;
    }
}
