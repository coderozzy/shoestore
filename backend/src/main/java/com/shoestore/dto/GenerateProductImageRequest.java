package com.shoestore.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateProductImageRequest {

    @NotBlank(message = "Generation mode is required")
    private String mode;

    @Builder.Default
    private String city = "Istanbul";

    @Builder.Default
    private String timeOfDay = "day";

    @Builder.Default
    private String focusArea = "waist-down";

    @NotNull(message = "Shoe image is required")
    @Valid
    private ImageDataRequest shoeImage;

    @Valid
    private ImageDataRequest backgroundImage;
}
