package com.shoestore.service;

import com.shoestore.dto.CategoryDTO;
import com.shoestore.exception.ResourceNotFoundException;
import com.shoestore.mapper.CategoryMapper;
import com.shoestore.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    public List<CategoryDTO> getAllCategories() {
        return categoryMapper.toDTOList(categoryRepository.findAll());
    }

    public CategoryDTO getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .map(categoryMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
    }

    public CategoryDTO getCategoryByName(String name) {
        return categoryRepository.findByName(name)
                .map(categoryMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "name", name));
    }
}
