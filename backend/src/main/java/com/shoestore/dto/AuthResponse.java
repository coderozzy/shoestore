package com.shoestore.dto;

import com.shoestore.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Returned from /api/auth/login. The access token is delivered as an HttpOnly
 * cookie — NOT in this body — so it cannot be stolen by XSS (C-7). Only
 * public profile data flows back in the JSON payload.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String username;
    private Role role;
    /** Access-token TTL in milliseconds, for client-side refresh timing. */
    private Long expiresIn;

    public static AuthResponse of(String username, Role role, Long expiresIn) {
        return AuthResponse.builder()
                .username(username)
                .role(role)
                .expiresIn(expiresIn)
                .build();
    }
}
