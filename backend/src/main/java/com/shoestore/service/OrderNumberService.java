package com.shoestore.service;

import com.shoestore.repository.CustomerOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

/**
 * Generates the customer-facing order number ("STP-XXXXXXXX") attached to
 * every {@code customer_orders} row. The numeric primary key still drives
 * foreign keys and lookup tokens internally; {@code order_number} is what
 * the customer sees on the receipt, in the confirmation email, and types
 * into the storefront "Track order" form.
 *
 * Generation strategy:
 * <ul>
 *   <li>{@link SecureRandom} for entropy — predictable order numbers
 *       would let an attacker enumerate orders and probe the lookup-token
 *       endpoint with valid candidates (C-4 mitigation reuses the token
 *       check, but unpredictable numbers are defence in depth).</li>
 *   <li>Crockford base32 alphabet (ABCDEFGHJKMNPQRSTVWXYZ0123456789, no
 *       I/L/O/U) — disambiguates 1/I/L and 0/O/U on printed receipts and
 *       phone-dictated support calls.</li>
 *   <li>8 random characters → 32^8 ≈ 1.1×10^12 distinct codes. Birthday
 *       collisions appear at ~1.2 million orders; the retry loop here
 *       handles that without ever surfacing a UniqueConstraintViolation
 *       to the customer.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderNumberService {

    private static final String PREFIX = "STP-";
    private static final char[] ALPHABET =
            "ABCDEFGHJKMNPQRSTVWXYZ0123456789".toCharArray();
    private static final int CODE_LENGTH = 8;
    /**
     * Hard ceiling on retry attempts. With 1.1×10^12 codes, the
     * probability of N consecutive collisions is astronomically small
     * past N=3, so >5 attempts almost certainly indicates the database
     * itself is misbehaving (e.g. duplicate trigger, replication lag).
     */
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final CustomerOrderRepository customerOrderRepository;

    /**
     * Returns a fresh order number that is guaranteed not to collide with
     * an existing row at the time of generation. The caller still relies
     * on the database UNIQUE constraint as the authoritative race winner;
     * this method only minimises the *expected* number of failed inserts.
     */
    public String generateUnique() {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String candidate = build();
            if (!customerOrderRepository.existsByOrderNumber(candidate)) {
                return candidate;
            }
            log.warn("Order number collision on attempt {} ({}) — retrying",
                    attempt + 1, candidate);
        }
        throw new IllegalStateException(
                "Failed to generate a unique order number after "
                        + MAX_ATTEMPTS + " attempts");
    }

    private String build() {
        StringBuilder sb = new StringBuilder(PREFIX.length() + CODE_LENGTH);
        sb.append(PREFIX);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET[random.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }
}
