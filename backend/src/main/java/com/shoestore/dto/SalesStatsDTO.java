package com.shoestore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesStatsDTO {
    private Long productId;
    private String modelName;
    private String color;
    private Long salesCount;
    private BigDecimal unitPrice;
    private BigDecimal totalRevenue;
}
