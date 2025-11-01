# JUCR POI Service

[](https://opensource.org/licenses/MIT)

The JUCR POI Service is a high-performance, headless NestJS backend service designed exclusively to import, process, and store Point of Interest (POI) data for charging stations from the [OpenChargeMap (OCM) API](https://openchargemap.org/site/develop/api).

This project is architected as a robust "worker" service. It handles intensive, long-running data import tasks without blocking or failing, using a resilient Redis-backed queue system.

## Core Features

  * **Resilient Data Import:** Fetches thousands of POIs with a single API call.
  * **Background Job Processing:** Uses **Redis & Bull** to process data asynchronously, preventing HTTP timeouts and ensuring reliability.
  * **Smart Updates (Upsert):** The import process is idempotent. It updates existing records, ensuring data is always current and the import is safe to re-run.
  * **Focused Architecture:** This is a **headless service** (no Read API) focusing 100% on the "Implementation Part" (data import) as specified by the technical challenge.
  * **Strict Data Schema:** Maps raw external API data to a clean, defined, and strict internal model (`poi.schema.ts`) before persistence.
  * **Security:** Secured with `helmet` for HTTP header protection.

## Tech Stack

  * **Framework:** [NestJS](https://nestjs.com/)
  * **Language:** [TypeScript](https://www.typescriptlang.org/)
  * **Database (Primary):** [MongoDB](https://www.mongodb.com/) (with Mongoose)
  * **Database (Queue):** [Redis](https://redis.io/) (with Bull)
  * **Containerization:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

## Architectural & Technology Rationale

The technology choices for this project were made to ensure scalability, resilience, and maintainability.

  * **Why NestJS?**
    NestJS provides a powerful, modular architecture. Its use of TypeScript and Dependency Injection (DI) allows for highly testable and decoupled code. This allowed us to cleanly separate the HTTP trigger (`ImporterController`) from the API client (`ImporterService`) and the database worker (`ImporterProcessor`).

  * **Why MongoDB?**
    The data from the OCM API is complex, nested, and semi-structured JSON. MongoDB (a NoSQL document database) is perfectly suited to store this kind of data. We enforce a `strict: true` schema to ensure our database remains clean and predictable. We also use UUIDs (v4) as the `_id` key as requested.

  * **Why Redis & Bull (Queue System)?**
    This is the **most critical** architectural decision. Fetching and saving 50,000+ records *cannot* be done in a single HTTP request.

      * **Decoupling:** The `ImporterService`'s only job is to *enqueue* jobs to Redis. This is extremely fast and returns an immediate response to the user.
      * **Resilience:** The `ImporterProcessor` (worker) pulls jobs from the queue. If the server crashes, the jobs remain safe in Redis, and processing resumes automatically on restart.
      * **Retries:** Bull automatically retries failed jobs, ensuring data integrity.

  * **Why Docker Compose?**
    To guarantee that all developers run the exact same versions of MongoDB and Redis. It provides a one-command (`docker-compose up -d`) setup for all required services.

  * **Why a Strict Schema (`strict: true`)?**
    Relying on a third-party API's data structure is fragile. By mapping the raw data to our own strict `Poi` model in the `ImporterProcessor`, we decouple our service from the external API and ensure our database remains clean.

-----

## Getting Started

### Prerequisites

  * [Node.js](https://nodejs.org/en/) (v18+ recommended)
  * [Docker Desktop](https://www.docker.com/products/docker-desktop/) (to run MongoDB and Redis)
  * `npm`
  * `curl` (for testing examples)

### 1\. Clone the Repository

```bash
git clone https://github.com/osmanozden/jucr-poi-service.git
cd jucr-poi-service
```

### 2\. Install Dependencies

```bash
npm install
```

### 3\. Set Up Environment Variables

Create a file named `.env` in the project root directory.

```env
# Server
PORT=3000

# OpenChargeMap API
OCM_API_URL=https://api.openchargemap.io/v3/poi
OCM_API_KEY=ff82541f-c8d1-4507-be67-bd07e3259c4e

# MongoDB (from Docker Compose)
MONGO_URI=mongodb://localhost:27017/jucr-poi-db

# Redis (from Docker Compose)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4\. Launch Databases (Docker)

```bash
docker-compose up -d
```

This command uses the provided `docker-compose.yml` to start all required services for local development.

### 5\. Start the Application

```bash
npm run start:dev
```

The application will be available at `http://localhost:3000`.

-----

## Usage: Triggering the Import

This service is a **headless importer**. Its sole responsibility is to populate the database. As per the challenge requirements, it **does not** provide any "Read" API endpoints (e.g., `GET /pois`).

The *only* endpoint available is used to trigger the import process.

### `GET /import/{countryCode}`

Triggers the asynchronous import and processing of all POIs for a specific country.

  * **`{countryCode}`:** The 2-letter ISO code for the country (e.g., `DE`, `NL`, `FR`).

**cURL Example (Import Germany):**

```bash
curl --location --globoff 'http://localhost:3000/import?countryCode={{contryCode}}'
```

**Example Response (Success):**

```json
{
  "message": "Import process started for DE. See logs for details.",
  "data": {
    "status": "success",
    "queued": 49850
  }
}
```

-----

![Data Flow Diagram](./flow.png)

## Architecture & Data Flow

This service is architected for resilience and scalability. The data import process is decoupled from the initial HTTP request.

1.  A `GET /import/{countryCode}` request is received by the **`ImporterController`**.
2.  The `ImporterController` calls the **`ImporterService`**.
3.  The `ImporterService` fetches all POI data from the external **OpenChargeMap (OCM) API**.
4.  Instead of processing the data, the service iterates the list and enqueues *one job per POI* into the **Redis (Bull) Queue**. It then returns an immediate "success" response to the user.
5.  The **`ImporterProcessor`** (a separate worker) listens to the queue.
6.  For each job, the `ImporterProcessor` maps the raw OCM data to our clean `Poi` schema.
7.  It then performs an `updateOne()` operation with `upsert: true` against the **MongoDB Database**.
8.  If a job fails, Bull automatically retries it, ensuring data integrity.

This queue-based architecture ensures that the HTTP request never times out, and the data import can safely recover from server restarts or database connection issues.

## Database Documentation

### Schema

The database schema is defined in `src/importer/schemas/poi.schema.ts` using Mongoose.

We enforce `strict: true`, meaning only the fields explicitly defined in our `Poi` class are persisted to the database. This protects our application from external API changes and ensures our data remains clean and predictable.

The schema maps complex, nested OCM data into clean sub-documents:

  * `address` (Type: `PoiAddress`)
  * `connections` (Type: `PoiConnection[]`)

### Indexing Strategies

To ensure high-performance database operations, especially for the write-heavy `upsert` logic, we use the following indexing strategy:

  * **`_id: string (UUIDv4)`**: This is the primary key as requested. It is automatically indexed and unique.
  * **`ocmId: number`**: We have manually added `{ index: true, unique: true }`. This index is **critical** for the performance of the `ImporterProcessor`. The processor's main command is `updateOne({ ocmId: ... }, ...)`. This index allows MongoDB to *instantly* find the document to update, rather than performing a slow, full-collection scan for every single job.

## Deployment Instructions

While this project runs locally with `docker-compose`, it is designed to be deployed to a scalable environment like a Kubernetes (K8s) cluster.

Here are the documented resources required for such a deployment:

1.  **`Dockerfile`**: A `Dockerfile` is included to containerize this NestJS application.
2.  **K8s `Deployment`**: This resource will manage the NestJS application pods. It can be configured with a `replica` count to run multiple instances of the importer service, allowing for horizontal scaling.
3.  **K8s `Service`**: A `ClusterIP` or `LoadBalancer` service is required to expose the `Deployment` pods so they can receive HTTP requests (like `GET /import/de`).
4.  **`StatefulSet` (for MongoDB & Redis)**: Both MongoDB and Redis require persistent storage. They should be deployed as `StatefulSet` resources, backed by `PersistentVolumeClaim` (PVCs) to ensure data is not lost when pods restart.
5.  **K8s `ConfigMap` / `Secret`**: All environment variables from the `.env` file (like `MONGO_URI`, `REDIS_HOST`, and `OCM_API_KEY`) must be stored as `ConfigMap` or `Secret` resources and injected into the application `Deployment`.

## GraphQL Integration

As per the challenge requirements, this service **does not** implement any "Read" API endpoints.

However, the challenge asks how a **GraphQL** endpoint *would be* implemented to serve the data.

1.  A new `PoiModule` would be created.
2.  We would install `@nestjs/graphql` and configure the `GraphQLModule`.
3.  A `poi.resolver.ts` file would be created. This resolver would use `@Query()` decorators to define query operations (e.g., `pois`, `poiByOcmId`).
4.  The resolver would call a `PoiService`, which would fetch data from MongoDB.
5.  We would define GraphQL `@ObjectType()` classes that mirror our Mongoose `@Schema()` classes. This provides strong type-safety from the database all the way to the client.

GraphQL would be superior to a traditional REST API here, as it would allow clients to request *only* the specific fields they need from the complex, nested POI documents.

## Monitoring and Logging

Ensuring the reliability and accuracy of the data import is crucial.

  * **Logging**: The application uses NestJS's built-in `Logger`. All critical steps (job processing, creation, updates, and errors) are logged to `stdout`. In a Kubernetes environment, these logs would be automatically collected by a logging agent (like Fluentd) and aggregated in a centralized platform (like ELK Stack or Datadog) for analysis.
  * **Monitoring**: The most critical component to monitor is the **Bull queue**. To achieve this, a monitoring UI dashboard like **`Arena`** or **`BullMQ-UI`** should be implemented. This dashboard provides a real-time web interface to:
      * View the number of jobs waiting, completed, and failed.
      * Inspect failed jobs and their error messages.
      * Manually retry or remove failed jobs.
      * Monitor the health of the queue processor.

This monitoring capability is essential for managing the high volume of data and ensuring reliability.

## Testing

The project includes both unit and end-to-end (E2E) tests as required by the challenge.

  * **Unit Tests (`src/importer/importer.service.spec.ts`):** These tests validate the logic of the `ImporterService` in isolation. They mock the `HttpService` and the `Bull Queue` to ensure that:

    1.  The service correctly calls the OCM API.
    2.  The correct number of jobs are added to the queue when data is received.
    3.  No jobs are added to the queue if the API returns no data.

  * **End-to-End Tests (`test/app.e2e-spec.ts`):** This test spins up the entire NestJS application and mocks the `ImporterService` layer. It verifies that:

    1.  The `GET /import/{countryCode}` endpoint is correctly configured.
    2.  The `ImporterController` correctly calls the `ImporterService`.
    3.  The HTTP response structure (`message`, `data`) is correct.

### Running Tests

You can run the tests using the following `npm` scripts:

**1. Run Unit Tests:**
This command runs all `.spec.ts` files inside the `src` directory.

```bash
npm run test
```

**2. Run End-to-End (E2E) Tests:**
This command runs the E2E tests defined in the `test/` directory.

```bash
npm run test:e2e
```

**3. Run All Tests (Unit + E2E):**

```bash
npm run test && npm run test:e2e
```