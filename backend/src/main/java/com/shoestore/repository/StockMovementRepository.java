package com.shoestore.repository;

import com.shoestore.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByProductIdOrderByOccurredAtDesc(Long productId);

    @Query("SELECT sm FROM StockMovement sm WHERE sm.occurredAt >= :startDate ORDER BY sm.occurredAt DESC")
    List<StockMovement> findRecentMovements(@Param("startDate") LocalDateTime startDate);

    @Query("SELECT sm FROM StockMovement sm WHERE sm.occurredAt BETWEEN :startDate AND :endDate ORDER BY sm.occurredAt DESC")
    List<StockMovement> findMovementsBetween(@Param("startDate") LocalDateTime startDate,
                                             @Param("endDate") LocalDateTime endDate);

    @Query(value = "SELECT sm.product_id, p.model_name, p.color, SUM(sm.quantity) AS sales_count, p.price " +
                   "FROM stock_movements sm " +
                   "JOIN products p ON p.id = sm.product_id " +
                   "WHERE sm.reason = 'SALE' " +
                   "AND sm.occurred_at BETWEEN :startDate AND :endDate " +
                   "GROUP BY sm.product_id, p.model_name, p.color, p.price " +
                   "ORDER BY SUM(sm.quantity) DESC",
            nativeQuery = true)
    List<Object[]> findSalesStats(@Param("startDate") LocalDateTime startDate,
                                  @Param("endDate") LocalDateTime endDate);

    @Query("SELECT sm FROM StockMovement sm " +
           "JOIN FETCH sm.product " +
           "JOIN FETCH sm.user " +
           "WHERE sm.reason = com.shoestore.enums.StockMovementReason.SALE " +
           "AND sm.occurredAt BETWEEN :startDate AND :endDate " +
           "ORDER BY sm.occurredAt DESC")
    List<StockMovement> findSalesRecords(@Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);

    @Query(value = "SELECT CAST(date_trunc('day', (sm.occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul') AS date) AS period, " +
                   "SUM(sm.quantity) AS total_sales, " +
                   "SUM(sm.quantity * p.price) AS total_revenue " +
                   "FROM stock_movements sm " +
                   "JOIN products p ON p.id = sm.product_id " +
                   "WHERE sm.reason = 'SALE' AND sm.occurred_at BETWEEN :startDate AND :endDate " +
                   "GROUP BY period ORDER BY period DESC",
           nativeQuery = true)
    List<Object[]> findDailySalesSummary(@Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);

    @Query(value = "SELECT CAST(date_trunc('month', (sm.occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul') AS date) AS period, " +
                   "SUM(sm.quantity) AS total_sales, " +
                   "SUM(sm.quantity * p.price) AS total_revenue " +
                   "FROM stock_movements sm " +
                   "JOIN products p ON p.id = sm.product_id " +
                   "WHERE sm.reason = 'SALE' AND sm.occurred_at BETWEEN :startDate AND :endDate " +
                   "GROUP BY period ORDER BY period DESC",
           nativeQuery = true)
    List<Object[]> findMonthlySalesSummary(@Param("startDate") LocalDateTime startDate,
                                           @Param("endDate") LocalDateTime endDate);

    @Query(value = "SELECT CAST(date_trunc('year', (sm.occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul') AS date) AS period, " +
                   "SUM(sm.quantity) AS total_sales, " +
                   "SUM(sm.quantity * p.price) AS total_revenue " +
                   "FROM stock_movements sm " +
                   "JOIN products p ON p.id = sm.product_id " +
                   "WHERE sm.reason = 'SALE' AND sm.occurred_at BETWEEN :startDate AND :endDate " +
                   "GROUP BY period ORDER BY period DESC",
           nativeQuery = true)
    List<Object[]> findYearlySalesSummary(@Param("startDate") LocalDateTime startDate,
                                          @Param("endDate") LocalDateTime endDate);
}

