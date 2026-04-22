package com.shoestore.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * App-level mail settings. Spring Boot's own {@code spring.mail.*}
 * properties handle the SMTP connection (host/port/auth); these
 * complement that with the values we control directly:
 * <ul>
 *   <li>{@code app.mail.from} — the {@code From:} header on outbound mail.</li>
 *   <li>{@code app.public-base-url} — used to build absolute "Track your
 *       order" links so the email recipient lands on the right origin
 *       regardless of which container they're served from.</li>
 * </ul>
 */
@Component
@ConfigurationProperties(prefix = "app")
@Data
public class MailProperties {

    private Mail mail = new Mail();
    private String publicBaseUrl;

    @Data
    public static class Mail {
        private String from;
    }
}
