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

    long countByProductId(Long productId);
}
