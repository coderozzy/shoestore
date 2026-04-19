package com.shoestore.service;

import com.shoestore.dto.StorefrontProductDTO;
import com.shoestore.entity.Category;
import com.shoestore.entity.Discount;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductDiscount;
import com.shoestore.entity.ProductSize;
import com.shoestore.enums.DiscountType;
import com.shoestore.repository.ProductDiscountRepository;
import com.shoestore.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StorefrontServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductDiscountRepository productDiscountRepository;

    private StorefrontService storefrontService;

    @BeforeEach
    void setUp() {
        PricingService pricingService = new PricingService(productDiscountRepository);
        storefrontService = new StorefrontService(productRepository, null, pricingService);
    }

    @Test
    void shouldMapProductsWithEffectivePriceForStorefront() {
        Product product = Product.builder()
                .id(1L)
                .modelName("Street Runner")
                .color("White")
                .price(BigDecimal.valueOf(300))
                .publishedToStore(true)
                .category(Category.builder().name("MEN").build())
                .sizes(List.of(
                        ProductSize.builder().id(1L).size(BigDecimal.valueOf(41)).stockQuantity(2).build(),
                        ProductSize.builder().id(2L).size(BigDecimal.valueOf(42)).stockQuantity(1).build()
                ))
                .build();

        when(productRepository.findPublishedForStorefront()).thenReturn(List.of(product));
        when(productDiscountRepository.findByProductId(product.getId())).thenReturn(List.of(
                ProductDiscount.builder()
                        .product(product)
                        .discount(Discount.builder()
                                .name("Spring Sale")
                                .type(DiscountType.FIXED)
                                .value(BigDecimal.valueOf(50))
                                .active(true)
                                .build())
                        .build()
        ));

        List<StorefrontProductDTO> result = storefrontService.getProducts();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEffectivePrice()).isEqualByComparingTo("250");
        assertThat(result.get(0).isDiscounted()).isTrue();
        assertThat(result.get(0).getDiscountName()).isEqualTo("Spring Sale");
        assertThat(result.get(0).getSizes()).hasSize(2);
        assertThat(result.get(0).getCategoryName()).isEqualTo("MEN");
    }
}
