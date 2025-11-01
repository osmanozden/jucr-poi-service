## 📝 `docs/api.md` (API Documentation and GraphQL Integration)

### 1\. API Documentation: Importer Endpoint

The JUCR POI Service is architected as a **headless worker**. It is designed *only* to import and store data. Therefore, it implements only **one primary endpoint** to trigger the asynchronous import process.

#### Endpoint Details

| Attribute | Value |
| :--- | :--- |
| **Method** | `GET` |
| **Path** | `/import` |
| **Purpose** | Triggers the concurrent and scalable data import from the OpenChargeMap API. |
| **Authentication** | None required for this internal, trigger-only endpoint. |

#### Request Parameters (Query)

| Parameter | Type | Required | Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| `countryCode` | `String` | **Yes** | `DE`, `NL`, `FR` | The 2-letter ISO code for the country whose POIs are to be imported. |

#### Example Request

```bash
curl --location 'http://localhost:3000/import?countryCode=DE'
```

#### Example Success Response (202 Accepted)

The response is immediate, as the heavy data processing is immediately passed to the background queue.

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

### 2\. GraphQL Integration

As a headless importer service, this project **does not** implement the GraphQL endpoint itself. However, the documentation must describe **how** the GraphQL endpoint would be implemented to serve the imported charging station data.

The GraphQL implementation would reside in a separate **Reading Service** that queries the MongoDB data stored by this Importer Service.

#### Implementation Strategy

1.  **Module Creation:** A new `GraphQLModule` would be installed and configured in the **Reading Service** using `@nestjs/graphql`.
2.  **Schema Definition (Types):** Mongoose schemas (`Poi`, `PoiAddress`, `PoiConnection`) would be mirrored as **GraphQL Object Types (`@ObjectType()`)**. This ensures strong type-safety from the database all the way to the client.
3.  **Resolver Development:** A `PoiResolver` would be created. This resolver uses the `@Query()` decorator to define read operations.
      * **Example Query:**
        ```graphql
        query {
          pois(countryCode: "DE", limit: 10, offset: 0) {
            id
            title
            connections {
              powerKw
              connectionType
            }
          }
        }
        ```
4.  **Data Fetching:** The resolver would call a `PoiService` which directly queries the **MongoDB database** for the necessary data, leveraging the indices defined on `ocmId` and potentially geo-spatial indices for location-based queries.

#### Advantages of GraphQL

GraphQL is the superior choice for serving this data compared to a traditional REST API:

  * **Efficiency:** POI documents are complex and deeply nested. GraphQL prevents **over-fetching** by allowing clients to request *only* the specific fields they need (e.g., only `title` and `powerKw`), leading to smaller payload sizes and faster client applications.
  * **Single Endpoint:** A single `/graphql` endpoint handles all reading operations, simplifying client integration.
