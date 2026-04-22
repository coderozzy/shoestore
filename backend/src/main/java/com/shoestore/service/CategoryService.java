package com.shoestore.service;

import com.shoestore.dto.CategoryDTO;
import com.shoestore.dto.CreateCategoryRequest;
import com.shoestore.entity.Category;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.mapper.CategoryMapper;
import com.shoestore.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    public List<CategoryDTO> getAllCategories() {
        return categoryMapper.toDTOList(categoryRepository.findAll());
    }

    /**
     * Used by AdminCategoryController.deleteCategory to capture the name
     * before delete so the audit log gets something human-readable.
     */
    public CategoryDTO getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .map(categoryMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
    }

    /**
     * Create a new shoe-style category. Names are normalised to a single
     * canonical form (trimmed, internal whitespace collapsed) so that
     * "Loafers", " loafers " and "Loafers  " can't all coexist.
     * Uniqueness is enforced both at the application layer (case-insensitive
     * lookup) and by the underlying UNIQUE constraint on categories.name —
     * the latter is the authoritative defence against a race between two
     * concurrent admin requests.
     */
    @Transactional
    public CategoryDTO createCategory(CreateCategoryRequest request) {
        String normalised = normaliseName(request.getName());
        // GlobalExceptionHandler maps IllegalStateException -> 409 Conflict
        // with the original message preserved, which is the project's
        // established convention for "valid request, wrong state" failures.
        categoryRepository.findByName(normalised).ifPresent(existing -> {
            throw new IllegalStateException("Category with this name already exists");
        });

        Category saved = categoryRepository.save(Category.builder().name(normalised).build());
        return categoryMapper.toDTO(saved);
    }

    /**
     * Delete a category. Refuses with 409 Conflict if any product still
     * references it. Without this guard the delete would either fail at
     * the FK level (producing an opaque 500) or — if cascading were ever
     * enabled — silently wipe products. Forcing the admin to first
     * reassign or delete the product is the safer default.
     */
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));

        int productCount = category.getProducts() == null ? 0 : category.getProducts().size();
        if (productCount > 0) {
            throw new IllegalStateException(
                    "Category still has " + productCount + " product(s); reassign them first");
        }
        categoryRepository.delete(category);
    }

    private String normaliseName(String raw) {
        return raw.trim().replaceAll("\\s+", " ");
    }
}
