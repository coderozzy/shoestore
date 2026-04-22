package com.shoestore.service;

import com.shoestore.dto.StockMovementDTO;
import com.shoestore.entity.Product;
import com.shoestore.entity.StockMovement;
import com.shoestore.entity.User;
import com.shoestore.enums.MovementDirection;
import com.shoestore.enums.StockMovementReason;
import com.shoestore.enums.Role;
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
        User user = resolveAuthenticatedUser();

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

    @Transactional
    public StockMovementDTO recordSystemMovement(Product product,
                                                 BigDecimal size,
                                                 int quantity,
                                                 MovementDirection direction,
                                                 StockMovementReason reason,
                                                 String note) {
        User user = resolveSystemUser();
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
        return stockMovementMapper.toDTO(saved);
    }

    public List<StockMovementDTO> getRecentMovements(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        return stockMovementMapper.toDTOList(stockMovementRepository.findRecentMovements(startDate));
    }

    private User resolveAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }

    private User resolveSystemUser() {
        return userRepository.findFirstByRole(Role.ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("User", "role", "ADMIN"));
    }
}

