package com.shoestore.dto;

import com.shoestore.enums.Gender;
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
public class UpdateProductRequest {

    @Size(max = 255, message = "Model name must be less than 255 characters")
    private String modelName;

    private Gender gender;

    @Size(max = 50, message = "Color must be less than 50 characters")
    private String color;

    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    @DecimalMax(value = "1000000.00", message = "Price must be no more than 1,000,000")
    private BigDecimal price;

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

    private Long categoryId;
}
