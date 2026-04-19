package com.shoestore.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthRequest {

    // L-2: allow only printable ASCII — keeps CR/LF out of the username so
    // log entries can't be forged by a crafted login body.
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Pattern(
            regexp = "^[a-zA-Z0-9_.-]{3,50}$",
            message = "Username may contain only letters, digits, dot, underscore, hyphen"
    )
    private String username;

    @NotBlank(message = "Password is required")
    @Size(max = 200, message = "Password is too long")
    private String password;
}
