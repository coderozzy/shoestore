package com.shoestore.service;

import com.shoestore.entity.Discount;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductDiscount;
import com.shoestore.enums.DiscountType;
import com.shoestore.repository.ProductDiscountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PricingService {

    private final ProductDiscountRepository productDiscountRepository;

    public BigDecimal getEffectivePrice(Product product) {
        return getAppliedDiscount(product)
                .map(discount -> applyDiscount(product.getPrice(), discount))
                .orElse(product.getPrice());
    }

    public boolean isDiscounted(Product product) {
        return getAppliedDiscount(product).isPresent();
    }

    public String getDiscountName(Product product) {
        return getAppliedDiscount(product).map(Discount::getName).orElse(null);
    }

    private java.util.Optional<Discount> getAppliedDiscount(Product product) {
        if (product == null || product.getId() == null || product.getPrice() == null) {
            return java.util.Optional.empty();
        }
        LocalDateTime now = LocalDateTime.now();
        List<ProductDiscount> productDiscounts = productDiscountRepository.findByProductId(product.getId());
        return productDiscounts.stream()
                .map(ProductDiscount::getDiscount)
                .filter(java.util.Objects::nonNull)
                .filter(discount -> Boolean.TRUE.equals(discount.getActive()))
                .filter(discount -> discount.getValue() != null)
                .filter(discount -> discount.getStartAt() == null || !discount.getStartAt().isAfter(now))
                // endAt is exclusive: a discount ending at 2026-04-15T17:00 is NOT active at 17:00 sharp.
                .filter(discount -> discount.getEndAt() == null || discount.getEndAt().isAfter(now))
                .min(Comparator.comparing(discount -> applyDiscount(product.getPrice(), discount)));
    }

    private BigDecimal applyDiscount(BigDecimal originalPrice, Discount discount) {
        if (discount.getType() == DiscountType.PERCENTAGE) {
            BigDecimal multiplier = BigDecimal.ONE.subtract(
                    discount.getValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
            );
            return originalPrice.multiply(multiplier).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        }
        return originalPrice.subtract(discount.getValue()).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }
}
