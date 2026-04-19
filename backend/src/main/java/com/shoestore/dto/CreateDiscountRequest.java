package com.shoestore.dto;

import com.shoestore.enums.DiscountType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDiscountRequest {
    @NotBlank(message = "Discount name is required")
    @Size(max = 120, message = "Discount name is too long")
    private String name;

    @NotNull(message = "Discount type is required")
    private DiscountType type;

    // M-7: upper bound on value avoids a FIXED discount of 10^18 slipping
    // through. Percentage discounts are also clamped to 100% elsewhere in the
    // pricing service, but an explicit cap is cheaper than trusting that.
    @NotNull(message = "Discount value is required")
    @DecimalMin(value = "0.01", message = "Discount value must be greater than 0")
    @DecimalMax(value = "100000.00", message = "Discount value unreasonably high")
    private BigDecimal value;

    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @NotEmpty(message = "At least one product is required")
    @Size(max = 500, message = "Too many products in one discount")
    private List<Long> productIds;
}
