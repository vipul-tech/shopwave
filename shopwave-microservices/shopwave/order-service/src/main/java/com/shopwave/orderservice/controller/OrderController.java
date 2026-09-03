package com.shopwave.orderservice.controller;

import com.shopwave.orderservice.dto.OrderDto;
import com.shopwave.orderservice.entity.Order;
import com.shopwave.orderservice.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // ── Cart endpoints ────────────────────────────────────────────────────────

    @GetMapping("/cart")
    public ResponseEntity<OrderDto.CartResponse> getCart(
            @AuthenticationPrincipal(expression = "userId") Long userId) {
        return ResponseEntity.ok(orderService.getCart(userId));
    }

    @PostMapping("/cart/items")
    public ResponseEntity<OrderDto.CartItemResponse> addToCart(
            @AuthenticationPrincipal(expression = "userId") Long userId,
            @Valid @RequestBody OrderDto.AddToCartRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.addToCart(userId, req));
    }

    @DeleteMapping("/cart/items/{productId}")
    public ResponseEntity<Void> removeFromCart(
            @AuthenticationPrincipal(expression = "userId") Long userId,
            @PathVariable Long productId) {
        orderService.removeFromCart(userId, productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cart")
    public ResponseEntity<Void> clearCart(
            @AuthenticationPrincipal(expression = "userId") Long userId) {
        orderService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }

    // ── Order endpoints ──────────────────────────────────────────────────────

    @PostMapping("/orders")
    public ResponseEntity<OrderDto.OrderResponse> placeOrder(
            @AuthenticationPrincipal(expression = "userId") Long userId,
            @AuthenticationPrincipal(expression = "email") String email,
            @Valid @RequestBody OrderDto.PlaceOrderRequest req,
            HttpServletRequest httpRequest) {
        String token = httpRequest.getHeader("Authorization").substring(7);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.placeOrder(userId, email, req, token));
    }

    @GetMapping("/orders")
    public ResponseEntity<Page<OrderDto.OrderResponse>> getMyOrders(
            @AuthenticationPrincipal(expression = "userId") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(orderService.getMyOrders(userId, page, size));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderDto.OrderResponse> getOrderById(
            @AuthenticationPrincipal(expression = "userId") Long userId,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getOrderById(orderId, userId));
    }

    @PatchMapping("/orders/{orderId}/cancel")
    public ResponseEntity<OrderDto.OrderResponse> cancelOrder(
            @AuthenticationPrincipal(expression = "userId") Long userId,
            @PathVariable Long orderId,
            HttpServletRequest httpRequest) {
        String token = httpRequest.getHeader("Authorization").substring(7);
        return ResponseEntity.ok(orderService.cancelOrder(orderId, userId, token));
    }

    // Admin: update order status
    @PatchMapping("/admin/orders/{orderId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrderDto.OrderResponse> updateStatus(
            @PathVariable Long orderId,
            @RequestParam Order.OrderStatus status) {
        return ResponseEntity.ok(orderService.updateStatus(orderId, status));
    }
}
