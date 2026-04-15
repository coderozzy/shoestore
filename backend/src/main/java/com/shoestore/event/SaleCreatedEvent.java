package com.shoestore.event;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class SaleCreatedEvent {
    Long saleId;
    Long userId;
    String username;
    Integer quantity;
    BigDecimal totalAmount;
    LocalDateTime occurredAt;
}
