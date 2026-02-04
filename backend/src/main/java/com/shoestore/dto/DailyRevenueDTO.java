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
public class DailyRevenueDTO {
    private LocalDate date;
    private Long totalSales;
    private BigDecimal totalRevenue;
}
