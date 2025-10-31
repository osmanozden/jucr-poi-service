# JUCR POI Service

[](https://opensource.org/licenses/MIT)

The JUCR POI Service is a high-performance NestJS backend designed to import, store, and serve Point of Interest (POI) data for charging stations from the [OpenChargeMap (OCM) API](https://www.google.com/search?q=https://openchargemap.org/site/develop/api).

This project is architected to handle intensive, long-running tasks—such as importing thousands of data entries—without blocking the main server thread or compromising its ability to respond to requests, achieved through a robust Redis-backed queue system.

## Core Features

  * **Resilient Data Import:** Fetches thousands of POIs with a single API call.
  * **Background Job Processing:** Uses **Redis & Bull** to process data asynchronously, preventing HTTP timeouts.
  * **Smart Updates (Upsert):** The import operation is idempotent, ensuring data is always current and safe to re-run.
  * **Clean Architecture:** Strictly separates concerns into `ImporterModule` (Write Logic) and `PoiModule` (Read Logic).
  * **Strict Data Schema:** Maps raw external API data to a clean, validated, and strict internal model (`poi.schema.ts`).
  * **Dynamic API Documentation:** All endpoints are automatically documented and interactive via **Swagger** (`/api`).
  * **Request Validation:** Incoming requests are validated using `class-validator`.
  * **Security:** Secured with `helmet` for HTTP header protection.

## Tech Stack

  * **Framework:** [NestJS](https://nestjs.com/)
  * **Language:** [TypeScript](https://www.typescriptlang.org/)
  * **Database (Primary):** [MongoDB](https://www.mongodb.com/) (with Mongoose)
  * **Database (Queue):** [Redis](https://redis.io/) (with Bull)
  * **Containerization:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
  * **API Documentation:** [Swagger](https://swagger.io/)
  * **Validation:** `class-validator`, `class-transformer`

-----

## Architectural & Technology Rationale

The technology choices for this project were made to ensure scalability, resilience, and maintainability.

  * **Why NestJS?**
    NestJS provides a powerful, modular architecture out-of-the-box. Its use of TypeScript, Dependency Injection (DI), and decorators allows for highly testable and decoupled code. Separating the application into a `PoiModule` and `ImporterModule` is a clean implementation of this principle.

  * **Why MongoDB?**
    The data from the OCM API is complex, nested, and semi-structured JSON. MongoDB (a NoSQL document database) is perfectly suited to store this kind of data. We initially use its flexibility (`strict: false`) to prototype and then lock it down (`strict: true`) to enforce a clean, predictable data structure, giving us the best of both worlds.

  * **Why Redis & Bull (Queue System)?**
    This is the **most critical** architectural decision. Fetching and saving 50,000+ records from an external API *cannot* be done in a single HTTP request; it would time out.

      * **Decoupling:** The `ImporterService`'s only job is to *enqueue* jobs to Redis. This is extremely fast and returns an immediate response to the user.
      * **Resilience:** The `ImporterProcessor` (a separate worker) pulls jobs from the queue. If the server crashes, the jobs remain safe in Redis, and processing resumes automatically on restart.
      * **Rate Limiting & Retries:** Bull allows us to control how many jobs are processed concurrently and automatically retries failed jobs.

  * **Why Docker Compose?**
    To guarantee that all developers (and production environments) run the exact same versions of MongoDB and Redis. It provides a one-command (`docker-compose up -d`) setup for all required services.

  * **Why a Strict Schema (`strict: true`)?**
    Relying on a third-party API's data structure (`strict: false`) is fragile. If OCM changes a field name (e.g., `AddressInfo.Title` -\> `Address.Name`), our Read API (`GET /pois`) would break. By mapping the raw data to our own strict `Poi` model in the `ImporterProcessor`, we decouple our service from the external API. Our database remains clean, and our API remains stable.

-----

## Getting Started

### Prerequisites

  * [Node.js](https://nodejs.org/en/) (v18+ recommended)
  * [Docker Desktop](https://www.docker.com/products/docker-desktop/) (to run MongoDB and Redis)
  * `npm`
  * `curl` (for testing examples)

### 1\. Clone the Repository

```bash
git clone https://github.com/osmanozden/jucr-poi-service
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
The Swagger UI will be available at `http://localhost:3000/api`.

-----

## API Endpoints & cURL Examples

All endpoints can also be tested from the Swagger UI at `http://localhost:3000/api`.

### 1\. Import Module

These endpoints are used to trigger the data import process.

#### `GET /import/{countryCode}`

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

### 2\. POI Module

These endpoints are used to read the POI data from the database.

#### `GET /pois`

Lists all POIs from the database with pagination.

  * **Query Parameters:**
      * `limit` (optional, default: 20, max: 100)
      * `skip` (optional, default: 0)

**cURL Example (Get first 5 results):**

```bash
curl -X GET "http://localhost:3000/pois?limit=5&skip=0"
```

**Example Response (Success):**

```json
{
  "data": [
    {
      "_id": "b1a3e...",
      "ocmId": 12345,
      "status": "Operational",
      "address": {
        "title": "E-Charge Station Berlin",
        "town": "Berlin",
        "stateOrProvince": "Berlin",
        "country": "Germany"
      }
    }
    // ... 4 more items
  ],
  "total": 49850,
  "limit": 5,
  "skip": 0
}
```

#### `GET /pois/id/{id}`

Retrieves a single POI by its internally generated UUID.

**cURL Example:**

```bash
curl -X GET http://localhost:3000/pois/id/YOUR_COPIED_UUID_FROM_ABOVE_LIST
```

#### `GET /pois/ocm/{ocmId}`

Retrieves a single POI by its original OCM ID.

**cURL Example:**

```bash
curl -X GET http://localhost:3000/pois/ocm/158245
```

**Example Response (Success):**

```json
{
  "_id": "b1a3e...",
  "ocmId": 158245,
  "status": "Operational",
  "dateLastStatusUpdate": "2025-10-30T...",
  "address": {
    "title": "Rathausplatz",
    "addressLine1": "Rathausplatz 1",
    "town": "Erlangen",
    // ... all mapped fields
  },
  "connections": [
    {
      "connectionType": "Type 2 (Socket Only)",
      "powerKW": 22,
      "currentType": "AC (3-Phase)",
      "quantity": 2
    }
  ]
}
```