package com.shoestore.service;

import com.shoestore.entity.Product;
import com.shoestore.entity.Sale;
import com.shoestore.entity.SaleItem;
import com.shoestore.entity.User;
import com.shoestore.enums.SalesChannel;
import com.shoestore.event.SaleCreatedEvent;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.repository.SaleRepository;
import com.shoestore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final UserRepository userRepository;
    private final PricingService pricingService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Sale recordStoreSale(Product product, BigDecimal size, int quantity) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        BigDecimal unitPrice = pricingService.getEffectivePrice(product);
        BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));

        Sale sale = Sale.builder()
                .user(user)
                .channel(SalesChannel.STORE)
                .totalAmount(totalPrice)
                .build();

        SaleItem saleItem = SaleItem.builder()
                .sale(sale)
                .product(product)
                .size(size)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .totalPrice(totalPrice)
                .build();
        sale.getItems().add(saleItem);

        Sale savedSale = saleRepository.save(sale);
        eventPublisher.publishEvent(SaleCreatedEvent.builder()
                .saleId(savedSale.getId())
                .userId(user.getId())
                .username(user.getUsername())
                .quantity(quantity)
                .totalAmount(totalPrice)
                .occurredAt(savedSale.getCreatedAt())
                .build());
        return savedSale;
    }
}
