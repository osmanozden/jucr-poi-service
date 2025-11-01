# JUCR POI Importer Service

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**The JUCR POI Importer Service** is a high-performance, **headless** NestJS backend service dedicated to the reliable and scalable ingestion of Point of Interest (POI) data for electric vehicle charging stations from the [OpenChargeMap (OCM) API](https://openchargemap.org/site/develop/api).

This project is architected as a robust "worker" service, utilizing a **Redis-backed queue system (Bull)** to handle intensive, long-running data import tasks asynchronously, ensuring resilience and preventing HTTP timeouts.

## 🎯 Project Overview & Role

This microservice acts as the **Single Source of Truth** for all charging station locations, specifications, and availability data within the JUCR platform. Its sole responsibility is to import and persist this critical data, ready for consumption by downstream services like mobile applications and routing algorithms.

## ✨ Key Features

| Feature | Description | Rationale |
| :--- | :--- | :--- |
| **Resilient Import** | Fetches thousands of POIs (up to 50,000+ records) with a single, optimized API call. | Minimizes external API interactions and optimizes rate limits. |
| **Background Processing** | Uses **Redis & Bull** to process data **asynchronously** after fetching. | Crucial for avoiding HTTP timeouts on long-running tasks and guaranteeing reliability. |
| **Idempotent Updates (Upsert)** | The import process is idempotent. It uses `updateOne` with `upsert: true` based on the unique `ocmId`. | Safely updates existing records and prevents duplicates, allowing the import to be safely re-run. |
| **Headless Architecture** | This service has **no Read API** (e.g., no `GET /pois`). Its focus is 100% on the data import and persistence logic. | Aligns with the technical challenge requirement to focus solely on the implementation of the data import part. |
| **Strict Data Schema** | Raw OCM data is mapped to a clean, strongly-typed internal MongoDB model (`poi.schema.ts`) using Mongoose with `strict: true`. | Decouples the service from the external API's structure and ensures data cleanliness. |
| **Horizontal Scalability** | The worker component (`ImporterProcessor`) is **stateless**, designed to be deployed with multiple replicas in Kubernetes to linearly scale processing throughput by increasing the replica count. | Future-proofs the service for rapidly growing global data volume. |

## ⚙️ Technical Stack

| Category | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | [NestJS](https://nestjs.com/) | Provides a modular, testable, and maintainable structure based on TypeScript. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Ensures strong type checking and high code quality. |
| **Database (Primary)** | [MongoDB](https://www.mongodb.com/) (Mongoose) | Ideal for storing complex, semi-structured POI JSON documents. |
| **Database (Queue)** | [Redis](https://redis.io/) (Bull) | For robust, durable, and asynchronous job queuing and management. |
| **Containerization** | [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) | For consistent local development environment setup. |

---

## 📐 Architecture and Data Flow

The core architecture is a queue-based worker model designed for decoupling and resilience.

1.  **Trigger:** A client sends a `GET /import/{countryCode}` request.
2.  **API Fetch & Enqueue:** The `ImporterService` fetches all POI data from the OCM API in one optimized request. It then immediately iterates over the results and enqueues **one job per POI object** into the **Redis Queue**.
3.  **Immediate Response:** The controller returns a **`202 Accepted`** response immediately to the client. The main application thread is **never blocked**.
4.  **Processing:** The separate, stateless **`ImporterProcessor`** (the worker) listens to the queue, pulls jobs, maps the raw OCM data to the clean internal schema, and performs the database operation.
5.  **Persistence:** The worker executes an **Upsert** (`updateOne` with `upsert: true` on the `ocmId`) against the **MongoDB database**.
6.  **Reliability:** If a job fails, Bull automatically handles **retries** to ensure data integrity.

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

This starts the necessary MongoDB and Redis services for local development.

### 5\. Start the Application

```bash
npm run start:dev
```

The application will be running at `http://localhost:3000`.

-----

## 🛠️ Usage: Triggering the Import

As a **headless importer**, the service exposes only one primary endpoint to trigger the process.

### `GET /import`

Triggers the asynchronous import and processing of all POIs for a specified country.

  * **Query Parameter:** `countryCode` (The 2-letter ISO code for the country, e.g., `DE`, `NL`).

**cURL Example:**

```bash
curl --location --globoff 'http://localhost:3000/import?countryCode=DE'
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

-----

## 💾 Database Documentation

### Schema Design Philosophy

  * **Database:** MongoDB (using Mongoose).
  * **Primary Key:** **UUIDv4** is used for the `_id` key on every document for horizontal scalability.
  * **Structure:** External OCM data is mapped to clean, self-contained sub-documents (e.g., `address`, `connections`).

### Indexing Strategy

A robust indexing strategy is essential for the high-volume **upsert** logic.

| Index Field | Type | Purpose |
| :--- | :--- | :--- |
| `_id` | Unique (Default) | Primary key index. |
| **`ocmId`** | **Unique Index** | **CRITICAL for Upsert Logic**. Allows MongoDB to instantly locate the document for updates, preventing slow full-collection scans for every incoming POI job. |

### GraphQL Read Service Readiness

While this service does not include a Read API, the data is structured for optimal consumption by a separate GraphQL Read Service. GraphQL prevents **over-fetching** by letting clients request only the fields they need from the complex POI documents.

-----

## ☁️ Deployment and Monitoring

### Deployment (Kubernetes Readiness)

The service is designed for deployment in a production-grade **Kubernetes (K8s) cluster**.

| K8s Resource | Component | Rationale |
| :--- | :--- | :--- |
| **Deployment** | Importer App | Manages the stateless application pods. Allows for **horizontal scaling** of worker replicas to increase processing throughput. |
| **Service (ClusterIP/LoadBalancer)** | Importer App | Exposes the application's `/import` endpoint. |
| **StatefulSet** | MongoDB & Redis | Used for the persistent databases, ensuring stable network IDs and ordered deployment. |
| **PersistentVolumeClaim (PVC)** | MongoDB & Redis | Guarantees that the POI data and the job queue data (in Redis) persist across pod restarts and failures. |
| **Secret** | `OCM_API_KEY`, `MONGO_URI` | Used to securely inject sensitive configuration values. |

### Monitoring and Reliability

The service is built with high observability to guarantee data accuracy and ingestion reliability.

| Component | Role | Rationale |
| :--- | :--- | :--- |
| **Logging** | Structured Logs to `stdout` | Logs are collected by an agent (e.g., Fluentd) and centralized in a platform (ELK/Loki/Datadog) for search and error analysis. |
| **Metrics** | Prometheus/Grafana | Exposes a dedicated `/metrics` endpoint to collect CPU, memory, and API response time metrics. |
| **Queue Monitoring** | **BullMQ-UI / Arena** | **CRITICAL:** A dedicated dashboard is used to provide real-time visibility into the queue: **Waiting, Completed, and Failed** job counts. This allows for proactive alerting and manual inspection/retries of failed jobs. |
| **Alerting** | Grafana/Prometheus | Alerts are configured for critical failure thresholds (e.g., failed jobs count exceeding SLO or Queue Latency increasing), signaling the need to scale worker pods. |

-----

## 🧪 Testing

The project includes both unit and end-to-end (E2E) tests as required by the challenge.

### Unit Tests (`src/importer/importer.service.spec.ts`)

Validate the logic of the `ImporterService` in isolation, ensuring the service correctly calls the OCM API and queues the correct number of jobs.

### End-to-End Tests (`test/app.e2e-spec.ts`)

Verifies the entire request flow: that the `GET /import/{countryCode}` endpoint is correctly configured, the controller delegates to the service, and the HTTP response structure is correct.

### Running Tests

```bash
# Run Unit Tests
npm run test

# Run End-to-End (E2E) Tests
npm run test:e2e
```

```
```