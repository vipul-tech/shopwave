package com.shopwave.notificationservice.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Mirrors OrderDto.OrderEvent published by Order Service.
 * No shared library needed — duplicate the DTO (loose coupling by design).
 *
 * Interview talking point: In microservices, sharing a common library
 * creates tight coupling. Duplicating simple DTOs keeps services independent.
 * Use an API schema (OpenAPI / AsyncAPI) as the contract instead.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEventDto {
    private String eventType;        // ORDER_PLACED, ORDER_CANCELLED, ORDER_STATUS_CHANGED
    private String orderNumber;
    private Long userId;
    private String userEmail;
    private String status;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private List<OrderItemDto> items;
    private LocalDateTime timestamp;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OrderItemDto {
        private Long productId;
        private String productName;
        private String productSku;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }
}
