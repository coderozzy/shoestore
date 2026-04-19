package com.shoestore.controller;

import com.shoestore.dto.AuthRequest;
import com.shoestore.dto.AuthResponse;
import com.shoestore.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request,
                                              HttpServletResponse response) {
        return ResponseEntity.ok(authService.authenticate(request, response));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication,
                                       HttpServletResponse response) {
        String username = authentication == null ? null : authentication.getName();
        authService.logout(username, response);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lightweight session probe used by SPAs on mount: if the HttpOnly cookie
     * is valid, returns {@code {username, role}}; otherwise 401 falls through
     * from the security filter.
     */
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        com.shoestore.entity.User user = (com.shoestore.entity.User) authentication.getPrincipal();
        return ResponseEntity.ok(AuthResponse.of(user.getUsername(), user.getRole(), null));
    }
}
