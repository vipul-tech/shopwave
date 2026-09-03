package com.shopwave.orderservice.service;

import com.shopwave.orderservice.dto.OrderDto;
import com.shopwave.orderservice.entity.*;
import com.shopwave.orderservice.exception.OrderException;
import com.shopwave.orderservice.exception.ResourceNotFoundException;
import com.shopwave.orderservice.repository.CartItemRepository;
import com.shopwave.orderservice.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductServiceClient productClient;
    private final OrderEventPublisher eventPublisher;

    // ── CART ──────────────────────────────────────────────────────────────────

    public OrderDto.CartResponse getCart(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserId(userId);
        List<OrderDto.CartItemResponse> responses = items.stream()
                .map(OrderDto.CartItemResponse::from).toList();
        BigDecimal subtotal = responses.stream()
                .map(OrderDto.CartItemResponse::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return OrderDto.CartResponse.builder()
                .items(responses)
                .subtotal(subtotal)
                .totalItems(items.stream().mapToInt(CartItem::getQuantity).sum())
                .build();
    }

    public OrderDto.CartItemResponse addToCart(Long userId, OrderDto.AddToCartRequest req) {
        // Fetch product info from Product Service
        var product = productClient.getProduct(req.getProductId());
        if (product.stockQty() < req.getQuantity()) {
            throw new OrderException("Requested quantity exceeds available stock");
        }

        // Upsert: update qty if already in cart
        CartItem item = cartItemRepository
                .findByUserIdAndProductId(userId, req.getProductId())
                .map(existing -> {
                    existing.setQuantity(existing.getQuantity() + req.getQuantity());
                    return existing;
                })
                .orElseGet(() -> CartItem.builder()
                        .userId(userId)
                        .productId(product.id())
                        .productName(product.name())
                        .productSku(product.sku())
                        .quantity(req.getQuantity())
                        .unitPrice(product.price())
                        .build());

        return OrderDto.CartItemResponse.from(cartItemRepository.save(item));
    }

    public void removeFromCart(Long userId, Long productId) {
        cartItemRepository.deleteByUserIdAndProductId(userId, productId);
    }

    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
    }

    // ── PLACE ORDER ──────────────────────────────────────────────────────────

    /**
     * Places an order from the user's current cart.
     *
     * Interview talking point — this method demonstrates:
     * 1. Transactional consistency within Order Service DB
     * 2. Synchronous stock reservation call to Product Service
     * 3. Async SQS event published AFTER the transaction commits
     * 4. Order number generation with timestamp for sortability
     */
    @Transactional
    public OrderDto.OrderResponse placeOrder(Long userId, String userEmail,
                                             OrderDto.PlaceOrderRequest req,
                                             String jwtToken) {
        List<CartItem> cartItems = cartItemRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new OrderException("Cart is empty — add items before placing an order");
        }

        // Reserve stock for each item (synchronous call to Product Service)
        cartItems.forEach(item -> {
            boolean reserved = productClient.reserveStock(item.getProductId(), item.getQuantity(), jwtToken);
            if (!reserved) {
                throw new OrderException("Insufficient stock for product: " + item.getProductName());
            }
        });

        // Build and persist the order
        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .userId(userId)
                .userEmail(userEmail)
                .status(Order.OrderStatus.PENDING)
                .shippingAddress(req.getShippingAddress())
                .notes(req.getNotes())
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (CartItem ci : cartItems) {
            BigDecimal itemTotal = ci.getUnitPrice().multiply(BigDecimal.valueOf(ci.getQuantity()));
            OrderItem oi = OrderItem.builder()
                    .productId(ci.getProductId())
                    .productName(ci.getProductName())
                    .productSku(ci.getProductSku())
                    .quantity(ci.getQuantity())
                    .unitPrice(ci.getUnitPrice())
                    .totalPrice(itemTotal)
                    .build();
            order.addItem(oi);
            total = total.add(itemTotal);
        }
        order.setTotalAmount(total);

        Order saved = orderRepository.save(order);
        cartItemRepository.deleteByUserId(userId);

        log.info("Order placed: {} for user {} — total: {}", saved.getOrderNumber(), userId, total);

        // Publish async event (fire-and-forget — notification failure won't roll back order)
        eventPublisher.publishOrderPlaced(buildEvent("ORDER_PLACED", saved));

        return OrderDto.OrderResponse.from(saved);
    }

    // ── ORDER MANAGEMENT ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<OrderDto.OrderResponse> getMyOrders(Long userId, int page, int size) {
        return orderRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(OrderDto.OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderDto.OrderResponse getOrderById(Long orderId, Long userId) {
        return orderRepository.findByIdAndUserIdWithItems(orderId, userId)
                .map(OrderDto.OrderResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
    }

    @Transactional
    public OrderDto.OrderResponse cancelOrder(Long orderId, Long userId, String jwtToken) {
        Order order = orderRepository.findByIdAndUserIdWithItems(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        order.transitionTo(Order.OrderStatus.CANCELLED);
        orderRepository.save(order);

        // Restore stock for each item
        order.getItems().forEach(item ->
                productClient.restoreStock(item.getProductId(), item.getQuantity(), jwtToken));

        eventPublisher.publishOrderCancelled(buildEvent("ORDER_CANCELLED", order));
        log.info("Order cancelled: {}", order.getOrderNumber());
        return OrderDto.OrderResponse.from(order);
    }

    @Transactional
    public OrderDto.OrderResponse updateStatus(Long orderId, Order.OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        order.transitionTo(newStatus);
        orderRepository.save(order);
        eventPublisher.publishOrderStatusChanged(buildEvent("ORDER_STATUS_CHANGED", order));
        return OrderDto.OrderResponse.from(order);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private String generateOrderNumber() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
        String unique    = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return "ORD-" + timestamp + "-" + unique;
    }

    private OrderDto.OrderEvent buildEvent(String type, Order order) {
        return OrderDto.OrderEvent.builder()
                .eventType(type)
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .userEmail(order.getUserEmail())
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .shippingAddress(order.getShippingAddress())
                .items(order.getItems().stream().map(OrderDto.OrderItemResponse::from).toList())
                .timestamp(LocalDateTime.now())
                .build();
    }
}
