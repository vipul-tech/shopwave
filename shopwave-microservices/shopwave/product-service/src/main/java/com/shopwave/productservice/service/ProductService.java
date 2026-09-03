package com.shopwave.productservice.service;

import com.shopwave.productservice.dto.ProductDto;
import com.shopwave.productservice.entity.Category;
import com.shopwave.productservice.entity.Product;
import com.shopwave.productservice.exception.InsufficientStockException;
import com.shopwave.productservice.exception.ResourceNotFoundException;
import com.shopwave.productservice.repository.CategoryRepository;
import com.shopwave.productservice.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    // ── List / Search ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ProductDto.ProductResponse> search(
            String keyword, Long categoryId,
            BigDecimal minPrice, BigDecimal maxPrice,
            Boolean inStock, int page, int size, String sortBy, String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        return productRepository.search(keyword, categoryId, minPrice, maxPrice, inStock, pageable)
                .map(ProductDto.ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductDto.ProductResponse getById(Long id) {
        return productRepository.findByIdAndActiveTrue(id)
                .map(ProductDto.ProductResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public ProductDto.ProductResponse create(ProductDto.CreateProductRequest req) {
        if (productRepository.existsBySku(req.getSku())) {
            throw new IllegalArgumentException("SKU already exists: " + req.getSku());
        }
        Category category = null;
        if (req.getCategoryId() != null) {
            category = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + req.getCategoryId()));
        }
        Product product = Product.builder()
                .name(req.getName())
                .description(req.getDescription())
                .price(req.getPrice())
                .stockQty(req.getStockQty())
                .sku(req.getSku())
                .imageUrl(req.getImageUrl())
                .category(category)
                .build();
        return ProductDto.ProductResponse.from(productRepository.save(product));
    }

    public ProductDto.ProductResponse update(Long id, ProductDto.UpdateProductRequest req) {
        Product product = productRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));

        if (req.getName()        != null) product.setName(req.getName());
        if (req.getDescription() != null) product.setDescription(req.getDescription());
        if (req.getPrice()       != null) product.setPrice(req.getPrice());
        if (req.getStockQty()    != null) product.setStockQty(req.getStockQty());
        if (req.getImageUrl()    != null) product.setImageUrl(req.getImageUrl());
        if (req.getActive()      != null) product.setActive(req.getActive());
        if (req.getCategoryId()  != null) {
            Category cat = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            product.setCategory(cat);
        }
        return ProductDto.ProductResponse.from(productRepository.save(product));
    }

    public void delete(Long id) {
        Product product = productRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
        product.setActive(false);   // Soft delete — preserves order history
        productRepository.save(product);
        log.info("Product soft-deleted: id={}", id);
    }

    // ── Stock Management (called by Order Service) ────────────────────────────

    @Transactional
    public ProductDto.StockCheckResponse checkAndDecrementStock(Long productId, int qty) {
        int updated = productRepository.decrementStock(productId, qty);
        if (updated == 0) {
            Product p = productRepository.findById(productId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
            throw new InsufficientStockException(
                    "Insufficient stock for " + p.getSku() + ". Available: " + p.getStockQty());
        }
        Product p = productRepository.findById(productId).orElseThrow();
        return ProductDto.StockCheckResponse.builder()
                .productId(productId)
                .sku(p.getSku())
                .availableQty(p.getStockQty())
                .sufficient(true)
                .build();
    }

    @Transactional
    public void restoreStock(Long productId, int qty) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
        p.increaseStock(qty);
        productRepository.save(p);
        log.info("Stock restored: productId={}, qty={}", productId, qty);
    }
}
