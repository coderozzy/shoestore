package com.shoestore.mapper;

import com.shoestore.dto.ProductDTO;
import com.shoestore.dto.ProductSizeDTO;
import com.shoestore.entity.Product;
import com.shoestore.entity.ProductSize;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ProductMapper {

    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "lowStock", expression = "java(product.isLowStock())")
    @Mapping(target = "totalStock", expression = "java(product.getTotalStock())")
    @Mapping(target = "sizes", source = "sizes")
    ProductDTO toDTO(Product product);

    List<ProductDTO> toDTOList(List<Product> products);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "size", source = "size")
    @Mapping(target = "stockQuantity", source = "stockQuantity")
    ProductSizeDTO toSizeDTO(ProductSize productSize);

    List<ProductSizeDTO> toSizeDTOList(List<ProductSize> sizes);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "qrCodeValue", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "sizes", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(@MappingTarget Product product, com.shoestore.dto.UpdateProductRequest request);
}
