package com.shoestore.controller;

import com.shoestore.dto.StockMovementDTO;
import com.shoestore.service.StockMovementService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/stock-movements")
@RequiredArgsConstructor
public class StockMovementController {

    private final StockMovementService stockMovementService;

    @GetMapping("/recent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<StockMovementDTO>> getRecentMovements(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(stockMovementService.getRecentMovements(days));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<StockMovementDTO>> getMovements(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        if (productId != null) {
            return ResponseEntity.ok(stockMovementService.getMovementsByProduct(productId));
        }
        if (startDate != null && endDate != null) {
            return ResponseEntity.ok(stockMovementService.getMovementsBetween(startDate, endDate));
        }
        return ResponseEntity.ok(stockMovementService.getRecentMovements(7));
    }
}

