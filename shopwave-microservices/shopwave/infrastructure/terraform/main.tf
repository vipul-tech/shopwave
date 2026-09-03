##############################################################################
# ShopWave — AWS Infrastructure (Terraform)
# Deploys: VPC, ECS Fargate, RDS MySQL, SQS, ALB, ECR, Secrets Manager
##############################################################################

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Store state in S3 (uncomment for team use)
  # backend "s3" {
  #   bucket = "shopwave-terraform-state"
  #   key    = "prod/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

##############################################################################
# VPC & Networking
##############################################################################

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.project}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

# Public subnets (ALB lives here)
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "${var.project}-public-${count.index}" }
}

# Private subnets (ECS tasks + RDS live here)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "${var.project}-private-${count.index}" }
}

# NAT Gateway so private subnets can reach internet (e.g. pull ECR images)
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "${var.project}-nat" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

data "aws_availability_zones" "available" { state = "available" }

##############################################################################
# Security Groups
##############################################################################

resource "aws_security_group" "alb" {
  name   = "${var.project}-alb-sg"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name   = "${var.project}-ecs-sg"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 8081
    to_port         = 8084
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  # Allow inter-service communication within VPC
  ingress {
    from_port = 8081
    to_port   = 8084
    protocol  = "tcp"
    self      = true
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds" {
  name   = "${var.project}-rds-sg"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
}

##############################################################################
# ECR Repositories (one per service)
##############################################################################

resource "aws_ecr_repository" "services" {
  for_each             = toset(["user-service", "product-service", "order-service", "notification-service"])
  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

##############################################################################
# RDS MySQL (one per service — database-per-service pattern)
##############################################################################

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "users" {
  identifier           = "${var.project}-users-db"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = var.db_instance_class
  allocated_storage    = 20
  db_name              = "users_db"
  username             = "admin"
  password             = random_password.db_password["users"].result
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = false
  final_snapshot_identifier = "${var.project}-users-db-final"
  backup_retention_period   = 7
  multi_az                  = var.environment == "prod"
  tags = { Name = "${var.project}-users-db" }
}

resource "aws_db_instance" "products" {
  identifier           = "${var.project}-products-db"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = var.db_instance_class
  allocated_storage    = 20
  db_name              = "products_db"
  username             = "admin"
  password             = random_password.db_password["products"].result
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = false
  final_snapshot_identifier = "${var.project}-products-db-final"
  backup_retention_period   = 7
  multi_az                  = var.environment == "prod"
  tags = { Name = "${var.project}-products-db" }
}

resource "aws_db_instance" "orders" {
  identifier           = "${var.project}-orders-db"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = var.db_instance_class
  allocated_storage    = 20
  db_name              = "orders_db"
  username             = "admin"
  password             = random_password.db_password["orders"].result
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = false
  final_snapshot_identifier = "${var.project}-orders-db-final"
  backup_retention_period   = 7
  multi_az                  = var.environment == "prod"
  tags = { Name = "${var.project}-orders-db" }
}

resource "random_password" "db_password" {
  for_each = toset(["users", "products", "orders"])
  length   = 24
  special  = false
}

##############################################################################
# Secrets Manager — store DB passwords and JWT secret
##############################################################################

resource "aws_secretsmanager_secret" "db_passwords" {
  for_each = toset(["users", "products", "orders"])
  name     = "${var.project}/${var.environment}/${each.key}-db-password"
}

resource "aws_secretsmanager_secret_version" "db_passwords" {
  for_each  = toset(["users", "products", "orders"])
  secret_id = aws_secretsmanager_secret.db_passwords[each.key].id
  secret_string = jsonencode({
    password = random_password.db_password[each.key].result
  })
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project}/${var.environment}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({ secret = var.jwt_secret })
}

##############################################################################
# SQS — Order Events Queue + Dead Letter Queue
##############################################################################

resource "aws_sqs_queue" "order_events_dlq" {
  name                      = "${var.project}-order-events-dlq"
  message_retention_seconds = 1209600  # 14 days
  tags = { Name = "${var.project}-order-events-dlq" }
}

resource "aws_sqs_queue" "order_events" {
  name                       = "${var.project}-order-events"
  message_retention_seconds  = 86400   # 1 day
  visibility_timeout_seconds = 60      # Must be > processing time
  receive_wait_time_seconds  = 20      # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_events_dlq.arn
    maxReceiveCount     = 3            # Move to DLQ after 3 failures
  })

  tags = { Name = "${var.project}-order-events" }
}

