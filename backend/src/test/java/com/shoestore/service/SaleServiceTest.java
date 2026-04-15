package com.shoestore.service;

import com.shoestore.entity.Product;
import com.shoestore.entity.Sale;
import com.shoestore.entity.User;
import com.shoestore.enums.Role;
import com.shoestore.event.SaleCreatedEvent;
import com.shoestore.repository.ProductDiscountRepository;
import com.shoestore.repository.SaleRepository;
import com.shoestore.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SaleServiceTest {

    @Mock
    private SaleRepository saleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProductDiscountRepository productDiscountRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private SaleService saleService;

    @BeforeEach
    void setUp() {
        PricingService pricingService = new PricingService(productDiscountRepository);
        saleService = new SaleService(saleRepository, userRepository, pricingService, eventPublisher);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("staff", null)
        );
    }

    @Test
    void shouldRecordStoreSaleAndPublishEvent() {
        Product product = Product.builder()
                .id(3L)
                .modelName("Runner")
                .price(BigDecimal.valueOf(200))
                .build();
        User user = User.builder().id(9L).username("staff").role(Role.STAFF).build();

        when(userRepository.findByUsername("staff")).thenReturn(Optional.of(user));
        when(productDiscountRepository.findByProductId(product.getId())).thenReturn(java.util.List.of());
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(99L);
            sale.setCreatedAt(LocalDateTime.of(2026, 1, 1, 12, 0));
            return sale;
        });

        Sale sale = saleService.recordStoreSale(product, BigDecimal.valueOf(42), 2);

        assertThat(sale.getTotalAmount()).isEqualByComparingTo("400");
        assertThat(sale.getItems()).hasSize(1);
        assertThat(sale.getItems().get(0).getQuantity()).isEqualTo(2);

        ArgumentCaptor<SaleCreatedEvent> captor = ArgumentCaptor.forClass(SaleCreatedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().getSaleId()).isEqualTo(99L);
        assertThat(captor.getValue().getQuantity()).isEqualTo(2);
        assertThat(captor.getValue().getTotalAmount()).isEqualByComparingTo("400");
    }
}
