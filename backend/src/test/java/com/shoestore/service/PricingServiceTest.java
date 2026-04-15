package com.shoestore.service;

import com.shoestore.entity.Discount;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductDiscount;
import com.shoestore.enums.DiscountType;
import com.shoestore.repository.ProductDiscountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    @Mock
    private ProductDiscountRepository productDiscountRepository;

    private PricingService pricingService;

    @BeforeEach
    void setUp() {
        pricingService = new PricingService(productDiscountRepository);
    }

    @Test
    void shouldApplyBestActiveDiscountToProductPrice() {
        Product product = Product.builder()
                .id(10L)
                .price(BigDecimal.valueOf(100))
                .build();

        Discount percentage = Discount.builder()
                .name("Ten Off")
                .type(DiscountType.PERCENTAGE)
                .value(BigDecimal.TEN)
                .active(true)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(1))
                .build();

        Discount fixed = Discount.builder()
                .name("Fifteen Off")
                .type(DiscountType.FIXED)
                .value(BigDecimal.valueOf(15))
                .active(true)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(1))
                .build();

        when(productDiscountRepository.findByProductId(product.getId())).thenReturn(List.of(
                ProductDiscount.builder().product(product).discount(percentage).build(),
                ProductDiscount.builder().product(product).discount(fixed).build()
        ));

        assertThat(pricingService.getEffectivePrice(product)).isEqualByComparingTo("85.00");
        assertThat(pricingService.isDiscounted(product)).isTrue();
        assertThat(pricingService.getDiscountName(product)).isEqualTo("Fifteen Off");
    }

    @Test
    void shouldReturnOriginalPriceWhenNoDiscountExists() {
        Product product = Product.builder()
                .id(22L)
                .price(BigDecimal.valueOf(249.99))
                .build();

        when(productDiscountRepository.findByProductId(product.getId())).thenReturn(List.of());

        assertThat(pricingService.getEffectivePrice(product)).isEqualByComparingTo("249.99");
        assertThat(pricingService.isDiscounted(product)).isFalse();
        assertThat(pricingService.getDiscountName(product)).isNull();
    }
}
