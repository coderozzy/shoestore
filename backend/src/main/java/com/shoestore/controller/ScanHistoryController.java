package com.shoestore.controller;

import com.shoestore.dto.ScanHistoryDTO;
import com.shoestore.service.ScanHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scan-history")
@RequiredArgsConstructor
public class ScanHistoryController {

    private final ScanHistoryService scanHistoryService;

    @GetMapping("/recent")
    public ResponseEntity<List<ScanHistoryDTO>> getRecentScans(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(scanHistoryService.getRecentScans(days));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ScanHistoryDTO>> getScansByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(scanHistoryService.getScansByProduct(productId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ScanHistoryDTO>> getScansByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(scanHistoryService.getScansByUser(userId));
    }

    @GetMapping("/product/{productId}/count")
    public ResponseEntity<Long> getScanCountForProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(scanHistoryService.getScanCountForProduct(productId));
    }
}
