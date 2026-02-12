package com.shoestore.repository;

import com.shoestore.entity.Product;
import com.shoestore.enums.Gender;
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

    List<Product> findByGender(Gender gender);

    @Query("SELECT p FROM Product p JOIN p.sizes s GROUP BY p HAVING SUM(s.stockQuantity) <= :threshold")
    List<Product> findLowStockProducts(@Param("threshold") int threshold);

    @Query("SELECT p FROM Product p WHERE p.category.name = :categoryName")
    List<Product> findByCategoryName(@Param("categoryName") String categoryName);

    boolean existsByQrCodeValue(UUID qrCodeValue);
}
