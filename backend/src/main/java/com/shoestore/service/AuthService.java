package com.shoestore.service;

import com.shoestore.dto.AuthRequest;
import com.shoestore.dto.AuthResponse;
import com.shoestore.entity.User;
import com.shoestore.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthResponse authenticate(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        String token = tokenProvider.generateToken(authentication);
        User user = (User) authentication.getPrincipal();
        
        log.info("User {} authenticated successfully with role {}", user.getUsername(), user.getRole());
        
        return AuthResponse.of(
                token,
                user.getUsername(),
                user.getRole(),
                tokenProvider.getExpirationMs()
        );
    }
}
