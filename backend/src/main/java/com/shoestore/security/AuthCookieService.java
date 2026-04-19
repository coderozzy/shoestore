package com.shoestore.security;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Issues and clears the HttpOnly auth cookie that carries the access JWT (C-7).
 *
 * Defaults are:
 *  - HttpOnly      : prevents JavaScript reads. Protects against XSS token theft.
 *  - SameSite=Strict : prevents the cookie from riding along on cross-site
 *                      requests, which is the main CSRF vector in a
 *                      single-origin deployment like this one.
 *  - Secure        : set when {@code auth.cookie.secure=true} (prod).
 *  - Path=/        : cookie is scoped to the whole domain because nginx
 *                    co-hosts the three SPAs and /api on one origin.
 *  - Max-Age       : matches the JWT expiration so the browser discards the
 *                    cookie at the same time the JWT expires.
 */
@Component
@RequiredArgsConstructor
public class AuthCookieService {

    private static final String COOKIE_NAME = JwtAuthenticationFilter.AUTH_COOKIE_NAME;

    @Value("${auth.cookie.secure:true}")
    private boolean secure;

    @Value("${auth.cookie.same-site:Strict}")
    private String sameSite;

    public void writeAuthCookie(HttpServletResponse response, String jwt, long expirationMs) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, jwt)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(Duration.ofMillis(expirationMs))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearAuthCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
