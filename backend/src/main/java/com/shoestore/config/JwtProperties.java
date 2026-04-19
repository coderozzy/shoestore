package com.shoestore.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed wrapper around the {@code jwt.*} configuration keys. Populated from
 * application.yml / environment variables. Validated at startup by
 * {@link com.shoestore.security.JwtTokenProvider}; a key shorter than 32 bytes
 * or an issuer/audience that's blank causes the application to refuse to
 * start (C-1, H-8).
 */
@Component
@ConfigurationProperties(prefix = "jwt")
@Data
public class JwtProperties {
    private String secret;
    private long expiration = 900_000L;
    private String issuer;
    private String audience;
}
