package com.shoestore.dto;

import com.shoestore.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDTO {
    private Long id;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String notes;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;

    private String shippingLine1;
    private String shippingLine2;
    private String shippingCity;
    private String shippingPostalCode;
    private String shippingCountry;

    private String stripePaymentIntentId;
    private String stripePaymentStatus;
    private LocalDateTime paidAt;

    private List<OrderItemDTO> items;
}
