package com.shoestore.dto;

import com.shoestore.enums.DiscountType;
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
public class DiscountDTO {
    private Long id;
    private String name;
    private DiscountType type;
    private BigDecimal value;
    private Boolean active;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private List<Long> productIds;
}
