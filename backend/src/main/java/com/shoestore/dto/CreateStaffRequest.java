package com.shoestore.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateStaffRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Pattern(
            regexp = "^[a-zA-Z0-9_.-]{3,50}$",
            message = "Username may contain only letters, digits, dot, underscore, hyphen"
    )
    private String username;

    // Password policy: 12-char minimum, mixed case + digit + symbol required.
    // Bcrypt chokes on inputs over 72 bytes; cap well below that.
    @NotBlank(message = "Password is required")
    @Size(min = 12, max = 72, message = "Password must be between 12 and 72 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
            message = "Password must contain lower case, upper case, digit, and symbol"
    )
    private String password;

    @Email(message = "Email must be a valid address")
    @Size(max = 254, message = "Email is too long")
    private String email;
}
