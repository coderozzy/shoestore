package com.shoestore.mapper;

import com.shoestore.dto.CategoryDTO;
import com.shoestore.entity.Category;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    @Mapping(target = "productCount", expression = "java(category.getProducts() != null ? category.getProducts().size() : 0)")
    CategoryDTO toDTO(Category category);

    List<CategoryDTO> toDTOList(List<Category> categories);
}
