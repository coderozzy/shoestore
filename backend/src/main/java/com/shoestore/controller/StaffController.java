package com.shoestore.controller;

import com.shoestore.dto.CreateStaffRequest;
import com.shoestore.dto.StaffDTO;
import com.shoestore.entity.User;
import com.shoestore.enums.Role;
import com.shoestore.repository.UserRepository;
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

    private static final String DEFAULT_STAFF_PASSWORD = "staff123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        User user = User.builder()
                .username(request.getUsername().trim().toLowerCase())
                .password(passwordEncoder.encode(DEFAULT_STAFF_PASSWORD))
                .email(request.getEmail())
                .role(Role.STAFF)
                .enabled(true)
                .build();

        User saved = userRepository.save(user);
        log.info("Admin created new staff user: {}", saved.getUsername());
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

        user.setEnabled(enabled);
        User saved = userRepository.save(user);
        log.info("Staff user {} {}", saved.getUsername(), enabled ? "enabled" : "disabled");
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
