package com.shoestore.security;

import com.shoestore.config.OrderTokenProperties;
import com.shoestore.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * Stateless HMAC token handed back at checkout so that anonymous customers can
 * fetch their own order (and confirm payment) without logging in, but
 * strangers cannot enumerate orders by ID (C-4).
 *
 * Token format: base64url({orderId}.{paymentIntentId}.{expMillis}.{hmac})
 *   - HMAC-SHA256 over "orderId|paymentIntentId|expMillis"
 *   - Expiration enforced by the signature — we never have to trust the client clock.
 *
 * Uses {@link MessageDigest#isEqual(byte[], byte[])} for constant-time
 * comparison so an attacker can't time-side-channel the signature.
 */
@Component
@RequiredArgsConstructor
public class OrderLookupTokenService {

    private static final String ALGORITHM = "HmacSHA256";

    private final OrderTokenProperties properties;

    private byte[] keyBytes;

    @PostConstruct
    void init() {
        String secret = properties.getSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "app.order-token.secret (or JWT_SECRET) must be configured");
        }
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            // Fall back to raw-bytes if the secret isn't base64 — keeps the
            // config forgiving while still requiring *some* key material.
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 16) {
            throw new IllegalStateException(
                    "app.order-token.secret must be at least 128 bits of key material");
        }
    }

    /** Build a fresh single-purpose token for (orderId, paymentIntentId). */
    public String issue(Long orderId, String paymentIntentId) {
        long exp = System.currentTimeMillis() + properties.getTtlMs();
        String payload = orderId + "." + safe(paymentIntentId) + "." + exp;
        String sig = sign(payload);
        return base64Url(payload + "." + sig);
    }

    /**
     * Verify a token for a given {@code orderId}. Throws {@link BadRequestException}
     * with a generic message on any failure to avoid leaking diagnostic signal
     * to would-be attackers.
     */
    public void verify(String token, Long orderId) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Missing order lookup token");
        }
        String decoded;
        try {
            decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid order lookup token");
        }
        String[] parts = decoded.split("\\.", 4);
        if (parts.length != 4) {
            throw new BadRequestException("Invalid order lookup token");
        }
        long tokenOrderId;
        long exp;
        try {
            tokenOrderId = Long.parseLong(parts[0]);
            exp = Long.parseLong(parts[2]);
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Invalid order lookup token");
        }
        if (!Long.valueOf(tokenOrderId).equals(orderId)) {
            throw new BadRequestException("Invalid order lookup token");
        }
        if (System.currentTimeMillis() > exp) {
            throw new BadRequestException("Order lookup token has expired");
        }
        String expectedSig = sign(parts[0] + "." + parts[1] + "." + parts[2]);
        if (!MessageDigest.isEqual(
                expectedSig.getBytes(StandardCharsets.UTF_8),
                parts[3].getBytes(StandardCharsets.UTF_8))) {
            throw new BadRequestException("Invalid order lookup token");
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(keyBytes, ALGORITHM));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign order lookup token", ex);
        }
    }

    private String safe(String s) {
        return s == null ? "" : s.replace(".", "_");
    }

    private String base64Url(String s) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }
}
