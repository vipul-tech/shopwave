package com.shopwave.notificationservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.shopwave.notificationservice.dto.OrderEventDto;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.*;

import java.util.List;

/**
 * Polls AWS SQS for order events and dispatches email notifications.
 *
 * Interview talking points:
 *
 * 1. LONG POLLING (WaitTimeSeconds=20) — drastically reduces empty receives
 *    and costs compared to short polling. AWS charges per API call.
 *
 * 2. VISIBILITY TIMEOUT — when we receive a message, SQS hides it from
 *    other consumers for the visibility timeout period. If we process it
 *    successfully and delete it, it's gone. If we crash, it reappears
 *    after the timeout — guaranteeing at-least-once delivery.
 *
 * 3. DEAD LETTER QUEUE (DLQ) — configure maxReceiveCount in AWS. After
 *    N failed attempts, SQS moves the message to the DLQ for inspection.
 *    This prevents poison pill messages from blocking the queue forever.
 *
 * 4. IDEMPOTENCY — order events carry a unique orderNumber. If a message
 *    is delivered twice (at-least-once), sending the same confirmation
 *    email twice is acceptable. For financial operations, store processed
 *    message IDs in a DB table and check before acting.
 *
 * 5. BATCH PROCESSING — we fetch up to 10 messages per poll to reduce
 *    API calls and improve throughput.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SqsMessageListener {

    private final SqsClient sqsClient;
    private final EmailNotificationService emailService;

    @Value("${aws.sqs.order-queue-url}")
    private String queueUrl;

    @Value("${aws.sqs.max-messages:10}")
    private int maxMessages;

    @Value("${aws.sqs.wait-time-seconds:20}")
    private int waitTimeSeconds;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    /**
     * Polls SQS every 5 seconds using Spring @Scheduled.
     * For high throughput, replace with a dedicated thread pool or
     * a reactive listener (Spring Cloud AWS Messaging).
     */
    @Scheduled(fixedDelayString = "${aws.sqs.polling-interval-ms:5000}")
    public void pollMessages() {
        try {
            ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .maxNumberOfMessages(maxMessages)
                    .waitTimeSeconds(waitTimeSeconds)   // Long polling
                    .messageAttributeNames("All")       // Fetch message attributes
                    .build();

            List<Message> messages = sqsClient.receiveMessage(request).messages();

            if (!messages.isEmpty()) {
                log.debug("Received {} messages from SQS", messages.size());
                messages.forEach(this::processMessage);
            }
        } catch (Exception e) {
            log.error("Error polling SQS: {}", e.getMessage());
        }
    }

    private void processMessage(Message message) {
        try {
            log.info("Processing SQS message: {}", message.messageId());

            OrderEventDto event = objectMapper.readValue(message.body(), OrderEventDto.class);
            log.info("Processing {} event for order {}", event.getEventType(), event.getOrderNumber());

            // Dispatch to appropriate handler based on eventType
            switch (event.getEventType()) {
                case "ORDER_PLACED"         -> emailService.sendOrderConfirmation(event);
                case "ORDER_CANCELLED"      -> emailService.sendOrderCancellation(event);
                case "ORDER_STATUS_CHANGED" -> emailService.sendOrderStatusUpdate(event);
                default -> log.warn("Unknown event type: {}", event.getEventType());
            }

            // Only delete AFTER successful processing
            deleteMessage(message.receiptHandle());
            log.info("Successfully processed and deleted message: {}", message.messageId());

        } catch (Exception e) {
            log.error("Failed to process message {}: {} — leaving in queue for retry",
                    message.messageId(), e.getMessage());
            // Don't delete — SQS will redeliver after visibility timeout expires
        }
    }

    /**
     * Deletes a successfully processed message from SQS.
     * Receipt handle is unique per receive — a different handle is issued on each redelivery.
     */
    private void deleteMessage(String receiptHandle) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(receiptHandle)
                .build());
    }

    @PostConstruct
    public void init() {
        log.info("SQS listener initialized. Queue: {}", queueUrl);
    }
}
