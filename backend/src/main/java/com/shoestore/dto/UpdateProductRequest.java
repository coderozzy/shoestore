package com.shoestore.dto;

import com.shoestore.enums.Gender;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProductRequest {

    @Size(max = 255, message = "Model name must be less than 255 characters")
    private String modelName;

    private Gender gender;

    @Size(max = 50, message = "Color must be less than 50 characters")
    private String color;

    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private BigDecimal price;

    private Long categoryId;
}
