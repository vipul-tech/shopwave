package com.shopwave.orderservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

/**
 * HTTP client for calling Product Service.
 *
 * Interview talking points:
 * - Synchronous REST call for stock check (could be replaced with gRPC or Feign)
 * - In production: add Circuit Breaker (Resilience4j) around these calls
 * - Service Discovery: use Spring Cloud LoadBalancer instead of hardcoded URL
 * - On AWS: services discover each other via ECS Service Discovery / AWS Cloud Map
 */
@Service
@Slf4j
public class ProductServiceClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${services.product-service-url}")
    private String productServiceUrl;

    public record ProductInfo(Long id, String name, String sku, BigDecimal price, int stockQty) {}

    /**
     * Fetch product details from Product Service.
     */
    @SuppressWarnings("unchecked")
    public ProductInfo getProduct(Long productId) {
        try {
            String url = productServiceUrl + "/products/" + productId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null) throw new RuntimeException("Empty response from Product Service");

            return new ProductInfo(
                    ((Number) body.get("id")).longValue(),
                    (String) body.get("name"),
                    (String) body.get("sku"),
                    new BigDecimal(body.get("price").toString()),
                    ((Number) body.get("stockQty")).intValue()
            );
        } catch (HttpClientErrorException.NotFound e) {
            throw new RuntimeException("Product not found: " + productId);
        } catch (Exception e) {
            log.error("Failed to fetch product {}: {}", productId, e.getMessage());
            throw new RuntimeException("Product Service unavailable: " + e.getMessage());
        }
    }

    /**
     * Reserve stock for an order item.
     * Returns true if stock was successfully reserved.
     */
    public boolean reserveStock(Long productId, int quantity, String jwtToken) {
        try {
            String url = productServiceUrl + "/products/" + productId + "/stock/decrement";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(jwtToken);

            Map<String, Object> body = Map.of("quantity", quantity, "operation", "DECREMENT");
            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
            return true;
        } catch (HttpClientErrorException.Conflict e) {
            log.warn("Insufficient stock for product {}: {}", productId, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Stock reservation failed for product {}: {}", productId, e.getMessage());
            throw new RuntimeException("Failed to reserve stock: " + e.getMessage());
        }
    }

    /**
     * Restore stock when order is cancelled.
     */
    public void restoreStock(Long productId, int quantity, String jwtToken) {
        try {
            String url = productServiceUrl + "/products/" + productId + "/stock/restore";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(jwtToken);

            Map<String, Object> body = Map.of("quantity", quantity, "operation", "INCREMENT");
            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Void.class);
            log.info("Restored {} units for product {}", quantity, productId);
        } catch (Exception e) {
            log.error("Failed to restore stock for product {}: {}", productId, e.getMessage());
            // Log but don't throw — manual reconciliation needed
        }
    }
}
