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
    @DecimalMax(value = "1000000.00", message = "Price must be no more than 1,000,000")
    private BigDecimal price;

    // Data-URL images are sniffed/validated in ProductService. The @Size caps
    // guard the HTTP layer against multi-megabyte spam before parsing.
    @Size(max = 15_000_000, message = "Product image is too large")
    @Pattern(
            regexp = "^$|^data:image/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$",
            message = "Image must be a PNG/JPEG/WebP data URL"
    )
    private String imageDataUrl;

    private List<@Size(max = 15_000_000, message = "Product image is too large")
                 @Pattern(
                         regexp = "^data:image/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$",
                         message = "Image must be a PNG/JPEG/WebP data URL"
                 ) String> imageDataUrls;

    private Boolean publishedToStore;
    private Integer storeDisplayOrder;

    @NotEmpty(message = "At least one size is required")
    @Size(max = 50, message = "At most 50 sizes per product")
    @Valid
    private List<SizeStockRequest> sizes;

    @NotBlank(message = "QR Code Value is required")
    @Pattern(
            regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
            message = "QR Code Value must be a valid UUID"
    )
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
        @Max(value = 100_000, message = "Stock quantity unreasonably high")
        private Integer stockQuantity;
    }
}
