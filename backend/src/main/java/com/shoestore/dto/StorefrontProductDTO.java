package com.shoestore.dto;

import com.shoestore.enums.Gender;
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
public class StorefrontProductDTO {
    private Long id;
    private String modelName;
    private Gender gender;
    private String color;
    private BigDecimal originalPrice;
    private BigDecimal effectivePrice;
    private String imageDataUrl;
    private List<String> imageDataUrls;
    private boolean discounted;
    private String discountName;
    private List<ProductSizeDTO> sizes;
    private Integer totalStock;
    private String categoryName;
}
