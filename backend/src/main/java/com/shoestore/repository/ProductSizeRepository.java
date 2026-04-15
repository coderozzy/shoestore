package com.shoestore.repository;

import com.shoestore.entity.ProductSize;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface ProductSizeRepository extends JpaRepository<ProductSize, Long> {

    /**
     * Pessimistic write lock used in concurrent stock mutations
     * (sell / receive / return / online order item) to prevent oversell.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ps FROM ProductSize ps WHERE ps.product.id = :productId AND ps.size = :size")
    Optional<ProductSize> findByProductIdAndSizeForUpdate(@Param("productId") Long productId,
                                                          @Param("size") BigDecimal size);
}
