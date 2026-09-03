#!/bin/bash
##############################################################################
# LocalStack initialization script
# Creates AWS resources locally to mirror production setup
# Runs automatically when LocalStack starts (mounted via docker-compose)
##############################################################################

set -e

echo "==> Initializing LocalStack resources..."

AWS_CMD="aws --endpoint-url=http://localhost:4566 --region=us-east-1"

# ── SQS ──────────────────────────────────────────────────────────────────────

echo "--> Creating SQS Dead Letter Queue..."
$AWS_CMD sqs create-queue \
  --queue-name order-events-dlq \
  --attributes '{"MessageRetentionPeriod":"1209600"}'

DLQ_ARN=$($AWS_CMD sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/order-events-dlq \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "--> Creating SQS Order Events Queue..."
$AWS_CMD sqs create-queue \
  --queue-name order-events \
  --attributes "{
    \"VisibilityTimeout\":\"60\",
    \"MessageRetentionPeriod\":\"86400\",
    \"ReceiveMessageWaitTimeSeconds\":\"20\",
    \"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
  }"

echo "--> SQS queues created:"
$AWS_CMD sqs list-queues

# ── SES ──────────────────────────────────────────────────────────────────────

echo "--> Verifying SES email identity..."
$AWS_CMD ses verify-email-identity --email-address noreply@shopwave.com

echo "==> LocalStack initialization complete!"
