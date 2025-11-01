## 📝 `docs/deployment.md` (Deployment Instructions)

### 1. Overview

While the local development environment is provided via `docker-compose` , this document outlines the necessary resources and configuration required to deploy the JUCR POI Importer Service to a production-grade environment, specifically a **Kubernetes (K8s) cluster**.

**Note:** The actual Kubernetes manifest files are not required; only the documentation of the required resources is necessary.

### 2. Application Containerization

The service must first be packaged as a container image.

* **Resource Required:** **`Dockerfile`**
* **Purpose:** A standard multi-stage `Dockerfile` is included in the project to containerize the TypeScript application into a lightweight, runnable image. This image will be the basis for the K8s Deployment.

### 3. Kubernetes Resources (Application Layer)

These resources manage the deployment and exposure of the stateless Importer Service application.

| K8s Resource | Description | Rationale |
| :--- | :--- | :--- |
| **Deployment** | Manages the desired state for the application pods (e.g., image version, resource limits, readiness/liveness probes). | Allows for **horizontal scaling** by configuring a `replicas` count greater than one, ensuring high capacity for concurrent job processing. |
| **Service (LoadBalancer/ClusterIP)** | Exposes the `Deployment` to external or internal traffic. | An ingress point is required for the `GET /import/{countryCode}` endpoint to be accessed and trigger the import process. A `LoadBalancer` is ideal for external exposure. |
| **Horizontal Pod Autoscaler (HPA)** | (Recommended) Automatically adjusts the number of replicas based on CPU usage or custom metrics (e.g., Redis queue length). | Enhances scalability and cost efficiency by scaling processing power to meet the varying load of data imports. |

### 4. Kubernetes Resources (Persistence Layer)

MongoDB and Redis are critical components for data persistence and the queuing system. They require mechanisms to ensure data is not lost.

| K8s Resource | Component | Rationale |
| :--- | :--- | :--- |
| **StatefulSet** | MongoDB & Redis | Unlike the stateless application, these databases require stable network identifiers and ordered deployment/scaling. `StatefulSet` is the standard approach for persistence-required applications. |
| **PersistentVolumeClaim (PVC)** | MongoDB & Redis | Must be configured to request physical storage space. This ensures that the actual data (POI documents in MongoDB, and jobs in Redis) persists even if the pods are restarted, failed, or moved to a different node. |

### 5. Configuration and Secrets Management

All connection strings, API keys, and configurations must be securely managed and injected into the application pods.

| K8s Resource | Environment Variable Examples | Rationale |
| :--- | :--- | :--- |
| **Secret** | `OCM_API_KEY`, `MONGO_URI` | For sensitive information, `Secret` resources ensure that values are not exposed in clear text within configuration files or logs. |
| **ConfigMap** | `OCM_API_URL`, `REDIS_HOST`, `PORT` | For non-sensitive configuration parameters, `ConfigMap` allows for easy injection into the application `Deployment` manifest. |