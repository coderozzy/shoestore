package com.shoestore.service;

import com.shoestore.dto.CreateDiscountRequest;
import com.shoestore.dto.DiscountDTO;
import com.shoestore.entity.Discount;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductDiscount;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.repository.DiscountRepository;
import com.shoestore.repository.ProductDiscountRepository;
import com.shoestore.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DiscountService {

    private final DiscountRepository discountRepository;
    private final ProductRepository productRepository;
    private final ProductDiscountRepository productDiscountRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<DiscountDTO> getAllDiscounts() {
        return discountRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public DiscountDTO createDiscount(CreateDiscountRequest request) {
        if (request.getStartAt() != null && request.getEndAt() != null
                && request.getEndAt().isBefore(request.getStartAt())) {
            throw new com.shoestore.exception.BadRequestException("Discount endAt cannot be before startAt");
        }
        Discount discount = Discount.builder()
                .name(request.getName())
                .type(request.getType())
                .value(request.getValue())
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .active(true)
                .build();
        Discount savedDiscount = discountRepository.save(discount);
        auditLogService.record("DISCOUNT_CREATE", "Discount", savedDiscount.getId(),
                null, savedDiscount.getName() + "=" + savedDiscount.getValue());

        List<Long> productIds = request.getProductIds() == null ? List.of() : request.getProductIds();
        for (Long productId : productIds) {
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
            productDiscountRepository.save(ProductDiscount.builder()
                    .product(product)
                    .discount(savedDiscount)
                    .build());
        }
        return DiscountDTO.builder()
                .id(savedDiscount.getId())
                .name(savedDiscount.getName())
                .type(savedDiscount.getType())
                .value(savedDiscount.getValue())
                .active(savedDiscount.getActive())
                .startAt(savedDiscount.getStartAt())
                .endAt(savedDiscount.getEndAt())
                .productIds(productIds)
                .build();
    }

    @Transactional
    public DiscountDTO toggleDiscount(Long id, boolean active) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discount", "id", id));
        boolean previous = Boolean.TRUE.equals(discount.getActive());
        discount.setActive(active);
        DiscountDTO dto = toDTO(discountRepository.save(discount));
        auditLogService.record(
                active ? "DISCOUNT_ENABLE" : "DISCOUNT_DISABLE",
                "Discount",
                id,
                String.valueOf(previous),
                String.valueOf(active));
        return dto;
    }

    private DiscountDTO toDTO(Discount discount) {
        return DiscountDTO.builder()
                .id(discount.getId())
                .name(discount.getName())
                .type(discount.getType())
                .value(discount.getValue())
                .active(discount.getActive())
                .startAt(discount.getStartAt())
                .endAt(discount.getEndAt())
                .productIds(discount.getProductDiscounts() == null
                        ? List.of()
                        : discount.getProductDiscounts().stream()
                                .filter(pd -> pd.getProduct() != null)
                                .map(pd -> pd.getProduct().getId())
                                .toList())
                .build();
    }
}
