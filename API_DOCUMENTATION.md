# Memory Graph API Documentation

**Version:** 0.1.0  
**Base URL:** `http://localhost:8000`

---

## Table of Contents

1. [Memory Management](#memory-management)
2. [Search](#search)
3. [Relationships](#relationships)
4. [Versioning & Evolution](#versioning--evolution)
5. [Graph Operations](#graph-operations)
6. [Timeline & Lineage](#timeline--lineage)
7. [Data Models](#data-models)

---

## Memory Management

### Create Memory

Creates a new memory node in both Postgres (Supabase) and Neo4j graph database.

**Endpoint:** `POST /memories`

**Request Body:**
```json
{
  "content": "string",
  "metadata": {
    "key": "value"
  } // optional
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "dim": 1536
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/memories \
  -H "Content-Type: application/json" \
  -d '{"content": "The tariff system was updated in 2024"}'
```

---

### Get Memory

Retrieves a single memory with its surrounding graph neighborhood.

**Endpoint:** `GET /memories/{memory_id}`

**Path Parameters:**
- `memory_id` (string, required): UUID of the memory

**Query Parameters:**
- `depth` (integer, optional, default: 2): Graph traversal depth (1-8)

**Response:**
```json
{
  "memory": {
    "id": "uuid",
    "content": "string",
    "embedding": [float],
    "metadata": {},
    "status": "active|outdated",
    "created_at": "timestamp"
  },
  "graph": {
    "nodes": [
      {
        "id": "uuid",
        "content": "string",
        "status": "active|outdated",
        "version": 1
      }
    ],
    "edges": [
      {
        "from": "uuid",
        "to": "uuid",
        "type": "UPDATE|EXTEND|DERIVE"
      }
    ]
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:8000/memories/abc-123?depth=3"
```

---

## Search

### Vector Similarity Search

Searches memories using semantic similarity with optional graph expansion.

**Endpoint:** `POST /search`

**Request Body:**
```json
{
  "query": "string",
  "k": 5,                    // optional, default: 5
  "similarity_threshold": 0.0, // optional, default: 0.0
  "with_graph": true         // optional, default: true
}
```

**Response:**
```json
{
  "query": "search query",
  "results": [
    {
      "id": "uuid",
      "content": "string",
      "metadata": {},
      "similarity": 0.95
    }
  ],
  "graph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "tariff updates", "k": 10, "with_graph": true}'
```

---

## Relationships

### Create EXTEND Relationship

Links two existing memories with an EXTEND relationship (one memory extends/adds to another).

**Endpoint:** `POST /memories/{source_id}/extend`

**Path Parameters:**
- `source_id` (string, required): Source memory UUID

**Request Body:**
```json
{
  "target_id": "uuid"
}
```

**Response:**
```json
{
  "ok": true,
  "type": "EXTEND",
  "from": "source-uuid",
  "to": "target-uuid"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/memories/abc-123/extend \
  -H "Content-Type: application/json" \
  -d '{"target_id": "def-456"}'
```

---

### Create UPDATE Relationship

Creates an UPDATE relationship and marks source as outdated (for manual updates without versioning).

**Endpoint:** `POST /memories/{source_id}/update`

**Path Parameters:**
- `source_id` (string, required): Source memory UUID

**Request Body:**
```json
{
  "target_id": "uuid"
}
```

**Response:**
```json
{
  "ok": true,
  "type": "UPDATE",
  "from": "source-uuid",
  "to": "target-uuid"
}
```

---

### Create DERIVE Relationship

Links two existing memories with a DERIVE relationship (one is derived from another).

**Endpoint:** `POST /memories/{source_id}/derive`

**Path Parameters:**
- `source_id` (string, required): Source memory UUID

**Request Body:**
```json
{
  "target_id": "uuid"
}
```

**Response:**
```json
{
  "ok": true,
  "type": "DERIVE",
  "from": "source-uuid",
  "to": "target-uuid"
}
```

---

## Versioning & Evolution

### Supersede Memory (Create New Version)

Creates a new version of a memory, marks the old one as outdated, and creates an UPDATE relationship.

**Endpoint:** `POST /memories/{id}/supersede`

**Path Parameters:**
- `id` (string, required): UUID of memory to supersede

**Request Body:**
```json
{
  "content": "Updated content"
}
```

**Response:**
```json
{
  "ok": true,
  "new_id": "new-uuid"
}
```

**What it does:**
1. Marks old memory as `status: "outdated"`
2. Creates new memory with `version = old.version + 1`
3. Creates UPDATE edge: old → new
4. Stores new memory in both databases with new embedding

**Example:**
```bash
curl -X POST http://localhost:8000/memories/abc-123/supersede \
  -H "Content-Type: application/json" \
  -d '{"content": "The tariff system was updated in 2024 with new rates"}'
```

---

### Extend to Existing Memory

Creates an EXTEND relationship to an existing memory (path-based version).

**Endpoint:** `POST /memories/{id}/extend-to/{target_id}`

**Path Parameters:**
- `id` (string, required): Source memory UUID
- `target_id` (string, required): Target memory UUID

**Response:**
```json
{
  "ok": true,
  "rel_type": "EXTEND",
  "at": "timestamp",
  "from_id": "source-uuid",
  "to_id": "target-uuid"
}
```

---

### Derive New Memory

Creates a new derived memory with content and establishes DERIVE relationship.

**Endpoint:** `POST /memories/{id}/derive-new`

**Path Parameters:**
- `id` (string, required): Base memory UUID

**Request Body:**
```json
{
  "content": "Derived content"
}
```

**Response:**
```json
{
  "ok": true,
  "new_id": "new-uuid",
  "graph": {
    "base": {"id": "base-uuid"},
    "derived": {
      "id": "new-uuid",
      "version": 1,
      "content": "string",
      "status": "active"
    },
    "rel_type": "DERIVE",
    "at": "timestamp"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/memories/abc-123/derive-new \
  -H "Content-Type: application/json" \
  -d '{"content": "The 2022 schedule is no longer valid"}'
```

---

## Graph Operations

### Suggest Links (AI-Powered)

Analyzes a memory and suggests potential relationships based on semantic similarity.

**Endpoint:** `POST /memories/{id}/suggest`

**Path Parameters:**
- `id` (string, required): Memory UUID to analyze

**Response:**
```json
{
  "suggestions": [
    {
      "from": "source-uuid",
      "to": "target-uuid",
      "type": "DUPLICATE|EXTEND|DERIVE",
      "similarity": 0.95,
      "reason": "sim=0.950 ≥ 0.92"
    }
  ]
}
```

**Similarity Thresholds:**
- **DUPLICATE:** similarity ≥ 0.92
- **EXTEND:** similarity ≥ 0.85
- **DERIVE:** similarity ≥ 0.75

**Example:**
```bash
curl -X POST http://localhost:8000/memories/abc-123/suggest
```

---

### Create Manual Link

Manually creates a relationship between two existing memories.

**Endpoint:** `POST /graph/links`

**Request Body:**
```json
{
  "from": "source-uuid",
  "to": "target-uuid",
  "type": "EXTEND|DERIVE"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Notes:**
- Only EXTEND and DERIVE types allowed (UPDATE should use supersede)
- Both nodes must exist
- Creates relationship in Neo4j only

**Example:**
```bash
curl -X POST http://localhost:8000/graph/links \
  -H "Content-Type: application/json" \
  -d '{"from": "abc-123", "to": "def-456", "type": "EXTEND"}'
```

---

### Merge Duplicate Nodes

Merges a source node into a target node, transferring all relationships.

**Endpoint:** `POST /memories/merge`

**Request Body:**
```json
{
  "source_id": "uuid-to-remove",
  "target_id": "uuid-to-keep"
}
```

**Response:**
```json
{
  "ok": true,
  "kept": "target-uuid"
}
```

**What it does:**
1. Transfers all incoming relationships to target
2. Transfers all outgoing relationships to target
3. Deletes source node from Neo4j
4. Keeps target node with original ID

**Example:**
```bash
curl -X POST http://localhost:8000/memories/merge \
  -H "Content-Type: application/json" \
  -d '{"source_id": "duplicate-123", "target_id": "original-456"}'
```

---

## Timeline & Lineage

### Get Memory Lineage

Returns chronologically ordered relationship chain from a root memory.

**Endpoint:** `GET /memories/{id}/lineage`

**Path Parameters:**
- `id` (string, required): Root memory UUID

**Response:**
```json
[
  {
    "op": "UPDATE|EXTEND|DERIVE",
    "at": "timestamp",
    "from_id": "source-uuid",
    "to_id": "target-uuid"
  }
]
```

**Notes:**
- Follows relationships up to 8 hops
- Returns only downstream relationships from root
- Ordered by timestamp

**Example:**
```bash
curl -X GET http://localhost:8000/memories/abc-123/lineage
```

---

### Get Global Timeline

Returns global timeline of all memory events (creates + relationship changes).

**Endpoint:** `GET /timeline`

**Query Parameters:**
- `limit` (integer, optional, default: 100): Max items to return
- `status` (string, optional): Filter by status ("active" or "outdated")

**Response:**
```json
[
  {
    "id": "uuid",
    "content": "string",
    "status": "active|outdated",
    "version": 1,
    "at": "timestamp",
    "op": "UPDATE|EXTEND|DERIVE|null",
    "from_id": "uuid|null",
    "to_id": "uuid|null"
  }
]
```

**Notes:**
- Sorted by timestamp (newest first)
- `op` is null for node creation events
- `from_id`/`to_id` are null for node-only events

**Example:**
```bash
curl -X GET "http://localhost:8000/timeline?limit=50&status=active"
```

---

## Data Models

### MemoryCreate
```typescript
{
  content: string;
  metadata?: Record<string, any>;
}
```

### RelationshipCreate
```typescript
{
  target_id: string;
  metadata?: Record<string, any>;
}
```

### SupersedeRequest
```typescript
{
  content: string;
}
```

### SearchRequest
```typescript
{
  query: string;
  k?: number;                    // default: 5
  similarity_threshold?: number; // default: 0.0
  with_graph?: boolean;          // default: true
}
```

---

## Relationship Types

### UPDATE
- **Purpose:** Version evolution
- **Semantic:** "This memory updates/replaces that memory"
- **Status Change:** Source marked as "outdated"
- **Use Case:** Content corrections, refinements, new information

### EXTEND
- **Purpose:** Additional context
- **Semantic:** "This memory extends/adds to that memory"
- **Status Change:** None (both remain active)
- **Use Case:** Adding details, examples, related information

### DERIVE
- **Purpose:** Derived knowledge
- **Semantic:** "This memory is derived from that memory"
- **Status Change:** None (both remain active)
- **Use Case:** Conclusions, implications, transformations

---

## Status Values

- **`active`**: Current, valid memory
- **`outdated`**: Superseded by newer version

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "detail": "Error message"
}
```

### 404 Not Found
```json
{
  "detail": "Memory not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal Server Error"
}
```

---

## Configuration

The API uses environment-based configuration for:

- **OpenAI API Key:** For embeddings
- **Supabase:** PostgreSQL with pgvector
- **Neo4j:** Graph database
- **Similarity Thresholds:**
  - `auto_dup_thresh: 0.92`
  - `auto_ext_thresh: 0.85`
  - `auto_der_thresh: 0.75`
  - `auto_max_suggestions: 5`

---

## CORS Configuration

Allowed origins:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

---

## Best Practices

1. **Use Supersede for Updates:** When correcting or refining content
2. **Use Extend for Context:** When adding related information
3. **Use Derive for Conclusions:** When creating derived knowledge
4. **Check Suggestions First:** Before manually creating links
5. **Merge Duplicates Promptly:** To maintain graph quality
6. **Use Appropriate Depth:** Higher depth = more data = slower queries

---

## Quick Reference

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Create memory | `/memories` | POST |
| Get memory | `/memories/{id}` | GET |
| Search | `/search` | POST |
| Supersede | `/memories/{id}/supersede` | POST |
| Derive new | `/memories/{id}/derive-new` | POST |
| Create EXTEND | `/memories/{id}/extend` | POST |
| Manual link | `/graph/links` | POST |
| Suggest links | `/memories/{id}/suggest` | POST |
| Merge nodes | `/memories/merge` | POST |
| Lineage | `/memories/{id}/lineage` | GET |
| Timeline | `/timeline` | GET |

