package com.shopwave.userservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import com.shopwave.userservice.entity.User;
import java.time.LocalDateTime;

public class UserDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RegisterRequest {
        @NotBlank private String firstName;
        @NotBlank private String lastName;
        @Email @NotBlank private String email;
        @NotBlank @Size(min = 8) private String password;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        @Email @NotBlank private String email;
        @NotBlank private String password;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private String tokenType;
        private Long expiresIn;
        private UserResponse user;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserResponse {
        private Long id;
        private String firstName;
        private String lastName;
        private String email;
        private String role;
        private String phone;
        private String address;
        private LocalDateTime createdAt;

        public static UserResponse from(User u) {
            return UserResponse.builder()
                    .id(u.getId())
                    .firstName(u.getFirstName())
                    .lastName(u.getLastName())
                    .email(u.getEmail())
                    .role(u.getRole().name())
                    .phone(u.getPhone())
                    .address(u.getAddress())
                    .createdAt(u.getCreatedAt())
                    .build();
        }
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UpdateProfileRequest {
        private String firstName;
        private String lastName;
        @Email private String email;
        private String phone;
        private String address;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ApiResponse {
        private boolean success;
        private String message;
        private Object data;
        public static ApiResponse ok(String msg, Object data) {
            return ApiResponse.builder().success(true).message(msg).data(data).build();
        }
        public static ApiResponse ok(String msg) {
            return ApiResponse.builder().success(true).message(msg).build();
        }
    }
}
