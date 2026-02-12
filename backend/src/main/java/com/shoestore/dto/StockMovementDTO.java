package com.shoestore.dto;

import com.shoestore.enums.MovementDirection;
import com.shoestore.enums.StockMovementReason;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovementDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String username;
    private BigDecimal size;
    private Integer quantity;
    private MovementDirection direction;
    private StockMovementReason reason;
    private String note;
    private LocalDateTime occurredAt;
}

