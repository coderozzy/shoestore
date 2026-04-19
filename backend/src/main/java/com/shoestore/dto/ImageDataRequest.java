package com.shoestore.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Base64-encoded image plus its MIME type, used by the AI image generation
 * endpoint. Size and MIME are validated here; magic bytes are verified in
 * {@link com.shoestore.service.ProductImageGenerationService} before anything
 * is persisted or sent to Gemini.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageDataRequest {
    @NotBlank(message = "Image data is required")
    // 15 MB base64 string ≈ 11 MB decoded. The service enforces a tighter
    // decoded cap from AiImageProperties#maxBytes.
    @Size(max = 15_000_000, message = "Image data is too large")
    private String base64;

    // Only raster formats we can magic-byte validate. SVG is explicitly
    // excluded so that server-side-stored product images can't execute script
    // when rendered on the storefront (C-5).
    @NotBlank(message = "Image MIME type is required")
    @Pattern(
            regexp = "^image/(png|jpe?g|webp)$",
            message = "Image MIME type must be image/png, image/jpeg, or image/webp"
    )
    private String mimeType;
}
