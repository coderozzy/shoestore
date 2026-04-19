package com.shoestore.controller;

import com.shoestore.dto.GenerateProductImageRequest;
import com.shoestore.dto.GenerateProductImageResponse;
import com.shoestore.service.ProductImageGenerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductAiController {

    private final ProductImageGenerationService productImageGenerationService;

    @PostMapping("/generate-image")
    public ResponseEntity<GenerateProductImageResponse> generateImage(
            @Valid @RequestBody GenerateProductImageRequest request) {
        return ResponseEntity.ok(productImageGenerationService.generateImage(request));
    }
}
