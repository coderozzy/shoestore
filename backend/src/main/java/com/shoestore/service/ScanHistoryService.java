package com.shoestore.service;

import com.shoestore.dto.ScanHistoryDTO;
import com.shoestore.entity.Product;
import com.shoestore.entity.ScanHistory;
import com.shoestore.entity.User;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.mapper.ScanHistoryMapper;
import com.shoestore.repository.ScanHistoryRepository;
import com.shoestore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanHistoryService {

    private final ScanHistoryRepository scanHistoryRepository;
    private final UserRepository userRepository;
    private final ScanHistoryMapper scanHistoryMapper;

    @Transactional
    public ScanHistoryDTO recordScan(Product product, String action) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        ScanHistory scanHistory = ScanHistory.builder()
                .product(product)
                .user(user)
                .action(action)
                .build();

        ScanHistory saved = scanHistoryRepository.save(scanHistory);
        log.info("Recorded scan: {} scanned {} (action: {})", username, product.getModelName(), action);
        return scanHistoryMapper.toDTO(saved);
    }

    public List<ScanHistoryDTO> getRecentScans(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        return scanHistoryMapper.toDTOList(scanHistoryRepository.findRecentScans(startDate));
    }

    public List<ScanHistoryDTO> getScansByProduct(Long productId) {
        return scanHistoryMapper.toDTOList(
                scanHistoryRepository.findByProductIdOrderByScannedAtDesc(productId));
    }

    public List<ScanHistoryDTO> getScansByUser(Long userId) {
        return scanHistoryMapper.toDTOList(
                scanHistoryRepository.findByUserIdOrderByScannedAtDesc(userId));
    }

    public long getScanCountForProduct(Long productId) {
        return scanHistoryRepository.countByProductId(productId);
    }
}
