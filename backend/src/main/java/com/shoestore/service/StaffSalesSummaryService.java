package com.shoestore.service;

import com.shoestore.dto.StaffSalesSummaryDTO;
import com.shoestore.entity.StaffSalesDailySummary;
import com.shoestore.entity.User;
import com.shoestore.event.SaleCreatedEvent;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.repository.StaffSalesDailySummaryRepository;
import com.shoestore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StaffSalesSummaryService {

    private final StaffSalesDailySummaryRepository staffSalesDailySummaryRepository;
    private final UserRepository userRepository;

    @Transactional
    public void applySaleEvent(SaleCreatedEvent event) {
        LocalDate summaryDate = event.getOccurredAt().toLocalDate();
        StaffSalesDailySummary summary = staffSalesDailySummaryRepository
                .findByUserIdAndSummaryDate(event.getUserId(), summaryDate)
                .orElseGet(() -> StaffSalesDailySummary.builder()
                        .user(userRepository.findById(event.getUserId())
                                .orElseThrow(() -> new ResourceNotFoundException("User", "id", event.getUserId())))
                        .summaryDate(summaryDate)
                        .totalQuantity(0)
                        .totalRevenue(BigDecimal.ZERO)
                        .build());

        summary.setTotalQuantity(summary.getTotalQuantity() + event.getQuantity());
        summary.setTotalRevenue(summary.getTotalRevenue().add(event.getTotalAmount()));
        staffSalesDailySummaryRepository.save(summary);
    }

    @Transactional(readOnly = true)
    public List<StaffSalesSummaryDTO> getSummaries(LocalDate startDate, LocalDate endDate) {
        return staffSalesDailySummaryRepository.findBySummaryDateBetweenOrderBySummaryDateDesc(startDate, endDate).stream()
                .map(this::toDTO)
                .toList();
    }

    private StaffSalesSummaryDTO toDTO(StaffSalesDailySummary summary) {
        User user = summary.getUser();
        return StaffSalesSummaryDTO.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .summaryDate(summary.getSummaryDate())
                .totalQuantity(summary.getTotalQuantity())
                .totalRevenue(summary.getTotalRevenue())
                .build();
    }
}
