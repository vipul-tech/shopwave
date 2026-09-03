package com.shopwave.productservice.controller;

import com.shopwave.productservice.dto.ProductDto;
import com.shopwave.productservice.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * GET /api/products?search=iphone&categoryId=1&minPrice=100&maxPrice=2000
     *                  &inStock=true&page=0&size=10&sortBy=price&sortDir=asc
     *
     * Interview talking point: paginated, filterable, sortable — production-grade API design.
     */
    @GetMapping
    public ResponseEntity<Page<ProductDto.ProductResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        return ResponseEntity.ok(productService.search(
                search, categoryId, minPrice, maxPrice, inStock, page, size, sortBy, sortDir));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto.ProductResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto.ProductResponse> create(
            @Valid @RequestBody ProductDto.CreateProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto.ProductResponse> update(
            @PathVariable Long id,
            @RequestBody ProductDto.UpdateProductRequest req) {
        return ResponseEntity.ok(productService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Internal endpoint called by Order Service to reserve stock
    @PostMapping("/{id}/stock/decrement")
    public ResponseEntity<ProductDto.StockCheckResponse> decrementStock(
            @PathVariable Long id,
            @Valid @RequestBody ProductDto.StockUpdateRequest req) {
        return ResponseEntity.ok(productService.checkAndDecrementStock(id, req.getQuantity()));
    }

    // Internal endpoint called by Order Service to restore stock on cancellation
    @PostMapping("/{id}/stock/restore")
    public ResponseEntity<Void> restoreStock(
            @PathVariable Long id,
            @Valid @RequestBody ProductDto.StockUpdateRequest req) {
        productService.restoreStock(id, req.getQuantity());
        return ResponseEntity.ok().build();
    }
}
