package com.shopwave.userservice.controller;

import com.shopwave.userservice.dto.UserDto;
import com.shopwave.userservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<UserDto.AuthResponse> register(
            @Valid @RequestBody UserDto.RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<UserDto.AuthResponse> login(
            @Valid @RequestBody UserDto.LoginRequest req) {
        return ResponseEntity.ok(userService.login(req));
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDto.UserResponse> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getProfile(userDetails.getUsername()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDto.UserResponse> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UserDto.UpdateProfileRequest req) {
        return ResponseEntity.ok(userService.updateProfile(userDetails.getUsername(), req));
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDto.UserResponse>> listAll() {
        return ResponseEntity.ok(userService.listAll());
    }
}
