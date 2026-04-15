package com.shoestore.controller;

import com.shoestore.dto.CreateDiscountRequest;
import com.shoestore.dto.DiscountDTO;
import com.shoestore.service.DiscountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/discounts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DiscountController {

    private final DiscountService discountService;

    @GetMapping
    public ResponseEntity<List<DiscountDTO>> getDiscounts() {
        return ResponseEntity.ok(discountService.getAllDiscounts());
    }

    @PostMapping
    public ResponseEntity<DiscountDTO> createDiscount(@Valid @RequestBody CreateDiscountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(discountService.createDiscount(request));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<DiscountDTO> toggleDiscount(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(discountService.toggleDiscount(id, active));
    }
}
