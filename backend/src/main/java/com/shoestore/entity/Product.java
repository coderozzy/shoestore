package com.shoestore.entity;

import com.shoestore.enums.Gender;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "products", indexes = {
    @Index(name = "idx_products_qr_code", columnList = "qr_code_value"),
    @Index(name = "idx_products_gender", columnList = "gender")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name", nullable = false)
    private String modelName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Gender gender;

    @Column(nullable = false, length = 50)
    private String color;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "qr_code_value", nullable = false, unique = true, updatable = false)
    @Builder.Default
    private UUID qrCodeValue = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("size ASC")
    @Builder.Default
    private List<ProductSize> sizes = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (qrCodeValue == null) {
            qrCodeValue = UUID.randomUUID();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public int getTotalStock() {
        return sizes.stream()
                .mapToInt(ProductSize::getStockQuantity)
                .sum();
    }

    public boolean isLowStock() {
        return getTotalStock() <= 5;
    }

    public void addSize(ProductSize productSize) {
        sizes.add(productSize);
        productSize.setProduct(this);
    }

    public void removeSize(ProductSize productSize) {
        sizes.remove(productSize);
        productSize.setProduct(null);
    }
}
