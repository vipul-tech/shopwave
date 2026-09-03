package com.shopwave.notificationservice.service;

import com.shopwave.notificationservice.dto.OrderEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

import java.text.NumberFormat;
import java.util.Currency;
import java.util.Locale;

/**
 * Sends transactional emails via AWS SES.
 *
 * Interview talking points:
 * - SES requires verified sender email in sandbox mode
 * - In production: move out of sandbox by requesting production access
 * - Template emails: use SES Templates for richer HTML (not shown here for simplicity)
 * - Bounces/complaints: configure SNS → SQS for bounce handling
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationService {

    private final SesClient sesClient;

    @Value("${notification.mail.from}")
    private String fromEmail;

    @Value("${notification.mail.from-name:ShopWave}")
    private String fromName;

    public void sendOrderConfirmation(OrderEventDto event) {
        String subject = "Order Confirmed — " + event.getOrderNumber();
        String body = buildOrderConfirmationHtml(event);
        sendEmail(event.getUserEmail(), subject, body);
    }

    public void sendOrderCancellation(OrderEventDto event) {
        String subject = "Order Cancelled — " + event.getOrderNumber();
        String body = buildOrderCancellationHtml(event);
        sendEmail(event.getUserEmail(), subject, body);
    }

    public void sendOrderStatusUpdate(OrderEventDto event) {
        String subject = "Order Update — " + event.getOrderNumber() + " is now " + event.getStatus();
        String body = buildStatusUpdateHtml(event);
        sendEmail(event.getUserEmail(), subject, body);
    }

    // ── SES send ─────────────────────────────────────────────────────────────

    private void sendEmail(String toEmail, String subject, String htmlBody) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    .source(fromName + " <" + fromEmail + ">")
                    .destination(Destination.builder().toAddresses(toEmail).build())
                    .message(Message.builder()
                            .subject(Content.builder().data(subject).charset("UTF-8").build())
                            .body(Body.builder()
                                    .html(Content.builder().data(htmlBody).charset("UTF-8").build())
                                    .build())
                            .build())
                    .build();

            SendEmailResponse response = sesClient.sendEmail(request);
            log.info("Email sent to {} | messageId={}", toEmail, response.messageId());

        } catch (SesException e) {
            log.error("SES send failed to {}: {} — {}", toEmail, e.awsErrorDetails().errorCode(), e.getMessage());
            // Don't rethrow — log for monitoring, message will be retried via SQS visibility timeout
        }
    }

    // ── HTML templates ────────────────────────────────────────────────────────

    private String buildOrderConfirmationHtml(OrderEventDto event) {
        NumberFormat currency = NumberFormat.getCurrencyInstance(Locale.US);
        StringBuilder items = new StringBuilder();
        if (event.getItems() != null) {
            for (var item : event.getItems()) {
                items.append(String.format("""
                    <tr>
                      <td style="padding:8px;border-bottom:1px solid #eee">%s</td>
                      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">%d</td>
                      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">%s</td>
                    </tr>
                    """, item.getProductName(), item.getQuantity(),
                        currency.format(item.getTotalPrice())));
            }
        }
        return String.format("""
            <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto">
              <div style="background:#2d6a4f;padding:24px;text-align:center">
                <h1 style="color:white;margin:0">ShopWave</h1>
              </div>
              <div style="padding:32px">
                <h2>Order Confirmed! 🎉</h2>
                <p>Hi there! Your order has been successfully placed.</p>
                <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0">
                  <strong>Order Number:</strong> %s<br>
                  <strong>Status:</strong> %s<br>
                  <strong>Ship to:</strong> %s
                </div>
                <table style="width:100%%;border-collapse:collapse">
                  <thead>
                    <tr style="background:#f0f0f0">
                      <th style="padding:10px;text-align:left">Item</th>
                      <th style="padding:10px;text-align:center">Qty</th>
                      <th style="padding:10px;text-align:right">Total</th>
                    </tr>
                  </thead>
                  <tbody>%s</tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="padding:12px;text-align:right"><strong>Order Total:</strong></td>
                      <td style="padding:12px;text-align:right;font-weight:bold;font-size:18px">%s</td>
                    </tr>
                  </tfoot>
                </table>
                <p style="margin-top:24px;color:#666;font-size:14px">
                  Questions? Reply to this email or visit our help centre.
                </p>
              </div>
              <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:12px;color:#999">
                © 2024 ShopWave. All rights reserved.
              </div>
            </html>
            """,
            event.getOrderNumber(), event.getStatus(), event.getShippingAddress(),
            items.toString(), currency.format(event.getTotalAmount()));
    }

    private String buildOrderCancellationHtml(OrderEventDto event) {
        return String.format("""
            <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto">
              <div style="background:#c0392b;padding:24px;text-align:center">
                <h1 style="color:white;margin:0">ShopWave</h1>
              </div>
              <div style="padding:32px">
                <h2>Order Cancelled</h2>
                <p>Your order <strong>%s</strong> has been cancelled.</p>
                <p>If you paid for this order, a full refund will be processed within 3-5 business days.</p>
                <p>Stock has been restored and items may be available to purchase again.</p>
                <p>Need help? Contact our support team.</p>
              </div>
            </html>
            """, event.getOrderNumber());
    }

    private String buildStatusUpdateHtml(OrderEventDto event) {
        String emoji = switch (event.getStatus()) {
            case "CONFIRMED" -> "✅";
            case "SHIPPED"   -> "🚚";
            case "DELIVERED" -> "📦";
            default          -> "ℹ️";
        };
        return String.format("""
            <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto">
              <div style="background:#2d6a4f;padding:24px;text-align:center">
                <h1 style="color:white;margin:0">ShopWave</h1>
              </div>
              <div style="padding:32px;text-align:center">
                <div style="font-size:64px">%s</div>
                <h2>Order %s</h2>
                <p>Your order <strong>%s</strong> is now <strong>%s</strong>.</p>
              </div>
            </html>
            """, emoji, event.getStatus(), event.getOrderNumber(), event.getStatus());
    }
}
