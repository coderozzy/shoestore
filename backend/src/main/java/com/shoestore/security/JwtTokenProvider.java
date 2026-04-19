package com.shoestore.security;

import com.shoestore.config.JwtProperties;
import com.shoestore.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtTokenProvider {

    /** HS256 requires at least 32 bytes (256 bits) of key material. */
    private static final int MIN_KEY_BYTES = 32;

    private final JwtProperties jwtProperties;

    private SecretKey signingKey;

    @PostConstruct
    void init() {
        if (jwtProperties.getSecret() == null || jwtProperties.getSecret().isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET is not configured. Generate one with `openssl rand -base64 48`.");
        }
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(jwtProperties.getSecret());
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException(
                    "JWT_SECRET must be base64-encoded. Generate one with `openssl rand -base64 48`.", ex);
        }
        if (keyBytes.length < MIN_KEY_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET must decode to at least " + MIN_KEY_BYTES + " bytes (256 bits). "
                            + "Current length: " + keyBytes.length + " bytes.");
        }
        if (jwtProperties.getIssuer() == null || jwtProperties.getIssuer().isBlank()) {
            throw new IllegalStateException("jwt.issuer must be configured");
        }
        if (jwtProperties.getAudience() == null || jwtProperties.getAudience().isBlank()) {
            throw new IllegalStateException("jwt.audience must be configured");
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return generateToken(user);
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtProperties.getExpiration());

        return Jwts.builder()
                .subject(user.getUsername())
                .id(UUID.randomUUID().toString())
                .issuer(jwtProperties.getIssuer())
                .audience().add(jwtProperties.getAudience()).and()
                .issuedAt(now)
                .expiration(expiryDate)
                .claim("tv", user.getTokenVersion() == null ? 0L : user.getTokenVersion())
                .claim("uid", user.getId())
                .signWith(signingKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(jwtProperties.getIssuer())
                .requireAudience(jwtProperties.getAudience())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getUsernameFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public Long getTokenVersion(String token) {
        Object tv = parseClaims(token).get("tv");
        if (tv instanceof Number n) {
            return n.longValue();
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException ex) {
            log.debug("Expired JWT token");
        } catch (MalformedJwtException ex) {
            log.debug("Malformed JWT token");
        } catch (UnsupportedJwtException ex) {
            log.debug("Unsupported JWT token");
        } catch (IncorrectClaimException ex) {
            log.debug("JWT claim mismatch (iss/aud)");
        } catch (MissingClaimException ex) {
            log.debug("JWT missing required claim");
        } catch (SignatureException ex) {
            log.debug("JWT signature verification failed");
        } catch (IllegalArgumentException ex) {
            log.debug("JWT empty or invalid");
        }
        return false;
    }

    public long getExpirationMs() {
        return jwtProperties.getExpiration();
    }
}
