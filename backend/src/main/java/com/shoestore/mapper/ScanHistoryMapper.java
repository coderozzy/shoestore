package com.shoestore.mapper;

import com.shoestore.dto.ScanHistoryDTO;
import com.shoestore.entity.ScanHistory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ScanHistoryMapper {

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.modelName")
    @Mapping(target = "username", source = "user.username")
    ScanHistoryDTO toDTO(ScanHistory scanHistory);

    List<ScanHistoryDTO> toDTOList(List<ScanHistory> scanHistories);
}
