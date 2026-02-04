package com.shoestore.repository;

import com.shoestore.entity.ScanHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScanHistoryRepository extends JpaRepository<ScanHistory, Long> {

    List<ScanHistory> findByProductIdOrderByScannedAtDesc(Long productId);

    void deleteByProductId(Long productId);

    List<ScanHistory> findByUserIdOrderByScannedAtDesc(Long userId);

    @Query("SELECT sh FROM ScanHistory sh WHERE sh.scannedAt >= :startDate ORDER BY sh.scannedAt DESC")
    List<ScanHistory> findRecentScans(@Param("startDate") LocalDateTime startDate);

    @Query("SELECT sh.product.id, sh.product.modelName, sh.product.color, COUNT(sh), sh.product.price " +
           "FROM ScanHistory sh " +
           "WHERE sh.action = 'SELL' AND sh.scannedAt BETWEEN :startDate AND :endDate " +
           "GROUP BY sh.product.id, sh.product.modelName, sh.product.color, sh.product.price " +
           "ORDER BY COUNT(sh) DESC")
    List<Object[]> findSalesStats(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("SELECT CAST(sh.scannedAt AS LocalDate), COUNT(sh), SUM(sh.product.price) " +
           "FROM ScanHistory sh " +
           "WHERE sh.action = 'SELL' AND sh.scannedAt BETWEEN :startDate AND :endDate " +
           "GROUP BY CAST(sh.scannedAt AS LocalDate) " +
           "ORDER BY CAST(sh.scannedAt AS LocalDate) DESC")
    List<Object[]> findDailyRevenue(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    long countByProductId(Long productId);
}
