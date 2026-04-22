package com.shoestore.service;

import com.shoestore.config.MailProperties;
import com.shoestore.entity.CustomerOrder;
import com.shoestore.entity.OrderItem;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Sends the post-payment "your order is confirmed" email to the customer.
 *
 * Contract:
 * <ul>
 *   <li>Runs {@link Async} so SMTP latency never blocks the storefront's
 *       confirm-payment HTTP response (the order is already PAID before
 *       this method is invoked; the email is purely informational).</li>
 *   <li>Self-disables when no SMTP host is configured ({@code SPRING_MAIL_HOST}
 *       blank) — local devs without an SMTP relay still get clean boots
 *       and informative INFO logs instead of a bean-init failure.</li>
 *   <li>Never throws to the caller. Mail is best-effort; a delivery
 *       failure is logged at WARN and the order remains PAID. The customer
 *       can always re-derive their tracking link from the
 *       {@code /order/:orderId?token=...} URL in their browser history,
 *       so a missed email is recoverable.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEmailService {

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    /**
     * Bound directly here (rather than going through MailProperties) so
     * the no-SMTP detection lives in one obvious spot. Spring Boot leaves
     * this blank when SPRING_MAIL_HOST is unset.
     */
    @Value("${spring.mail.host:}")
    private String mailHost;

    @Async
    public void sendOrderConfirmation(CustomerOrder order, String lookupToken) {
        if (!isMailConfigured()) {
            log.info("SMTP not configured (SPRING_MAIL_HOST blank); skipping order-confirmation email for {}",
                    order.getOrderNumber());
            return;
        }
        if (order.getCustomerEmail() == null || order.getCustomerEmail().isBlank()) {
            log.info("Order {} has no customer email; skipping confirmation email",
                    order.getOrderNumber());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailProperties.getMail().getFrom());
            helper.setTo(order.getCustomerEmail());
            helper.setSubject("Order " + order.getOrderNumber() + " confirmed — Steps");

            String trackUrl = buildTrackUrl(order.getOrderNumber(), lookupToken);
            helper.setText(
                    buildPlainBody(order, trackUrl),
                    buildHtmlBody(order, trackUrl)
            );

            mailSender.send(message);
            log.info("Sent order-confirmation email for {} to {}",
                    order.getOrderNumber(), redactEmail(order.getCustomerEmail()));
        } catch (MessagingException | RuntimeException ex) {
            // Catch RuntimeException too — Spring's MailSendException is unchecked.
            // Logging the actual address would land PII in the logs; redact.
            log.warn("Failed to send order-confirmation email for {} to {}: {}",
                    order.getOrderNumber(), redactEmail(order.getCustomerEmail()), ex.getMessage());
        }
    }

    private boolean isMailConfigured() {
        return mailHost != null && !mailHost.isBlank();
    }

    /**
     * Builds the absolute "Track your order" URL. Uses the configured
     * public base URL so the magic link works regardless of which
     * container produced the email.
     */
    private String buildTrackUrl(String orderNumber, String lookupToken) {
        String base = mailProperties.getPublicBaseUrl() == null
                ? "http://localhost:3000"
                : mailProperties.getPublicBaseUrl();
        return UriComponentsBuilder.fromUriString(base)
                .path("/store/track")
                .queryParam("orderNumber", URLEncoder.encode(orderNumber, StandardCharsets.UTF_8))
                .queryParam("token", URLEncoder.encode(lookupToken, StandardCharsets.UTF_8))
                .build(true)
                .toUriString();
    }

    private String buildPlainBody(CustomerOrder order, String trackUrl) {
        StringBuilder sb = new StringBuilder(512);
        sb.append("Hi ").append(safe(order.getCustomerName())).append(",\n\n");
        sb.append("Thanks for ordering with Steps! Your order is confirmed.\n\n");
        sb.append("Order number: ").append(order.getOrderNumber()).append('\n');
        sb.append("Total:        ").append(formatCurrency(order.getTotalAmount())).append("\n\n");
        sb.append("Items:\n");
        for (OrderItem item : order.getItems()) {
            sb.append("  - ")
                    .append(item.getProduct().getModelName())
                    .append(" (size ").append(item.getSize()).append(") x ")
                    .append(item.getQuantity())
                    .append("  ").append(formatCurrency(item.getTotalPrice()))
                    .append('\n');
        }
        sb.append("\nTrack your order:\n").append(trackUrl).append("\n\n");
        sb.append("If the link expires, paste this order number and tracking ");
        sb.append("token into the storefront's Track Order page:\n");
        sb.append("  Order number: ").append(order.getOrderNumber()).append('\n');
        sb.append("  Token:        (the long string at the end of the link above)\n\n");
        sb.append("— The Steps Store team\n");
        return sb.toString();
    }

    private String buildHtmlBody(CustomerOrder order, String trackUrl) {
        StringBuilder items = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            items.append("<tr>")
                    .append("<td style=\"padding:6px 12px 6px 0;\">")
                    .append(escape(item.getProduct().getModelName()))
                    .append(" <span style=\"color:#888\">(size ")
                    .append(escape(String.valueOf(item.getSize())))
                    .append(", ").append(item.getQuantity()).append("×)</span>")
                    .append("</td>")
                    .append("<td style=\"padding:6px 0;text-align:right;font-variant-numeric:tabular-nums\">")
                    .append(escape(formatCurrency(item.getTotalPrice())))
                    .append("</td>")
                    .append("</tr>");
        }
        return "<!doctype html><html><body style=\"font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1a1a1a;\">"
                + "<div style=\"max-width:520px;margin:0 auto;padding:32px 24px\">"
                + "<h1 style=\"font-size:22px;margin:0 0 4px\">Order confirmed</h1>"
                + "<p style=\"color:#555;margin:0 0 24px\">Thanks " + escape(safe(order.getCustomerName())) + "! Your order is on its way.</p>"
                + "<div style=\"background:#f7f7f7;border-radius:10px;padding:16px 20px;margin-bottom:24px\">"
                + "<div style=\"color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.04em\">Order number</div>"
                + "<div style=\"font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:0.05em\">"
                + escape(order.getOrderNumber()) + "</div>"
                + "</div>"
                + "<table style=\"width:100%;border-collapse:collapse;margin-bottom:16px\">" + items + "</table>"
                + "<div style=\"display:flex;justify-content:space-between;border-top:1px solid #e5e5e5;padding-top:12px;font-weight:700\">"
                + "<span>Total</span><span style=\"font-variant-numeric:tabular-nums\">"
                + escape(formatCurrency(order.getTotalAmount())) + "</span></div>"
                + "<div style=\"text-align:center;margin:32px 0\">"
                + "<a href=\"" + escape(trackUrl) + "\" "
                + "style=\"display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600\">"
                + "Track your order</a></div>"
                + "<p style=\"color:#888;font-size:12px;line-height:1.5;text-align:center\">"
                + "Save this email — the link above is the only way to access your order details if you're not signed in. "
                + "It will continue to work for 7 days.</p>"
                + "</div></body></html>";
    }

    /** Last-resort XSS guard for values rendered into HTML email. */
    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "—";
        NumberFormat fmt = NumberFormat.getCurrencyInstance(new Locale("tr", "TR"));
        return fmt.format(amount);
    }

    /**
     * Drops the local part of an email so we can log the *fact* of a send
     * (or failure) without dumping the full address into the log file.
     * For "alice@example.com" returns "***@example.com".
     */
    private String redactEmail(String email) {
        if (email == null) return "<none>";
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        return "***" + email.substring(at);
    }
}
