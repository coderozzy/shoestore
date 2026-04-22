package com.shoestore.controller;

import com.shoestore.dto.CategoryDTO;
import com.shoestore.dto.CreateCategoryRequest;
import com.shoestore.service.AuditLogService;
import com.shoestore.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only mutations for the category catalog. Read traffic still
 * goes through {@link CategoryController} at /api/categories so STAFF
 * (who can scan/sell) can populate dropdowns without ADMIN privileges.
 *
 * The class-level {@code @PreAuthorize} is belt-and-braces: the
 * SecurityConfig also gates /api/admin/** to ADMIN. Either fence alone
 * would be sufficient; both together survive accidental loosening of
 * one of them.
 */
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminCategoryController {

    private final CategoryService categoryService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<CategoryDTO> createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        CategoryDTO created = categoryService.createCategory(request);
        log.info("Admin created category: {} (id={})", created.getName(), created.getId());
        auditLogService.record("CATEGORY_CREATE", "Category", created.getId(), null, created.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        // Capture name before delete so the audit log carries something
        // human-readable; after delete, looking up the id would fail.
        CategoryDTO existing = categoryService.getCategoryById(id);
        categoryService.deleteCategory(id);
        log.info("Admin deleted category: {} (id={})", existing.getName(), id);
        auditLogService.record("CATEGORY_DELETE", "Category", id, existing.getName(), null);
        return ResponseEntity.noContent().build();
    }
}
