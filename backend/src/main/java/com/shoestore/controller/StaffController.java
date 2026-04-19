package com.shoestore.controller;

import com.shoestore.dto.CreateStaffRequest;
import com.shoestore.dto.StaffDTO;
import com.shoestore.entity.User;
import com.shoestore.enums.Role;
import com.shoestore.repository.UserRepository;
import com.shoestore.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class StaffController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<List<StaffDTO>> listStaff() {
        List<StaffDTO> staff = userRepository.findAllByRoleOrderByCreatedAtDesc(Role.STAFF)
                .stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(staff);
    }

    @PostMapping
    public ResponseEntity<StaffDTO> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        String username = request.getUsername().trim().toLowerCase();
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .role(Role.STAFF)
                .enabled(true)
                .tokenVersion(0L)
                .build();

        User saved = userRepository.save(user);
        log.info("Admin created new staff user: {}", saved.getUsername());
        auditLogService.record("STAFF_CREATE", "User", saved.getId(), null, saved.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<StaffDTO> toggleStaff(
            @PathVariable Long id,
            @RequestParam boolean enabled) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Staff not found"));

        if (user.getRole() != Role.STAFF) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot toggle non-staff user");
        }

        boolean wasEnabled = Boolean.TRUE.equals(user.getEnabled());
        user.setEnabled(enabled);
        // When disabling we also bump token_version so every outstanding JWT
        // for this user is invalidated immediately (H-3).
        if (wasEnabled && !enabled) {
            user.setTokenVersion((user.getTokenVersion() == null ? 0L : user.getTokenVersion()) + 1);
        }
        User saved = userRepository.save(user);
        log.info("Staff user {} {}", saved.getUsername(), enabled ? "enabled" : "disabled");
        auditLogService.record(
                enabled ? "STAFF_ENABLE" : "STAFF_DISABLE",
                "User",
                saved.getId(),
                String.valueOf(wasEnabled),
                String.valueOf(enabled));
        return ResponseEntity.ok(toDTO(saved));
    }

    private StaffDTO toDTO(User user) {
        return StaffDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .enabled(user.getEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