##############################################################################
# ECS Cluster + Task Definitions + Services
##############################################################################

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

# IAM role for ECS tasks — allows pulling from ECR + writing to CloudWatch
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project}-ecs-task-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM role for the task itself — SQS + SES + Secrets Manager access
resource "aws_iam_role" "ecs_task" {
  name = "${var.project}-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${var.project}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [aws_sqs_queue.order_events.arn, aws_sqs_queue.order_events_dlq.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project}/*"
      }
    ]
  })
}

# CloudWatch log groups
resource "aws_cloudwatch_log_group" "services" {
  for_each          = toset(["user-service", "product-service", "order-service", "notification-service"])
  name              = "/ecs/${var.project}/${each.key}"
  retention_in_days = 30
}

# ── User Service Task Definition ──────────────────────────────────────────────
data "aws_caller_identity" "current" {}

resource "aws_ecs_task_definition" "user_service" {
  family                   = "${var.project}-user-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "user-service"
    image     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project}/user-service:${var.image_tag}"
    essential = true
    portMappings = [{ containerPort = 8081, protocol = "tcp" }]
    environment = [
      { name = "SPRING_DATASOURCE_URL",      value = "jdbc:mysql://${aws_db_instance.users.endpoint}/users_db?useSSL=true&serverTimezone=UTC" },
      { name = "SPRING_DATASOURCE_USERNAME", value = "admin" },
      { name = "JWT_EXPIRATION",             value = "86400000" }
    ]
    secrets = [
      { name = "SPRING_DATASOURCE_PASSWORD", valueFrom = "${aws_secretsmanager_secret.db_passwords["users"].arn}:password::" },
      { name = "JWT_SECRET",                 valueFrom = "${aws_secretsmanager_secret.jwt_secret.arn}:secret::" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project}/user-service"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:8081/api/actuator/health || exit 1"]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "user_service" {
  name            = "${var.project}-user-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.user_service.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.user_service.arn
    container_name   = "user-service"
    container_port   = 8081
  }

  depends_on = [aws_lb_listener.http]
}

##############################################################################
# Application Load Balancer
##############################################################################

resource "aws_lb" "main" {
  name               = "${var.project}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "user_service" {
  name        = "${var.project}-users-tg"
  port        = 8081
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/api/actuator/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }
}

resource "aws_lb_target_group" "product_service" {
  name        = "${var.project}-products-tg"
  port        = 8082
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path     = "/api/actuator/health"
    interval = 30
  }
}

resource "aws_lb_target_group" "order_service" {
  name        = "${var.project}-orders-tg"
  port        = 8083
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path     = "/api/actuator/health"
    interval = 30
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "ShopWave API Gateway"
      status_code  = "200"
    }
  }
}

# Path-based routing rules
resource "aws_lb_listener_rule" "user_service" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10
  condition {
    path_pattern { values = ["/api/users/*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.user_service.arn
  }
}

resource "aws_lb_listener_rule" "product_service" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20
  condition {
    path_pattern { values = ["/api/products/*", "/api/products"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.product_service.arn
  }
}

resource "aws_lb_listener_rule" "order_service" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30
  condition {
    path_pattern { values = ["/api/orders/*", "/api/cart/*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.order_service.arn
  }
}

##############################################################################
# Auto Scaling for ECS Services
##############################################################################

resource "aws_appautoscaling_target" "user_service" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.user_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "user_service_cpu" {
  name               = "${var.project}-user-service-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.user_service.resource_id
  scalable_dimension = aws_appautoscaling_target.user_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.user_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
