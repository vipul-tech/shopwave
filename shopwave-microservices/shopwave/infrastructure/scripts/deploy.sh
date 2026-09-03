#!/bin/bash
##############################################################################
# ShopWave — CI/CD Deploy Script
# Usage: ./deploy.sh <service-name> <image-tag>
# Example: ./deploy.sh user-service abc1234
#
# Interview talking point:
# In production this runs inside AWS CodePipeline / GitHub Actions.
# Steps: Build → Test → Push to ECR → Update ECS service (rolling deploy)
##############################################################################

set -euo pipefail

SERVICE=${1:-"user-service"}
IMAGE_TAG=${2:-"latest"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
PROJECT="shopwave"

echo "==> Deploying ${SERVICE} with tag ${IMAGE_TAG}"

# ── Step 1: Get ECR login token ───────────────────────────────────────────────
echo "--> Logging into ECR..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# ── Step 2: Build & push Docker image ────────────────────────────────────────
echo "--> Building Docker image..."
cd "${SERVICE}"
docker build \
  --platform linux/amd64 \
  --cache-from "${ECR_REGISTRY}/${PROJECT}/${SERVICE}:latest" \
  -t "${ECR_REGISTRY}/${PROJECT}/${SERVICE}:${IMAGE_TAG}" \
  -t "${ECR_REGISTRY}/${PROJECT}/${SERVICE}:latest" \
  .

echo "--> Pushing to ECR..."
docker push "${ECR_REGISTRY}/${PROJECT}/${SERVICE}:${IMAGE_TAG}"
docker push "${ECR_REGISTRY}/${PROJECT}/${SERVICE}:latest"
cd ..

# ── Step 3: Update ECS service (rolling deployment) ──────────────────────────
echo "--> Updating ECS service..."
aws ecs update-service \
  --cluster "${PROJECT}-cluster" \
  --service "${PROJECT}-${SERVICE}" \
  --force-new-deployment \
  --region "${AWS_REGION}"

# ── Step 4: Wait for deployment to stabilize ─────────────────────────────────
echo "--> Waiting for service to stabilize (this may take 2-3 minutes)..."
aws ecs wait services-stable \
  --cluster "${PROJECT}-cluster" \
  --services "${PROJECT}-${SERVICE}" \
  --region "${AWS_REGION}"

echo "==> Deployment of ${SERVICE}:${IMAGE_TAG} completed successfully!"
