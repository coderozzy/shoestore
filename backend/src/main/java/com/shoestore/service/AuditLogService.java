package com.shoestore.service;

import com.shoestore.entity.AuditLog;
import com.shoestore.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Writes structured audit events for privileged operations (M-9). Runs in a
 * separate REQUIRES_NEW transaction so that audit failures never roll back
 * the caller's business write, and so that the audit row is visible to
 * readers even if the enclosing transaction later aborts.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String action, String targetType, Object targetId,
                       String oldValue, String newValue) {
        try {
            String actorUsername = null;
            String actorRole = null;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                actorUsername = auth.getName();
                actorRole = auth.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .findFirst()
                        .orElse(null);
            }

            String ip = null;
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String forwarded = request.getHeader("X-Forwarded-For");
                ip = forwarded != null && !forwarded.isBlank()
                        ? forwarded.split(",")[0].trim()
                        : request.getRemoteAddr();
            }

            AuditLog entry = AuditLog.builder()
                    .actorUsername(actorUsername)
                    .actorRole(actorRole)
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId == null ? null : String.valueOf(targetId))
                    .oldValue(oldValue)
                    .newValue(newValue)
                    .ip(ip)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Failed to write audit log for action {} target {}: {}",
                    action, targetId, ex.getMessage());
        }
    }
}
