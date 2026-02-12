package com.shoestore.service;

import com.shoestore.dto.StockMovementDTO;
import com.shoestore.entity.Product;
import com.shoestore.entity.StockMovement;
import com.shoestore.entity.User;
import com.shoestore.enums.MovementDirection;
import com.shoestore.enums.StockMovementReason;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.mapper.StockMovementMapper;
import com.shoestore.repository.StockMovementRepository;
import com.shoestore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockMovementService {

    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final StockMovementMapper stockMovementMapper;

    @Transactional
    public StockMovementDTO recordMovement(Product product,
                                           BigDecimal size,
                                           int quantity,
                                           MovementDirection direction,
                                           StockMovementReason reason,
                                           String note) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        StockMovement movement = StockMovement.builder()
                .product(product)
                .user(user)
                .size(size)
                .quantity(quantity)
                .direction(direction)
                .reason(reason)
                .note(note)
                .build();

        StockMovement saved = stockMovementRepository.save(movement);
        log.info("Recorded stock movement: {} {} {} (reason: {}) for product {}",
                direction, quantity, size, reason, product.getModelName());
        return stockMovementMapper.toDTO(saved);
    }

    public List<StockMovementDTO> getRecentMovements(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        return stockMovementMapper.toDTOList(stockMovementRepository.findRecentMovements(startDate));
    }

    public List<StockMovementDTO> getMovementsByProduct(Long productId) {
        return stockMovementMapper.toDTOList(
                stockMovementRepository.findByProductIdOrderByOccurredAtDesc(productId));
    }

    public List<StockMovementDTO> getMovementsBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return stockMovementMapper.toDTOList(
                stockMovementRepository.findMovementsBetween(startDate, endDate));
    }
}

