package com.shopwave.orderservice.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.List;

/**
 * Validates JWT and extracts userId + email + role for use in controllers.
 * The userId is stored in claims so Order Service never calls User Service.
 */
@Component
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    @Value("${app.jwt.secret}")
    private String secret;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req,
                                    @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String authHeader = req.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(req, res);
            return;
        }
        try {
            String jwt = authHeader.substring(7);
            Claims claims = Jwts.parser().verifyWith(signingKey()).build()
                    .parseSignedClaims(jwt).getPayload();

            String email  = claims.getSubject();
            Long   userId = claims.get("userId", Long.class);
            String role   = claims.get("role", String.class);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // Custom principal carrying userId and email for controllers
                var principal  = new OrderPrincipal(userId, email);
                var auth = new UsernamePasswordAuthenticationToken(
                        principal, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + (role != null ? role : "USER"))));
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (JwtException e) {
            log.warn("Invalid JWT in Order Service: {}", e.getMessage());
        }
        chain.doFilter(req, res);
    }

    private SecretKey signingKey() {
        byte[] key = Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(secret.getBytes()));
        return Keys.hmacShaKeyFor(key);
    }

    // Simple record to carry both userId and email as principal
    public record OrderPrincipal(Long userId, String email) {}
}
