package com.shoestore.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "scan_history", indexes = {
    @Index(name = "idx_scan_history_product", columnList = "product_id"),
    @Index(name = "idx_scan_history_user", columnList = "user_id"),
    @Index(name = "idx_scan_history_date", columnList = "scanned_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String action = "SCAN";

    @Column(name = "scanned_at", nullable = false, updatable = false)
    private LocalDateTime scannedAt;

    @PrePersist
    protected void onCreate() {
        scannedAt = LocalDateTime.now();
    }
}
