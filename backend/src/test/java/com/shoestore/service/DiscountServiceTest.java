package com.shoestore.service;

import com.shoestore.dto.CreateDiscountRequest;
import com.shoestore.dto.DiscountDTO;
import com.shoestore.entity.Discount;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductDiscount;
import com.shoestore.enums.DiscountType;
import com.shoestore.repository.DiscountRepository;
import com.shoestore.repository.ProductDiscountRepository;
import com.shoestore.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiscountServiceTest {

    @Mock
    private DiscountRepository discountRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductDiscountRepository productDiscountRepository;

    private DiscountService discountService;

    @BeforeEach
    void setUp() {
        discountService = new DiscountService(discountRepository, productRepository, productDiscountRepository);
    }

    @Test
    void shouldCreateDiscountForProducts() {
        CreateDiscountRequest request = CreateDiscountRequest.builder()
                .name("Weekend")
                .type(DiscountType.PERCENTAGE)
                .value(BigDecimal.valueOf(20))
                .startAt(LocalDateTime.now())
                .productIds(List.of(1L, 2L))
                .build();

        Discount savedDiscount = Discount.builder()
                .id(15L)
                .name("Weekend")
                .type(DiscountType.PERCENTAGE)
                .value(BigDecimal.valueOf(20))
                .active(true)
                .build();

        when(discountRepository.save(any(Discount.class))).thenReturn(savedDiscount);
        when(productRepository.findById(1L)).thenReturn(Optional.of(Product.builder().id(1L).build()));
        when(productRepository.findById(2L)).thenReturn(Optional.of(Product.builder().id(2L).build()));

        DiscountDTO result = discountService.createDiscount(request);

        assertThat(result.getId()).isEqualTo(15L);
        assertThat(result.getProductIds()).containsExactly(1L, 2L);
        verify(productDiscountRepository, times(2)).save(any(ProductDiscount.class));
    }

    @Test
    void shouldToggleDiscountState() {
        Discount discount = Discount.builder()
                .id(7L)
                .name("Winter")
                .type(DiscountType.FIXED)
                .value(BigDecimal.valueOf(50))
                .active(true)
                .build();

        when(discountRepository.findById(7L)).thenReturn(Optional.of(discount));
        when(discountRepository.save(discount)).thenReturn(discount);

        DiscountDTO result = discountService.toggleDiscount(7L, false);

        assertThat(result.getActive()).isFalse();
    }
}
