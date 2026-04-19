package com.shoestore.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.order-token")
@Data
public class OrderTokenProperties {
    private String secret;
    private long ttlMs = 604_800_000L;
}
