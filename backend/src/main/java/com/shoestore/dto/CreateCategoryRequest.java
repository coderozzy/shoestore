package com.shoestore.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCategoryRequest {

    // Mirror the underlying column constraint (categories.name VARCHAR(50)
    // UNIQUE NOT NULL). Pattern is intentionally restrictive — category
    // names show up unescaped in storefront chips/headings, so refusing
    // anything that could carry markup is cheaper than escaping
    // everywhere downstream.
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    @Pattern(
            regexp = "^[A-Za-z0-9 &/_-]+$",
            message = "Name may contain letters, digits, spaces, and & / _ -"
    )
    private String name;
}
