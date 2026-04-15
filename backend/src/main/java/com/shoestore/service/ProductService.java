package com.shoestore.service;

import com.shoestore.dto.CreateProductRequest;
import com.shoestore.dto.ProductDTO;
import com.shoestore.dto.UpdateProductRequest;
import com.shoestore.entity.Category;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductSize;
import com.shoestore.enums.Gender;
import com.shoestore.enums.MovementDirection;
import com.shoestore.enums.StockMovementReason;
import com.shoestore.exception.BadRequestException;
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
    private final StockMovementService stockMovementService;
    private final SaleService saleService;

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
        if (request.getSizes() == null || request.getSizes().isEmpty()) {
            throw new BadRequestException("At least one size is required");
        }

        UUID qrCodeValue;
        try {
            qrCodeValue = UUID.fromString(request.getQrCodeValue());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("QR Code Value must be a valid UUID");
        }

        // Create the product first
        Product product = Product.builder()
                .modelName(request.getModelName())
                .gender(request.getGender())
                .color(request.getColor())
                .price(request.getPrice())
                .qrCodeValue(qrCodeValue)
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

        for (CreateProductRequest.SizeStockRequest sizeRequest : request.getSizes()) {
            if (sizeRequest.getStockQuantity() != null && sizeRequest.getStockQuantity() > 0) {
                stockMovementService.recordMovement(
                        savedProduct,
                        sizeRequest.getSize(),
                        sizeRequest.getStockQuantity(),
                        MovementDirection.IN,
                        StockMovementReason.RECEIPT,
                        "Initial stock");
            }
        }
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
    public ProductDTO sellProduct(Long productId, BigDecimal size, int quantity) {
        if (size == null) {
            throw new BadRequestException("Size is required");
        }
        if (quantity <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // Row-level lock the size to prevent concurrent oversell.
        ProductSize productSize = productSizeRepository.findByProductIdAndSizeForUpdate(productId, size)
                .orElseThrow(() -> new ResourceNotFoundException("ProductSize", "size", size));

        if (productSize.getStockQuantity() < quantity) {
            throw new BadRequestException("Insufficient stock for size " + size);
        }

        productSize.decrementStock(quantity);
        productSizeRepository.save(productSize);

        stockMovementService.recordMovement(
                product,
                size,
                quantity,
                MovementDirection.OUT,
                StockMovementReason.SALE,
                null);

        // Record sale BEFORE publishing the stock-changed event so projection listeners
        // see a consistent state. If recordStoreSale fails, the outer @Transactional
        // rolls back every write above (stock decrement, movement, etc.).
        saleService.recordStoreSale(product, size, quantity);

        // Log sale to ScanHistory using the authenticated user.
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        ScanHistory history = ScanHistory.builder()
                .product(product)
                .user(user)
                .action("SELL")
                .build();
        scanHistoryRepository.save(history);

        log.info("Sold product: {} size: {} quantity: {}, remaining stock: {}",
                product.getModelName(), size, quantity, productSize.getStockQuantity());
        return productMapper.toDTO(product);
    }

    @Transactional
    public ProductDTO sellProductByQrCode(UUID qrCodeValue, BigDecimal size, int quantity) {
        Product product = productRepository.findByQrCodeValue(qrCodeValue)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "qrCode", qrCodeValue));
        return sellProduct(product.getId(), size, quantity);
    }

    @Transactional
    public ProductDTO addSize(Long productId, BigDecimal size, Integer stockQuantity) {
        if (size == null) {
            throw new BadRequestException("Size is required");
        }
        if (stockQuantity == null || stockQuantity < 0) {
            throw new BadRequestException("Stock quantity must be 0 or greater");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
        
        // Check if size already exists
        boolean sizeExists = product.getSizes().stream()
                .anyMatch(s -> s.getSize().compareTo(size) == 0);
        
        if (sizeExists) {
            throw new BadRequestException("Size " + size + " already exists for this product");
        }
        
        ProductSize productSize = ProductSize.builder()
                .product(product)
                .size(size)
                .stockQuantity(stockQuantity)
                .build();
        
        product.getSizes().add(productSize);
        Product updatedProduct = productRepository.save(product);

        if (stockQuantity > 0) {
            stockMovementService.recordMovement(
                    product,
                    size,
                    stockQuantity,
                    MovementDirection.IN,
                    StockMovementReason.RECEIPT,
                    "Initial stock for new size");
        }
        
        log.info("Added size {} to product: {} with quantity: {}", size, product.getModelName(), stockQuantity);
        return productMapper.toDTO(updatedProduct);
    }

    @Transactional
    public ProductDTO updateSizeStock(Long productId, BigDecimal size, Integer quantity) {
        if (size == null) {
            throw new BadRequestException("Size is required");
        }
        if (quantity == null || quantity < 0) {
            throw new BadRequestException("Stock quantity must be 0 or greater");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        ProductSize productSize = productSizeRepository.findByProductIdAndSizeForUpdate(productId, size)
                .orElseThrow(() -> new ResourceNotFoundException("ProductSize", "size", size));

        int previousQuantity = productSize.getStockQuantity();
        productSize.setStockQuantity(quantity);
        productSizeRepository.save(productSize);

        int delta = quantity - previousQuantity;
        if (delta != 0) {
            stockMovementService.recordMovement(
                    product,
                    size,
                    Math.abs(delta),
                    delta > 0 ? MovementDirection.IN : MovementDirection.OUT,
                    StockMovementReason.ADJUSTMENT,
                    "Manual stock adjustment");
        }
        
        log.info("Updated stock for product: {} size: {} to: {}", product.getModelName(), size, quantity);
        return productMapper.toDTO(product);
    }

    @Transactional
    public ProductDTO receiveStock(Long productId, BigDecimal size, Integer quantity, String note) {
        if (size == null) {
            throw new BadRequestException("Size is required");
        }
        if (quantity == null || quantity <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        ProductSize productSize = productSizeRepository.findByProductIdAndSizeForUpdate(productId, size)
                .orElseThrow(() -> new ResourceNotFoundException("ProductSize", "size", size));

        productSize.incrementStock(quantity);
        productSizeRepository.save(productSize);

        stockMovementService.recordMovement(
                product,
                size,
                quantity,
                MovementDirection.IN,
                StockMovementReason.RECEIPT,
                note);

        log.info("Received stock for product: {} size: {} quantity: {}", product.getModelName(), size, quantity);
        return productMapper.toDTO(product);
    }

    @Transactional
    public ProductDTO returnStock(Long productId, BigDecimal size, Integer quantity, String note) {
        if (size == null) {
            throw new BadRequestException("Size is required");
        }
        if (quantity == null || quantity <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        ProductSize productSize = productSizeRepository.findByProductIdAndSizeForUpdate(productId, size)
                .orElseThrow(() -> new ResourceNotFoundException("ProductSize", "size", size));

        productSize.incrementStock(quantity);
        productSizeRepository.save(productSize);

        stockMovementService.recordMovement(
                product,
                size,
                quantity,
                MovementDirection.IN,
                StockMovementReason.RETURN,
                note);

        log.info("Returned stock for product: {} size: {} quantity: {}", product.getModelName(), size, quantity);
        return productMapper.toDTO(product);
    }

    @Transactional
    public ProductDTO returnStockByQrCode(UUID qrCodeValue, BigDecimal size, Integer quantity, String note) {
        Product product = productRepository.findByQrCodeValue(qrCodeValue)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "qrCode", qrCodeValue));
        return returnStock(product.getId(), size, quantity, note);
    }

    public Product getProductEntityByQrCode(UUID qrCodeValue) {
        return productRepository.findByQrCodeValue(qrCodeValue)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "qrCode", qrCodeValue));
    }

    /** Expose DTO mapping so callers that already have a {@link Product} don't need a second query. */
    public ProductDTO toDTO(Product product) {
        return productMapper.toDTO(product);
    }
}
