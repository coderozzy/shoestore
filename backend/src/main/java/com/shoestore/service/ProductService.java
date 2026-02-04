package com.shoestore.service;

import com.shoestore.dto.CreateProductRequest;
import com.shoestore.dto.ProductDTO;
import com.shoestore.dto.UpdateProductRequest;
import com.shoestore.entity.Category;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductSize;
import com.shoestore.enums.Gender;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.mapper.ProductMapper;
import com.shoestore.repository.CategoryRepository;
import com.shoestore.repository.ProductRepository;
import com.shoestore.repository.ProductSizeRepository;
import com.shoestore.repository.ScanHistoryRepository;
import com.shoestore.repository.UserRepository;
import com.shoestore.entity.ScanHistory;
import com.shoestore.entity.User;
import org.springframework.security.core.context.SecurityContextHolder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductSizeRepository productSizeRepository;
    private final CategoryRepository categoryRepository;
    private final ScanHistoryRepository scanHistoryRepository;
    private final UserRepository userRepository;
    private final ProductMapper productMapper;

    public List<ProductDTO> getAllProducts() {
        return productMapper.toDTOList(productRepository.findAll());
    }

    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return productMapper.toDTO(product);
    }

    public ProductDTO getProductByQrCode(UUID qrCodeValue) {
        Product product = productRepository.findByQrCodeValue(qrCodeValue)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "qrCode", qrCodeValue));
        log.info("Product found by QR code: {} - {}", qrCodeValue, product.getModelName());
        return productMapper.toDTO(product);
    }

    public List<ProductDTO> getProductsByGender(Gender gender) {
        return productMapper.toDTOList(productRepository.findByGender(gender));
    }

    public List<ProductDTO> getLowStockProducts() {
        return productMapper.toDTOList(productRepository.findLowStockProducts(5));
    }

    @Transactional
    public ProductDTO createProduct(CreateProductRequest request) {
        // Create the product first
        Product product = Product.builder()
                .modelName(request.getModelName())
                .gender(request.getGender())
                .color(request.getColor())
                .price(request.getPrice())
                .qrCodeValue(UUID.fromString(request.getQrCodeValue()))
                .build();
        
        // Set category
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));
            product.setCategory(category);
        } else {
            String categoryName = request.getGender() == Gender.MALE ? "MEN" : "WOMEN";
            categoryRepository.findByName(categoryName).ifPresent(product::setCategory);
        }
        
        // Save product first to get ID
        Product savedProduct = productRepository.save(product);
        
        // Add sizes
        for (CreateProductRequest.SizeStockRequest sizeRequest : request.getSizes()) {
            ProductSize productSize = ProductSize.builder()
                    .product(savedProduct)
                    .size(sizeRequest.getSize())
                    .stockQuantity(sizeRequest.getStockQuantity())
                    .build();
            savedProduct.getSizes().add(productSize);
        }
        
        // Save with sizes
        savedProduct = productRepository.save(savedProduct);
        log.info("Created product: {} with QR code: {} and {} sizes", 
                savedProduct.getModelName(), savedProduct.getQrCodeValue(), savedProduct.getSizes().size());
        return productMapper.toDTO(savedProduct);
    }

    @Transactional
    public ProductDTO updateProduct(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        
        productMapper.updateEntity(product, request);
        
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));
            product.setCategory(category);
        }
        
        Product updatedProduct = productRepository.save(product);
        log.info("Updated product: {}", updatedProduct.getModelName());
        return productMapper.toDTO(updatedProduct);
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product", "id", id);
        }
        scanHistoryRepository.deleteByProductId(id);
        productRepository.deleteById(id);
        log.info("Deleted product with id: {}", id);
    }

    @Transactional
    public ProductDTO sellProduct(Long productId, BigDecimal size) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
        
        ProductSize productSize = productSizeRepository.findByProductIdAndSize(productId, size)
                .orElseThrow(() -> new ResourceNotFoundException("ProductSize", "size", size));
        
        productSize.decrementStock();
        productSizeRepository.save(productSize);
        
        // Log sale to ScanHistory
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        ScanHistory history = ScanHistory.builder()
                .product(product)
                .user(user)
                .action("SELL")
                .build();
        scanHistoryRepository.save(history);

        log.info("Sold product: {} size: {}, remaining stock: {}", 
                product.getModelName(), size, productSize.getStockQuantity());
        return productMapper.toDTO(product);
    }

    @Transactional
    public ProductDTO addSize(Long productId, BigDecimal size, Integer stockQuantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
        
        // Check if size already exists
        boolean sizeExists = product.getSizes().stream()
                .anyMatch(s -> s.getSize().compareTo(size) == 0);
        
        if (sizeExists) {
            throw new IllegalArgumentException("Size " + size + " already exists for this product");
        }
        
        ProductSize productSize = ProductSize.builder()
                .product(product)
                .size(size)
                .stockQuantity(stockQuantity)
                .build();
        
        product.getSizes().add(productSize);
        Product updatedProduct = productRepository.save(product);
        
        log.info("Added size {} to product: {} with quantity: {}", size, product.getModelName(), stockQuantity);
        return productMapper.toDTO(updatedProduct);
    }

    @Transactional
    public ProductDTO updateSizeStock(Long productId, BigDecimal size, Integer quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
        
        ProductSize productSize = productSizeRepository.findByProductIdAndSize(productId, size)
                .orElseThrow(() -> new ResourceNotFoundException("ProductSize", "size", size));
        
        productSize.setStockQuantity(quantity);
        productSizeRepository.save(productSize);
        
        log.info("Updated stock for product: {} size: {} to: {}", product.getModelName(), size, quantity);
        return productMapper.toDTO(product);
    }

    public Product getProductEntityById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
    }

    public Product getProductEntityByQrCode(UUID qrCodeValue) {
        return productRepository.findByQrCodeValue(qrCodeValue)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "qrCode", qrCodeValue));
    }
}
