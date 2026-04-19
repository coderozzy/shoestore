package com.shoestore.dto;

import com.shoestore.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Narrower view of an order, safe to hand back to an anonymous storefront
 * visitor who has proven ownership with a lookup token (C-4). Deliberately
 * omits customer name/email/phone/shipping address and the full Stripe
 * PaymentIntent id.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorefrontOrderDTO {
    private Long id;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private List<OrderItemDTO> items;
}
