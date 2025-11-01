# JUCR POI Importer Service

**The JUCR POI Importer Service** is a high-performance, **headless** NestJS backend service dedicated to the reliable and scalable ingestion of Point of Interest (POI) data for electric vehicle charging stations from the [OpenChargeMap (OCM) API](https://openchargemap.org/site/develop/api).

This project is architected as a robust "worker" service, utilizing a **Redis-backed queue system (Bull)** to handle intensive, long-running data import tasks asynchronously, ensuring resilience and preventing HTTP timeouts.

## 🎯 Project Overview & Role

This microservice acts as the **Single Source of Truth** for all charging station locations, specifications, and availability data within the JUCR platform. Its sole responsibility is to import and persist this critical data, ready for consumption by downstream services like mobile applications and routing algorithms.

**➡️ [Full Project Overview and Goals](docs/project-overview.md)**

## ✨ Core Features & Technical Rationale

| Feature | Description | Rationale |
| :--- | :--- | :--- |
| **Resilient Import** | Fetches thousands of POIs (up to 50,000+ records) with a single, optimized API call. | Minimizes external API interactions and optimizes rate limits. |
| **Background Processing** | Uses **Redis & Bull** to process data **asynchronously** after fetching. | Crucial for avoiding HTTP timeouts on long-running tasks and guaranteeing reliability. |
| **Idempotent Updates (Upsert)** | The import process is idempotent. It uses `updateOne` with `upsert: true` based on the unique `ocmId`. | Safely updates existing records and prevents duplicates, allowing the import to be safely re-run. |
| **Headless Architecture** | This service has **no Read API** (e.g., no `GET /pois`). Its focus is 100% on the data import and persistence logic. | Aligns with the technical challenge requirement to focus solely on the implementation of the data import part. |

## ⚙️ Technical Stack

| Category | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | [NestJS](https://nestjs.com/) | Provides a modular, testable, and maintainable structure based on TypeScript. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Ensures strong type checking and high code quality. |
| **Database (Primary)** | [MongoDB](https://www.mongodb.com/) (Mongoose) | Ideal for storing complex, semi-structured POI JSON documents. |
| **Database (Queue)** | [Redis](https://redis.io/) (Bull) | For robust, durable, and asynchronous job queuing and management. |
| **Containerization** | [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) | For consistent local development environment setup. |

**➡️ [Detailed Architectural and Scalability Rationale](docs/architecture.md)**

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/en/) (v18+ recommended)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for MongoDB and Redis)
* `npm` or `yarn`

### 1. Clone the Repository

```bash
git clone [https://github.com/osmanozden/jucr-poi-service.git](https://github.com/osmanozden/jucr-poi-service.git)
cd jucr-poi-service
````

### 2\. Install Dependencies

```bash
npm install
```

### 3\. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000

# OpenChargeMap API
OCM_API_URL=[https://api.openchargemap.io/v3/poi](https://api.openchargemap.io/v3/poi)
OCM_API_KEY=ff82541f-c8d1-4507-be67-bd07e3259c4e # Key provided in the challenge

# MongoDB (from Docker Compose)
MONGO_URI=mongodb://localhost:27017/jucr-poi-db

# Redis (from Docker Compose)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4\. Start Databases (Docker)

```bash
docker-compose up -d
```

### 5\. Start the Application

```bash
npm run start:dev
```

-----

## 🛠️ Usage: Triggering the Import

The service exposes only one primary endpoint to trigger the process.

### `GET /import`

Triggers the asynchronous import and processing of all POIs for a specified country.

  * **Query Parameter:** `countryCode` (The 2-letter ISO code for the country, e.g., `DE`, `NL`).

**cURL Example:**

```bash
curl --location --globoff 'http://localhost:3000/import?countryCode={{countryCode}}'
```

**Example Successful Response (202 Accepted):**

```json
{
  "message": "Import process successfully initiated for DE. Processing will continue in the background.",
  "data": {
    "status": "success",
    "queue_name": "poi-import",
    "approx_jobs_queued": 49850 
  }
}
```

**➡️ [Full API Documentation and GraphQL Integration Strategy](https://www.google.com/search?q=docs/api.md)**

-----

## 💾 Database and Data Layer

The data is stored in MongoDB, employing a strict schema design.

  * **Primary Key:** **UUIDv4** is used for the `_id` key on every document.
  * **Indexing:** The unique index on **`ocmId`** is **critical** for the performance of the idempotent upsert logic.

**➡️ [Detailed Database Schema and Indexing Strategies](https://www.google.com/search?q=docs/database-schema.md)**

-----

## ☁️ Deployment and Monitoring

### Deployment (Kubernetes Readiness)

The service is designed for deployment in a production-grade **Kubernetes (K8s) cluster**. Resources required include K8s `Deployment` for the application, `StatefulSet` for MongoDB/Redis, and `Secret`/`ConfigMap` for configuration.

**➡️ [Required Deployment Instructions and K8s Resources](https://www.google.com/search?q=docs/deployment.md)**

### Monitoring and Reliability

The service is built with high observability to guarantee data accuracy and ingestion reliability.

  * **Logging:** Structured logs are centralized in platforms like ELK/Loki/Datadog.
  * **Queue Monitoring:** **BullMQ-UI / Arena** is used for real-time visibility into the queue's health (Waiting, Completed, Failed jobs).

**➡️ [Monitoring, Logging, and Alerting Strategy](https://www.google.com/search?q=docs/monitoring.md)**

-----

## 🧪 Testing

The project includes both unit and end-to-end (E2E) tests.

  * **Unit Tests:** Validate the logic of the `ImporterService` in isolation.
  * **E2E Tests:** Verifies the entire request flow for the `GET /import/{countryCode}` endpoint.

### Running Tests

```bash
# Run Unit Tests
npm run test

# Run End-to-End (E2E) Tests
npm run test:e2e
```