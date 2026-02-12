package com.shoestore.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_sizes", indexes = {
    @Index(name = "idx_product_sizes_product_id", columnList = "product_id"),
    @Index(name = "idx_product_sizes_stock", columnList = "stock_quantity")
}, uniqueConstraints = {
    @UniqueConstraint(columnNames = {"product_id", "size"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductSize {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal size;

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void decrementStock() {
        decrementStock(1);
    }

    public void decrementStock(int quantity) {
        if (quantity <= 0) {
            throw new IllegalStateException("Quantity must be greater than zero");
        }
        if (stockQuantity >= quantity) {
            stockQuantity -= quantity;
        } else {
            throw new IllegalStateException("Cannot decrement stock below zero");
        }
    }

    public void incrementStock(int quantity) {
        stockQuantity += quantity;
    }

    public boolean isLowStock() {
        return stockQuantity <= 5;
    }
}
