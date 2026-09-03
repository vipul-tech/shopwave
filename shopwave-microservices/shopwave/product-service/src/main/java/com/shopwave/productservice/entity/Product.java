package com.shopwave.productservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stockQty;

    @Column(nullable = false, unique = true)
    private String sku;

    private String imageUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    @Builder.Default
    private boolean active = true;

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    /**
     * Optimistic locking — prevents concurrent stock updates from overwriting each other.
     * Interview talking point: prevents lost updates in distributed systems.
     */
    @Version
    private Integer version;

    @PreUpdate
    public void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public boolean isInStock() { return stockQty > 0; }

    public void decreaseStock(int qty) {
        if (this.stockQty < qty) {
            throw new IllegalStateException("Insufficient stock for product: " + sku);
        }
        this.stockQty -= qty;
    }

    public void increaseStock(int qty) {
        this.stockQty += qty;
    }
}
