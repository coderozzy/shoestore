package com.shoestore.controller;

import com.google.zxing.WriterException;
import com.shoestore.dto.CreateProductRequest;
import com.shoestore.dto.ProductDTO;
import com.shoestore.dto.UpdateProductRequest;
import com.shoestore.entity.Product;
import com.shoestore.enums.Gender;
import com.shoestore.service.ProductService;
import com.shoestore.service.QrCodeService;
import com.shoestore.service.ScanHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final QrCodeService qrCodeService;
    private final ScanHistoryService scanHistoryService;

    @GetMapping
    public ResponseEntity<List<ProductDTO>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping("/qr/{qrCode}")
    public ResponseEntity<ProductDTO> getProductByQrCode(@PathVariable UUID qrCode) {
        Product product = productService.getProductEntityByQrCode(qrCode);
        scanHistoryService.recordScan(product, "SCAN");
        return ResponseEntity.ok(productService.getProductByQrCode(qrCode));
    }

    @GetMapping("/gender/{gender}")
    public ResponseEntity<List<ProductDTO>> getProductsByGender(@PathVariable Gender gender) {
        return ResponseEntity.ok(productService.getProductsByGender(gender));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<ProductDTO>> getLowStockProducts() {
        return ResponseEntity.ok(productService.getLowStockProducts());
    }

    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody CreateProductRequest request) {
        ProductDTO product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDTO> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProductRequest request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/sell")
    public ResponseEntity<ProductDTO> sellProduct(
            @PathVariable Long id,
            @RequestParam BigDecimal size) {
        Product product = productService.getProductEntityById(id);
        scanHistoryService.recordScan(product, "SELL");
        return ResponseEntity.ok(productService.sellProduct(id, size));
    }

    @PostMapping("/{id}/sizes")
    public ResponseEntity<ProductDTO> addSize(
            @PathVariable Long id,
            @RequestParam BigDecimal size,
            @RequestParam Integer stockQuantity) {
        return ResponseEntity.ok(productService.addSize(id, size, stockQuantity));
    }

    @PutMapping("/{id}/sizes/{size}")
    public ResponseEntity<ProductDTO> updateSizeStock(
            @PathVariable Long id,
            @PathVariable BigDecimal size,
            @RequestParam Integer stockQuantity) {
        return ResponseEntity.ok(productService.updateSizeStock(id, size, stockQuantity));
    }

    @GetMapping("/{id}/qr-image")
    public ResponseEntity<byte[]> getQrCodeImage(@PathVariable Long id) throws WriterException, IOException {
        ProductDTO product = productService.getProductById(id);
        byte[] qrCode = qrCodeService.generateQrCode(product.getQrCodeValue());
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setContentLength(qrCode.length);
        headers.set("Content-Disposition", "inline; filename=\"qr-" + product.getQrCodeValue() + ".png\"");
        
        return new ResponseEntity<>(qrCode, headers, HttpStatus.OK);
    }

    @GetMapping("/generate-qr")
    public ResponseEntity<byte[]> generateNewQrCode(@RequestParam(required = false) String content) throws WriterException, IOException {
        String qrContent = (content != null && !content.isEmpty()) ? content : UUID.randomUUID().toString();
        byte[] qrCode = qrCodeService.generateQrCode(qrContent, 300, 300);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setContentLength(qrCode.length);
        headers.set("X-QR-Code-Value", qrContent);
        headers.set("Access-Control-Expose-Headers", "X-QR-Code-Value");
        
        return new ResponseEntity<>(qrCode, headers, HttpStatus.OK);
    }
}
