package com.shoestore.mapper;

import com.shoestore.dto.StockMovementDTO;
import com.shoestore.entity.StockMovement;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface StockMovementMapper {

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.modelName")
    @Mapping(target = "username", source = "user.username")
    StockMovementDTO toDTO(StockMovement movement);

    List<StockMovementDTO> toDTOList(List<StockMovement> movements);
}

