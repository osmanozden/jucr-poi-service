Anlaşıldı müdür. O zaman `README.md`'deki klonlama komutunu senin verdiğin repo adresiyle güncelliyorum.

İşte `README.md`'nin **son ve güncel** hali:

-----

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
    The data from the OCM API is complex, nested, and semi-structured JSON. MongoDB (a NoSQL document database) is perfectly suited to store this kind of data. We enforce a `strict: true` schema to ensure our database remains clean and predictable.

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

### 5\. Start the Application

```bash
npm run start:dev
```

The application will be available at `http://localhost:3000`.

-----

## Usage: Triggering the Import

This service is a **headless importer**. Its sole responsibility is to populate the database. As per the technical challenge requirements, it **does not** provide any "Read" API endpoints (e.g., `GET /pois`).

The *only* endpoint available is used to trigger the import process.

### `GET /import/{countryCode}`

Triggers the asynchronous import and processing of all POIs for a specific country.

  * **`{countryCode}`:** The 2-letter ISO code for the country (e.g., `DE`, `NL`, `FR`).

**cURL Example (Import Germany):**

```bash
curl -X GET http://localhost:3000/import/de
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