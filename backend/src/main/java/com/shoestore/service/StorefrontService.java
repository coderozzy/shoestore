package com.shoestore.service;

import com.shoestore.dto.CategoryDTO;
import com.shoestore.dto.StorefrontProductDTO;
import com.shoestore.entity.Product;
import com.shoestore.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StorefrontService {

    private final ProductRepository productRepository;
    private final CategoryService categoryService;
    private final PricingService pricingService;

    @Transactional(readOnly = true)
    public List<StorefrontProductDTO> getProducts() {
        return productRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryDTO> getCategories() {
        return categoryService.getAllCategories();
    }

    private StorefrontProductDTO toDTO(Product product) {
        return StorefrontProductDTO.builder()
                .id(product.getId())
                .modelName(product.getModelName())
                .gender(product.getGender())
                .color(product.getColor())
                .originalPrice(product.getPrice())
                .effectivePrice(pricingService.getEffectivePrice(product))
                .discounted(pricingService.isDiscounted(product))
                .discountName(pricingService.getDiscountName(product))
                .sizes(product.getSizes().stream()
                        .map(size -> com.shoestore.dto.ProductSizeDTO.builder()
                                .id(size.getId())
                                .size(size.getSize())
                                .stockQuantity(size.getStockQuantity())
                                .build())
                        .toList())
                .totalStock(product.getTotalStock())
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .build();
    }
}
