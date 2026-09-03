package com.shopwave.productservice.dto;

import com.shopwave.productservice.entity.Product;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductDto {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProductResponse {
        private Long id;
        private String name;
        private String description;
        private BigDecimal price;
        private Integer stockQty;
        private String sku;
        private String imageUrl;
        private String category;
        private Long categoryId;
        private boolean active;
        private boolean inStock;
        private LocalDateTime createdAt;

        public static ProductResponse from(Product p) {
            return ProductResponse.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .description(p.getDescription())
                    .price(p.getPrice())
                    .stockQty(p.getStockQty())
                    .sku(p.getSku())
                    .imageUrl(p.getImageUrl())
                    .category(p.getCategory() != null ? p.getCategory().getName() : null)
                    .categoryId(p.getCategory() != null ? p.getCategory().getId() : null)
                    .active(p.isActive())
                    .inStock(p.isInStock())
                    .createdAt(p.getCreatedAt())
                    .build();
        }
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class CreateProductRequest {
        @NotBlank private String name;
        private String description;
        @NotNull @DecimalMin("0.01") private BigDecimal price;
        @NotNull @Min(0) private Integer stockQty;
        @NotBlank private String sku;
        private String imageUrl;
        private Long categoryId;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UpdateProductRequest {
        private String name;
        private String description;
        @DecimalMin("0.01") private BigDecimal price;
        @Min(0) private Integer stockQty;
        private String imageUrl;
        private Long categoryId;
        private Boolean active;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class StockUpdateRequest {
        @NotNull @Min(1) private Integer quantity;
        @NotNull private StockOperation operation;
        public enum StockOperation { INCREMENT, DECREMENT }
    }

    // Used by Order Service via REST call
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StockCheckResponse {
        private Long productId;
        private String sku;
        private Integer availableQty;
        private boolean sufficient;
    }
}
