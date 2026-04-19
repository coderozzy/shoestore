package com.shoestore.controller;

import com.shoestore.dto.ScanHistoryDTO;
import com.shoestore.service.ScanHistoryService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scan-history")
@RequiredArgsConstructor
@Validated
public class ScanHistoryController {

    private final ScanHistoryService scanHistoryService;

    @GetMapping("/recent")
    public ResponseEntity<List<ScanHistoryDTO>> getRecentScans(
            @RequestParam(defaultValue = "7")
            @Min(value = 1, message = "days must be at least 1")
            @Max(value = 365, message = "days must be at most 365") int days) {
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
