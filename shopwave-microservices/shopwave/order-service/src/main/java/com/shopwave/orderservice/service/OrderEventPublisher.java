package com.shopwave.orderservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.shopwave.orderservice.dto.OrderDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.*;

import java.time.LocalDateTime;

/**
 * Publishes order domain events to AWS SQS.
 *
 * Interview talking points:
 * 1. Async decoupling — Order Service doesn't wait for Notification Service to respond.
 * 2. At-least-once delivery — SQS guarantees the message is delivered at least once.
 * 3. Dead Letter Queue (DLQ) — configure in AWS to capture failed messages.
 * 4. Message attributes for filtering — consumers can filter by eventType without parsing body.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventPublisher {

    private final SqsClient sqsClient;

    @Value("${aws.sqs.order-queue-url}")
    private String queueUrl;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    public void publishOrderPlaced(OrderDto.OrderEvent event) {
        publish("ORDER_PLACED", event);
    }

    public void publishOrderCancelled(OrderDto.OrderEvent event) {
        publish("ORDER_CANCELLED", event);
    }

    public void publishOrderStatusChanged(OrderDto.OrderEvent event) {
        publish("ORDER_STATUS_CHANGED", event);
    }

    private void publish(String eventType, OrderDto.OrderEvent event) {
        event.setEventType(eventType);
        event.setTimestamp(LocalDateTime.now());

        try {
            String messageBody = objectMapper.writeValueAsString(event);

            SendMessageRequest request = SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(messageBody)
                    // Message attribute for server-side filtering
                    .messageAttributes(java.util.Map.of(
                            "eventType", MessageAttributeValue.builder()
                                    .dataType("String")
                                    .stringValue(eventType)
                                    .build(),
                            "orderNumber", MessageAttributeValue.builder()
                                    .dataType("String")
                                    .stringValue(event.getOrderNumber())
                                    .build()
                    ))
                    .build();

            SendMessageResponse response = sqsClient.sendMessage(request);
            log.info("Published {} event for order {}. MessageId: {}",
                    eventType, event.getOrderNumber(), response.messageId());

        } catch (JsonProcessingException e) {
            log.error("Failed to serialize order event: {}", e.getMessage());
        } catch (SqsException e) {
            log.error("Failed to publish to SQS: {} — order {} will not receive notification",
                    e.getMessage(), event.getOrderNumber());
            // Don't rethrow — notification failure should NOT fail the order transaction
        }
    }
}
