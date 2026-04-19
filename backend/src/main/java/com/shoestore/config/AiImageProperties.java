package com.shoestore.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ai.image")
@Data
public class AiImageProperties {
    /**
     * Gemini API key used server-side only so it never appears in the frontend bundle.
     */
    private String apiKey;

    /**
     * Gemini model name for image generation.
     */
    private String model = "gemini-2.5-flash-image";

    /**
     * Hard cap on the base64 payload size the admin panel can send. Defends
     * against memory DoS via oversized data URLs.
     */
    private long maxBytes = 10_000_000L;
}
