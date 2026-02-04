package com.shoestore.repository;

import com.shoestore.entity.ProductSize;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductSizeRepository extends JpaRepository<ProductSize, Long> {

    List<ProductSize> findByProductId(Long productId);

    Optional<ProductSize> findByProductIdAndSize(Long productId, BigDecimal size);

    @Query("SELECT ps FROM ProductSize ps WHERE ps.stockQuantity <= :threshold")
    List<ProductSize> findLowStockSizes(@Param("threshold") int threshold);

    @Query("SELECT ps FROM ProductSize ps WHERE ps.product.id = :productId AND ps.stockQuantity > 0")
    List<ProductSize> findAvailableSizesByProductId(@Param("productId") Long productId);

    void deleteByProductId(Long productId);
}
