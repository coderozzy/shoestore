package com.shoestore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffSalesSummaryDTO {
    private Long userId;
    private String username;
    private LocalDate summaryDate;
    private Integer totalQuantity;
    private BigDecimal totalRevenue;
}
