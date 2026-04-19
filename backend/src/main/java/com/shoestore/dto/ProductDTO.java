package com.shoestore.dto;

import com.shoestore.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDTO {
    private Long id;
    private String modelName;
    private Gender gender;
    private String color;
    private BigDecimal price;
    private String imageDataUrl;
    private List<String> imageDataUrls;
    private boolean publishedToStore;
    private Integer storeDisplayOrder;
    private List<ProductSizeDTO> sizes;
    private Integer totalStock;
    private UUID qrCodeValue;
    private String categoryName;
    private boolean lowStock;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
