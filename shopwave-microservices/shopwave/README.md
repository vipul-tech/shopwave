# ShopWave — Microservices E-Commerce Platform

A production-ready, interview-grade microservices application built with
**Java 21 · Spring Boot 3 · MySQL · AWS**.

---

## Architecture

```
React Frontend (S3 + CloudFront)
        │
        ▼
AWS API Gateway  (JWT auth, rate limiting, routing)
        │
   ┌────┴──────────────────────────┐
   │                               │
User Service    Product Service    Order Service    Notification Service
(port 8081)      (port 8082)       (port 8083)          (port 8084)
   │                 │                 │                     │
RDS MySQL        RDS MySQL         RDS MySQL             AWS SES/SNS
users_db         products_db       orders_db          ◄── AWS SQS
```

## Services

| Service | Responsibility | Key Tech |
|---------|---------------|----------|
| **User Service** | Auth, JWT, user profiles | Spring Security, JWT, BCrypt |
| **Product Service** | Catalog, inventory, search | Spring Data JPA, pagination |
| **Order Service** | Cart, orders, payments | State machine, event publishing |
| **Notification Service** | Email/SMS on events | SQS consumer, AWS SES |

## Tech Stack

- **Java 21** — virtual threads, records, sealed classes
- **Spring Boot 3.2** — web, security, data JPA, validation
- **MySQL 8** — per-service databases (database-per-service pattern)
- **Docker + Docker Compose** — local development
- **AWS ECS Fargate** — container orchestration
- **AWS RDS** — managed MySQL
- **AWS API Gateway** — API management
- **AWS SQS** — async event messaging
- **AWS SES** — transactional email
- **AWS CloudFront + S3** — React frontend hosting
- **AWS CodePipeline** — CI/CD
- **Terraform** — infrastructure as code

## Running Locally

### Prerequisites
- Java 21+, Maven 3.9+, Docker, Node 18+

### Start all services

```bash
# Start databases + infrastructure
docker-compose up -d

# Start each service (separate terminals)
cd user-service    && mvn spring-boot:run
cd product-service && mvn spring-boot:run
cd order-service   && mvn spring-boot:run
cd notification-service && mvn spring-boot:run

# Start frontend
cd frontend && npm install && npm run dev
```

### Default credentials
- Admin: `admin@shopwave.com / Admin@1234`
- DB: `root / shopwave123`

## API Summary

### User Service (8081)
- `POST /api/users/register` — Register
- `POST /api/users/login` — Login → JWT
- `GET  /api/users/profile` — Own profile (JWT)
- `PUT  /api/users/profile` — Update profile

### Product Service (8082)
- `GET  /api/products` — List (paginated, filterable)
- `GET  /api/products/{id}` — Detail
- `POST /api/products` — Create (ADMIN)
- `PUT  /api/products/{id}` — Update (ADMIN)
- `DELETE /api/products/{id}` — Delete (ADMIN)

### Order Service (8083)
- `POST /api/cart/items` — Add to cart
- `GET  /api/cart` — View cart
- `POST /api/orders` — Place order
- `GET  /api/orders` — My orders
- `GET  /api/orders/{id}` — Order detail
- `PATCH /api/orders/{id}/cancel` — Cancel order

### Notification Service (8084)
- `GET  /api/notifications` — My notifications
- Internal SQS consumer — triggered by order events

## AWS Deployment

```bash
cd infrastructure/terraform
terraform init
terraform plan -var-file=prod.tfvars
terraform apply
```

See `infrastructure/README.md` for full deployment guide.

## Interview Topics Covered

- **Database-per-service** pattern with separate RDS instances
- **JWT authentication** across services via shared secret
- **Async messaging** with SQS (Order → Notification)
- **API Gateway** for routing, auth, and rate limiting
- **Circuit breaker** pattern (Resilience4j ready)
- **Health checks** and readiness probes for ECS
- **Blue/green deployment** via CodeDeploy
- **Secrets management** via AWS Secrets Manager
- **Infrastructure as Code** with Terraform
- **Docker multi-stage builds** for minimal image size
- **Pagination and filtering** in product search
- **Optimistic locking** in order service
- **Global exception handling** and RFC 7807 problem details
