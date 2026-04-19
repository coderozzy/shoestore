package com.shoestore.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * First-boot admin seeding. Only creates a user when the {@code users} table
 * is empty — protects against recreating a default admin after disable.
 */
@Component
@ConfigurationProperties(prefix = "app.bootstrap")
@Data
public class BootstrapProperties {
    private boolean enabled = true;
    private String adminUsername = "admin";
    private String adminPassword;
    private String adminEmail = "admin@shoestore.local";
}
