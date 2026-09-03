package com.shopwave.orderservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String orderNumber;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String userEmail;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String shippingAddress;

    private String notes;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    /**
     * Optimistic locking — prevents race conditions when multiple
     * requests try to cancel/update the same order simultaneously.
     */
    @Version
    private Integer version;

    @PreUpdate
    public void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    /**
     * Order state machine — valid transitions:
     * PENDING → CONFIRMED → SHIPPED → DELIVERED
     * PENDING → CANCELLED
     * CONFIRMED → CANCELLED
     */
    public void transitionTo(OrderStatus newStatus) {
        if (!this.status.canTransitionTo(newStatus)) {
            throw new IllegalStateException(
                    "Cannot transition order from " + this.status + " to " + newStatus);
        }
        this.status = newStatus;
    }

    public enum OrderStatus {
        PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED;

        public boolean canTransitionTo(OrderStatus next) {
            return switch (this) {
                case PENDING   -> next == CONFIRMED || next == CANCELLED;
                case CONFIRMED -> next == SHIPPED   || next == CANCELLED;
                case SHIPPED   -> next == DELIVERED;
                default        -> false;
            };
        }
    }
}
