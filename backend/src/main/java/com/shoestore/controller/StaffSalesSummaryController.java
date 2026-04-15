package com.shoestore.controller;

import com.shoestore.dto.StaffSalesSummaryDTO;
import com.shoestore.service.StaffSalesSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/staff-sales")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class StaffSalesSummaryController {

    private final StaffSalesSummaryService staffSalesSummaryService;

    @GetMapping
    public ResponseEntity<List<StaffSalesSummaryDTO>> getSummaries(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(staffSalesSummaryService.getSummaries(startDate, endDate));
    }
}
