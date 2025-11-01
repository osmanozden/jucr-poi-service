## 📝 `docs/database-schema.md` (Database Documentation)

### 1. Database Overview

The JUCR POI Service uses **MongoDB (via Mongoose)** as its primary persistence layer for storing Point of Interest (POI) data imported from the OpenChargeMap (OCM) API.

### 2. Schema Design Philosophy

The database schema is defined using Mongoose with a strict approach (`strict: true`). This ensures data cleanliness and decouples our service from the nested, external OCM API structure.

* **Decoupling:** Only fields explicitly defined in our schema are persisted.
* **Data Structure:** Complex OCM data is mapped into clean, self-contained **sub-documents** (e.g., `address`, `connections`).
* **Primary Key:** As required, the primary key (`_id`) is a **UUIDv4**.

### 3. Core POI Schema

The main collection stores the `Poi` documents.

| Field Name | Type (Mongoose) | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `_id` | `String` | Unique primary key. | **Required, Unique, UUIDv4** |
| `ocmId` | `Number` | The unique identifier from the OpenChargeMap API. | **Required, Unique Index** |
| `title` | `String` | The public name/title of the charging station. | Required |
| `dateCreated` | `Date` | Timestamp of when the record was first imported. | Default: `Date.now()` |
| `address` | `PoiAddress` (Sub-document) | Embedded document containing location details. | Required |
| `connections` | `[PoiConnection]` (Array) | Array of charging connection details. | Required |
| `operator` | `String` | Name of the network operator. | Optional |
| `usageType` | `String` | The type of usage (e.g., "Public - Pay At Location"). | Optional |

### 4. Embedded Schemas (Sub-documents)

Sub-documents are used for complex, nested relationships to maintain structure.

#### A. `PoiAddress` Schema

| Field Name | Type (Mongoose) | Description |
| :--- | :--- | :--- |
| `latitude` | `Number` | Geographic latitude. |
| `longitude` | `Number` | Geographic longitude. |
| `countryCode` | `String` | ISO 2-letter country code. |
| `postcode` | `String` | Postal code. |
| `town` | `String` | City or town name. |

#### B. `PoiConnection` Schema

| Field Name | Type (Mongoose) | Description |
| :--- | :--- | :--- |
| `connectionType` | `String` | The type of charging plug (e.g., "Type 2"). |
| `level` | `String` | The charging level (e.g., "Level 2"). |
| `powerKw` | `Number` | Power rating in kilowatts. |
| `amps` | `Number` | Amperage available. |
| `voltage` | `Number` | Voltage available. |

### 5. Indexing Strategies

A robust indexing strategy is critical for high-volume write operations, especially the `upsert` logic.

| Index Field | Type | Purpose | Impact on Performance |
| :--- | :--- | :--- | :--- |
| `_id` | Unique (Default) | Primary key index. | Fast document retrieval via UUID. |
| `ocmId` | **Unique Index** | **CRITICAL for Upsert Logic.** | Allows MongoDB to instantly locate the document for updates, preventing slow full-collection scans for every incoming POI job. |

### 6. Data Storage Strategy (UUIDv4)

* **Primary Key:** Every document uses a **UUIDv4** string as its `_id` key.
* **Rationale:** Using UUIDv4 (instead of MongoDB's default `ObjectId`) ensures unique identification across the entire platform and provides better horizontal scalability for future sharding, as key generation is decentralized.
* **Data Transformation:** The **ImporterProcessor** generates this UUIDv4 for the `_id` field before persisting the data.
