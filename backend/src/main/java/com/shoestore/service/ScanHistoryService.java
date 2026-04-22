package com.shoestore.service;

import com.shoestore.entity.Product;
import com.shoestore.entity.ScanHistory;
import com.shoestore.entity.User;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.repository.ScanHistoryRepository;
import com.shoestore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Records that a staff user scanned a product. Today the only consumer is
 * the staff QR-scan endpoint; the read-side endpoints (recent scans, scans
 * by product/user, etc.) were never wired into any client and have been
 * removed. The table itself is still useful for forensic/audit lookups via
 * direct SQL even if it has no HTTP surface.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScanHistoryService {

    private final ScanHistoryRepository scanHistoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public void recordScan(Product product, String action) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        ScanHistory scanHistory = ScanHistory.builder()
                .product(product)
                .user(user)
                .action(action)
                .build();

        scanHistoryRepository.save(scanHistory);
        log.info("Recorded scan: {} scanned {} (action: {})", username, product.getModelName(), action);
    }
}
