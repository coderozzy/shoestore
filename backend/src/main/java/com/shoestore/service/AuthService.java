package com.shoestore.service;

import com.shoestore.dto.AuthRequest;
import com.shoestore.dto.AuthResponse;
import com.shoestore.entity.User;
import com.shoestore.repository.UserRepository;
import com.shoestore.security.AuthCookieService;
import com.shoestore.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final AuthCookieService authCookieService;
    private final UserRepository userRepository;

    public AuthResponse authenticate(AuthRequest request, HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        User user = (User) authentication.getPrincipal();
        String token = tokenProvider.generateToken(user);
        authCookieService.writeAuthCookie(response, token, tokenProvider.getExpirationMs());

        log.info("User {} authenticated successfully with role {}", user.getUsername(), user.getRole());

        return AuthResponse.of(
                user.getUsername(),
                user.getRole(),
                tokenProvider.getExpirationMs()
        );
    }

    /**
     * Revokes every outstanding token for the caller by bumping their
     * token_version. Also clears the browser cookie.
     */
    @Transactional
    public void logout(String username, HttpServletResponse response) {
        if (username != null) {
            userRepository.findByUsername(username).ifPresent(user -> {
                user.setTokenVersion((user.getTokenVersion() == null ? 0L : user.getTokenVersion()) + 1);
                userRepository.save(user);
            });
        }
        authCookieService.clearAuthCookie(response);
    }
}
