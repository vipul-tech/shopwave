package com.shopwave.orderservice.dto;

import com.shopwave.orderservice.entity.Order;
import com.shopwave.orderservice.entity.OrderItem;
import com.shopwave.orderservice.entity.CartItem;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class OrderDto {

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class PlaceOrderRequest {
        @NotBlank(message = "Shipping address is required")
        private String shippingAddress;
        private String notes;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class AddToCartRequest {
        @NotNull private Long productId;
        @NotNull @Min(1) private Integer quantity;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CartItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private String productSku;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;

        public static CartItemResponse from(CartItem c) {
            return CartItemResponse.builder()
                    .id(c.getId())
                    .productId(c.getProductId())
                    .productName(c.getProductName())
                    .productSku(c.getProductSku())
                    .quantity(c.getQuantity())
                    .unitPrice(c.getUnitPrice())
                    .totalPrice(c.getUnitPrice().multiply(BigDecimal.valueOf(c.getQuantity())))
                    .build();
        }
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CartResponse {
        private List<CartItemResponse> items;
        private BigDecimal subtotal;
        private int totalItems;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OrderItemResponse {
        private Long productId;
        private String productName;
        private String productSku;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;

        public static OrderItemResponse from(OrderItem i) {
            return OrderItemResponse.builder()
                    .productId(i.getProductId())
                    .productName(i.getProductName())
                    .productSku(i.getProductSku())
                    .quantity(i.getQuantity())
                    .unitPrice(i.getUnitPrice())
                    .totalPrice(i.getTotalPrice())
                    .build();
        }
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OrderResponse {
        private Long id;
        private String orderNumber;
        private String status;
        private BigDecimal totalAmount;
        private String shippingAddress;
        private String notes;
        private List<OrderItemResponse> items;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public static OrderResponse from(Order o) {
            return OrderResponse.builder()
                    .id(o.getId())
                    .orderNumber(o.getOrderNumber())
                    .status(o.getStatus().name())
                    .totalAmount(o.getTotalAmount())
                    .shippingAddress(o.getShippingAddress())
                    .notes(o.getNotes())
                    .items(o.getItems().stream().map(OrderItemResponse::from).toList())
                    .createdAt(o.getCreatedAt())
                    .updatedAt(o.getUpdatedAt())
                    .build();
        }
    }

    // SQS event payload published when an order is placed or updated
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OrderEvent {
        private String eventType;   // ORDER_PLACED, ORDER_CANCELLED, ORDER_SHIPPED
        private String orderNumber;
        private Long userId;
        private String userEmail;
        private String status;
        private BigDecimal totalAmount;
        private String shippingAddress;
        private List<OrderItemResponse> items;
        private LocalDateTime timestamp;
    }
}
