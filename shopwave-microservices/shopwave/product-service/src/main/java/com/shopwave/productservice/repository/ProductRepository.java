package com.shopwave.productservice.repository;

import com.shopwave.productservice.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByIdAndActiveTrue(Long id);

    Optional<Product> findBySku(String sku);

    // Paginated list of active products
    Page<Product> findByActiveTrue(Pageable pageable);

    // Search by name or description with optional category filter
    @Query("""
        SELECT p FROM Product p
        WHERE p.active = true
        AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
                              OR LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:categoryId IS NULL OR p.category.id = :categoryId)
        AND (:minPrice IS NULL OR p.price >= :minPrice)
        AND (:maxPrice IS NULL OR p.price <= :maxPrice)
        AND (:inStock IS NULL OR (:inStock = true AND p.stockQty > 0)
                              OR (:inStock = false))
    """)
    Page<Product> search(
            @Param("search")     String search,
            @Param("categoryId") Long categoryId,
            @Param("minPrice")   BigDecimal minPrice,
            @Param("maxPrice")   BigDecimal maxPrice,
            @Param("inStock")    Boolean inStock,
            Pageable pageable
    );

    // Atomic stock decrement with optimistic lock check
    @Modifying
    @Query("UPDATE Product p SET p.stockQty = p.stockQty - :qty WHERE p.id = :id AND p.stockQty >= :qty")
    int decrementStock(@Param("id") Long id, @Param("qty") int qty);

    boolean existsBySku(String sku);
}
