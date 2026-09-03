output "alb_dns_name" {
  description = "ALB DNS name — use this as your API base URL"
  value       = aws_lb.main.dns_name
}

output "ecr_repositories" {
  description = "ECR repository URLs for docker push"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "sqs_queue_url" {
  description = "SQS order events queue URL"
  value       = aws_sqs_queue.order_events.url
}

output "rds_endpoints" {
  description = "RDS endpoints for each service"
  value = {
    users    = aws_db_instance.users.endpoint
    products = aws_db_instance.products.endpoint
    orders   = aws_db_instance.orders.endpoint
  }
}
