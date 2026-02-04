package com.shoestore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanHistoryDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String username;
    private String action;
    private LocalDateTime scannedAt;
}
