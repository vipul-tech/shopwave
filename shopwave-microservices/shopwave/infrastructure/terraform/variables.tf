variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "shopwave"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "service_desired_count" {
  description = "Desired number of ECS task replicas per service"
  type        = number
  default     = 1
}

variable "image_tag" {
  description = "Docker image tag to deploy (usually git commit SHA)"
  type        = string
  default     = "latest"
}

variable "jwt_secret" {
  description = "JWT signing secret (min 256 bits)"
  type        = string
  sensitive   = true
}
