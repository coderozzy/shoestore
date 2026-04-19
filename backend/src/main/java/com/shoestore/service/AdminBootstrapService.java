package com.shoestore.service;

import com.shoestore.config.BootstrapProperties;
import com.shoestore.entity.User;
import com.shoestore.enums.Role;
import com.shoestore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Replaces the deleted V5 seed migration (C-2). On first boot — and only when
 * the users table is truly empty — seeds a single admin using credentials
 * supplied via environment variables. If BOOTSTRAP_ADMIN_PASSWORD is blank,
 * the app logs a loud warning and does NOT create an account, so a typo or
 * missing secret can't silently produce a known-bad credential.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrapService {

    private final BootstrapProperties bootstrapProperties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void bootstrapAdmin() {
        if (!bootstrapProperties.isEnabled()) {
            log.info("Admin bootstrap disabled via app.bootstrap.enabled=false");
            return;
        }
        if (userRepository.count() > 0) {
            log.debug("Users already present — skipping admin bootstrap");
            return;
        }

        String username = bootstrapProperties.getAdminUsername();
        String password = bootstrapProperties.getAdminPassword();

        if (username == null || username.isBlank()) {
            log.warn("BOOTSTRAP_ADMIN_USERNAME is blank; not creating admin user");
            return;
        }
        if (password == null || password.isBlank()) {
            log.error("""
                    Users table is empty but BOOTSTRAP_ADMIN_PASSWORD is not set.
                    No admin will be created. Set BOOTSTRAP_ADMIN_PASSWORD to a
                    strong value and restart, or provision an admin manually.
                    """);
            return;
        }
        if (password.length() < 12) {
            log.error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters; not creating admin");
            return;
        }

        User admin = User.builder()
                .username(username.trim().toLowerCase())
                .password(passwordEncoder.encode(password))
                .email(bootstrapProperties.getAdminEmail())
                .role(Role.ADMIN)
                .enabled(true)
                .tokenVersion(0L)
                .build();
        userRepository.save(admin);
        log.warn("""
                Bootstrap admin user '{}' created. Log in, create a replacement
                admin, and either disable this user or rotate its password
                immediately.""", admin.getUsername());
    }
}
