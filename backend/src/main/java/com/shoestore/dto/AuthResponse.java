package com.shoestore.dto;

import com.shoestore.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String type;
    private String username;
    private Role role;
    private Long expiresIn;

    public static AuthResponse of(String token, String username, Role role, Long expiresIn) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .username(username)
                .role(role)
                .expiresIn(expiresIn)
                .build();
    }
}
