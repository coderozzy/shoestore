package com.shoestore.repository;

import com.shoestore.entity.CustomerOrder;
import com.shoestore.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    List<CustomerOrder> findAllByOrderByCreatedAtDesc();

    Optional<CustomerOrder> findByStripePaymentIntentId(String stripePaymentIntentId);

    List<CustomerOrder> findByStatusAndCreatedAtBefore(OrderStatus status, LocalDateTime cutoff);

    Optional<CustomerOrder> findByOrderNumber(String orderNumber);

    boolean existsByOrderNumber(String orderNumber);
}
