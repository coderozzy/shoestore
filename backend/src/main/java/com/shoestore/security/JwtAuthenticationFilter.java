package com.shoestore.security;

import com.shoestore.entity.User;
import com.shoestore.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Verifies every request's access token. The token is accepted from either
 * an {@code Authorization: Bearer …} header (backward compatibility for
 * scripted clients) or the {@code SHOE_AUTH} HttpOnly cookie (C-7). On every
 * request we re-check that the user still exists, is still enabled, and that
 * the token's {@code tv} claim matches the user's current {@code tokenVersion}
 * — this is how logout, forced sign-out and staff-disable revoke tokens
 * without maintaining a separate Redis blocklist (H-3, H-8).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTH_COOKIE_NAME = "SHOE_AUTH";

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);
                Long tokenVersion = tokenProvider.getTokenVersion(jwt);

                User user = userRepository.findByUsername(username).orElse(null);
                if (user == null) {
                    log.debug("JWT for unknown user {}", username);
                } else if (!user.isEnabled()) {
                    log.debug("JWT for disabled user {}", username);
                } else if (tokenVersion == null
                        || (user.getTokenVersion() != null
                        && tokenVersion < user.getTokenVersion())) {
                    log.debug("JWT for user {} is revoked (tv={}, current={})",
                            username, tokenVersion, user.getTokenVersion());
                } else {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    user,
                                    null,
                                    user.getAuthorities()
                            );
                    authentication.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception ex) {
            // Authentication failures must never short-circuit the chain — let
            // downstream security rules render a clean 401/403.
            log.debug("Could not set user authentication in security context: {}", ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (AUTH_COOKIE_NAME.equals(cookie.getName())
                        && StringUtils.hasText(cookie.getValue())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
