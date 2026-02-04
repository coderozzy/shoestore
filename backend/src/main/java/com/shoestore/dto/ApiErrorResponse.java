package com.shoestore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiErrorResponse {
    private int status;
    private String message;
    private String path;
    private LocalDateTime timestamp;
    private List<FieldError> errors;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FieldError {
        private String field;
        private String message;
    }

    public static ApiErrorResponse of(int status, String message, String path) {
        return ApiErrorResponse.builder()
                .status(status)
                .message(message)
                .path(path)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
