package com.shoestore.repository;

import com.shoestore.entity.StaffSalesDailySummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StaffSalesDailySummaryRepository extends JpaRepository<StaffSalesDailySummary, Long> {
    Optional<StaffSalesDailySummary> findByUserIdAndSummaryDate(Long userId, LocalDate summaryDate);
    List<StaffSalesDailySummary> findBySummaryDateBetweenOrderBySummaryDateDesc(LocalDate startDate, LocalDate endDate);
}
