package com.shoestore.service;

import com.shoestore.dto.DailyRevenueDTO;
import com.shoestore.dto.SalesStatsDTO;
import com.shoestore.repository.ScanHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final ScanHistoryRepository scanHistoryRepository;

    public List<SalesStatsDTO> getSalesStats(LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> results = scanHistoryRepository.findSalesStats(startDate, endDate);
        return results.stream()
                .map(result -> {
                    Long salesCount = (Long) result[3];
                    BigDecimal unitPrice = (BigDecimal) result[4];
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

    public List<DailyRevenueDTO> getDailyRevenue(LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> results = scanHistoryRepository.findDailyRevenue(startDate, endDate);
        return results.stream()
                .map(result -> DailyRevenueDTO.builder()
                        .date((LocalDate) result[0])
                        .totalSales((Long) result[1])
                        .totalRevenue((BigDecimal) result[2])
                        .build())
                .collect(Collectors.toList());
    }
}
