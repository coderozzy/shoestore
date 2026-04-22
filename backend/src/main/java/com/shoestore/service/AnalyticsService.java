package com.shoestore.service;

import com.shoestore.dto.DailyRevenueDTO;
import com.shoestore.dto.SalesStatsDTO;
import com.shoestore.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final StockMovementRepository stockMovementRepository;

    public List<SalesStatsDTO> getSalesStats(LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> results = stockMovementRepository.findSalesStats(startDate, endDate);
        return results.stream()
                .map(result -> {
                    Number salesCountValue = (Number) result[3];
                    long salesCount = salesCountValue == null ? 0L : salesCountValue.longValue();
                    BigDecimal unitPrice = (BigDecimal) result[4];
                    if (unitPrice == null) {
                        unitPrice = BigDecimal.ZERO;
                    }
                    BigDecimal totalRevenue = unitPrice.multiply(BigDecimal.valueOf(salesCount));

                    return SalesStatsDTO.builder()
                            .productId((Long) result[0])
                            .modelName((String) result[1])
                            .color((String) result[2])
                            .salesCount(salesCount)
                            .unitPrice(unitPrice)
                            .totalRevenue(totalRevenue)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<DailyRevenueDTO> getSalesSummary(LocalDateTime startDate, LocalDateTime endDate, String groupBy) {
        String normalized = groupBy == null ? "DAY" : groupBy.trim().toUpperCase(Locale.ROOT);
        List<Object[]> results;
        switch (normalized) {
            case "MONTH":
                results = stockMovementRepository.findMonthlySalesSummary(startDate, endDate);
                break;
            case "YEAR":
                results = stockMovementRepository.findYearlySalesSummary(startDate, endDate);
                break;
            default:
                results = stockMovementRepository.findDailySalesSummary(startDate, endDate);
        }
        return results.stream()
                .map(result -> DailyRevenueDTO.builder()
                        .date(result[0] instanceof LocalDate
                                ? (LocalDate) result[0]
                                : ((java.sql.Date) result[0]).toLocalDate())
                        .totalSales(result[1] == null ? 0L : ((Number) result[1]).longValue())
                        .totalRevenue((BigDecimal) result[2])
                        .build())
                .collect(Collectors.toList());
    }
}
