package com.shopwave.userservice.service;

import com.shopwave.userservice.dto.UserDto;
import com.shopwave.userservice.entity.User;
import com.shopwave.userservice.exception.ResourceNotFoundException;
import com.shopwave.userservice.exception.UserAlreadyExistsException;
import com.shopwave.userservice.repository.UserRepository;
import com.shopwave.userservice.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authManager;

    public UserDto.AuthResponse register(UserDto.RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered: " + req.getEmail());
        }
        User user = User.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(User.Role.USER)
                .build();
        userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        String token = jwtService.generateToken(
                Map.of("role", user.getRole().name(), "userId", user.getId()), user);
        return UserDto.AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpiration())
                .user(UserDto.UserResponse.from(user))
                .build();
    }

    public UserDto.AuthResponse login(UserDto.LoginRequest req) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String token = jwtService.generateToken(
                Map.of("role", user.getRole().name(), "userId", user.getId()), user);
        log.info("User logged in: {}", user.getEmail());
        return UserDto.AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpiration())
                .user(UserDto.UserResponse.from(user))
                .build();
    }

    @Transactional(readOnly = true)
    public UserDto.UserResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        return UserDto.UserResponse.from(user);
    }

    public UserDto.UserResponse updateProfile(String email, UserDto.UpdateProfileRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (req.getFirstName() != null) user.setFirstName(req.getFirstName());
        if (req.getLastName()  != null) user.setLastName(req.getLastName());
        if (req.getPhone()     != null) user.setPhone(req.getPhone());
        if (req.getAddress()   != null) user.setAddress(req.getAddress());
        return UserDto.UserResponse.from(userRepository.save(user));
    }

    // Admin: list all users
    @Transactional(readOnly = true)
    public List<UserDto.UserResponse> listAll() {
        return userRepository.findAll().stream()
                .map(UserDto.UserResponse::from).toList();
    }
}
