import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import MemoryCreate, RelationshipCreate, SearchRequest
from app.services.embeddings import get_embedding
from app.services.db import insert_memory, mark_memory_outdated, search_memories
from app.services.graph import create_memory_node, create_relationship, expand_memory_subgraph

app = FastAPI(title="Memory Platform", version="0.1.0")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],        
    allow_headers=["*"],        
)

@app.post("/memories")
async def create_memory(payload: MemoryCreate):
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="content cannot be empty")

    # 1. embed
    embedding = await get_embedding(payload.content)

    mem_id = uuid.uuid4()

    # 2. store in Postgres
    insert_memory(
        id_=mem_id,
        content=payload.content,
        embedding=embedding,
        metadata=payload.metadata,
    )

    # 3. create in Neo4j
    create_memory_node(str(mem_id), payload.content)

    # 4. return
    return {"id": str(mem_id), "dim": len(embedding)}

@app.post("/memories/{source_id}/extend")
def extend_memory(source_id: str, body: RelationshipCreate):
    # assume both nodes exist
    create_relationship(source_id, body.target_id, "EXTEND")
    return {"ok": True, "type": "EXTEND", "from": source_id, "to": body.target_id}


@app.post("/memories/{source_id}/update")
def update_memory(source_id: str, body: RelationshipCreate):
    # create the relation in Neo4j
    create_relationship(source_id, body.target_id, "UPDATE")
    # mark source as outdated in Supabase
    mark_memory_outdated(source_id)
    return {"ok": True, "type": "UPDATE", "from": source_id, "to": body.target_id}


@app.post("/memories/{source_id}/derive")
def derive_memory(source_id: str, body: RelationshipCreate):
    create_relationship(source_id, body.target_id, "DERIVE")
    return {"ok": True, "type": "DERIVE", "from": source_id, "to": body.target_id}

@app.post("/search")
async def search_memories_endpoint(payload: SearchRequest):
    # 1) embed the query
    query_emb = await get_embedding(payload.query)

    # 2) hit Supabase RPC
    matches = search_memories(
        query_embedding=query_emb,
        k=payload.k,
        similarity_threshold=payload.similarity_threshold,
    )

    # 3) expand each result in Neo4j
    graph = {}
    if payload.with_graph and matches:
        ids = [row["id"] for row in matches]
        graph = expand_memory_subgraph(ids)

    return {
        "query": payload.query,
        "results": matches,
        "graph": graph,
    }