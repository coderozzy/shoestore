package com.shoestore.repository;

import com.shoestore.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByQrCodeValue(UUID qrCodeValue);

    @Query("SELECT p FROM Product p JOIN p.sizes s GROUP BY p HAVING SUM(s.stockQuantity) <= :threshold")
    List<Product> findLowStockProducts(@Param("threshold") int threshold);

    @Query("""
            SELECT p FROM Product p
            WHERE p.publishedToStore = true
            ORDER BY
                CASE WHEN p.storeDisplayOrder IS NULL THEN 1 ELSE 0 END,
                p.storeDisplayOrder ASC,
                p.createdAt DESC
            """)
    List<Product> findPublishedForStorefront();

    @Query("SELECT COALESCE(MAX(p.storeDisplayOrder), 0) FROM Product p")
    Integer findMaxStoreDisplayOrder();
}
