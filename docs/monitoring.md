## 📝 `docs/monitoring.md` (Monitoring and Logging) (Updated)

### 1. Overview

[cite_start]The JUCR POI Service requires high observability to guarantee the reliability and accuracy of the data ingestion process[cite: 8]. This strategy includes comprehensive logging, real-time queue monitoring, and modern metric collection using established industry standards.

### 2. Logging Strategy

[cite_start]The application utilizes **NestJS's built-in Logger** to output structured logs to `stdout`[cite: 20].

* [cite_start]**Log Aggregation:** In a Kubernetes environment, these logs are collected by an agent (e.g., Fluentd) and shipped to a centralized platform like the **ELK Stack, Loki, or Datadog**[cite: 20]. This centralization enables:
    * Full-text search and analysis across all worker instances.
    * Error rate alerting based on log severity levels.
* [cite_start]**Key Log Events:** All critical steps are logged, including job processing, creation, updates, and errors[cite: 20].

### 3. Real-Time Monitoring (Metrics)

Metric collection ensures proactive detection of performance bottlenecks and service degradation.

#### A. Prometheus and Grafana

| Tool | Role | Implementation |
| :--- | :--- | :--- |
| **Prometheus** | Metric Collection & Storage | An exporter library (e.g., `prom-client`) is integrated into the NestJS application to expose key metrics like CPU usage, memory consumption, and API response times via a dedicated `/metrics` endpoint. |
| **Grafana** | Visualization & Dashboards | Connected to Prometheus, Grafana provides real-time dashboards for operational visibility. Critical metrics like worker pod health, Redis resource usage, and application throughput are visualized here. |

#### B. Queue Health Monitoring (Bull)

[cite_start]Monitoring the asynchronous workflow is paramount for reliability[cite: 20].

* [cite_start]**Dedicated UI:** A monitoring UI like **`Arena`** or **`BullMQ-UI`** is deployed[cite: 20].
* **Key Observables:** This UI provides real-time visibility into the:
    * [cite_start]Number of jobs **Waiting** (indicating potential worker shortage)[cite: 20].
    * [cite_start]Number of jobs **Completed** and **Failed**[cite: 20].
    * [cite_start]Ability to **manually inspect, retry, or remove failed jobs**[cite: 20].

### 4. Change Data Capture (CDC) Readiness

Although this service is a headless writer, we acknowledge the need for other services (e.g., a GraphQL Read API, Search Indexer) to react to data changes in real-time.

* **Debezium and Kafka:** The architecture is designed to support **Change Data Capture (CDC)** using **Debezium** connectors against MongoDB, streaming all `INSERT`, `UPDATE`, and `DELETE` events to an **Apache Kafka** topic.
* **Benefit:** This creates an event-driven architecture, enabling downstream services to consume data changes instantly without continuously polling the MongoDB database.

### 5. Alerting

High-priority alerts must be configured in Prometheus/Grafana or the centralized logging platform:

* **Critical Alerts:** Alert if the **Failed Jobs count** exceeds a critical threshold or if application liveness probes fail.
* [cite_start]**Performance Alerts:** Alert if **Queue Latency** (job waiting time) exceeds the service-level objective (SLO), signaling a need to horizontally scale the worker pods[cite: 29].
