import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import *
from app.services.embeddings import get_embedding
from app.services.db import insert_memory, mark_memory_outdated, search_memories, get_memory_by_id
from app.services.graph import *

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

@app.get("/memories/{memory_id}")
async def get_memory(memory_id: str, depth: int = 2):
    # 1) fetch base memory from Supabase
    mem = get_memory_by_id(memory_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    # 2) fetch small subgraph around it
    g = expand_memory_subgraph([memory_id], depth=depth)

    return {
        "memory": mem,
        "graph": g,
    }

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

@app.post("/memories/{id}/supersede")
async def supersede_memory(id: str, body: SupersedeRequest):
    new_id = str(uuid.uuid4())

    # 1) Neo4j: atomically set old->outdated, create new node, and :UPDATE edge
    g = supersede_version(old_id=id, new_id=new_id, content=body.content)
    if not g:
        raise HTTPException(404, "old memory not found")
    new_version = g["new"]["version"] 

    # 2) Embedding for the new content
    emb = await get_embedding(body.content) 

    # 3) Supabase: insert the new version row
    insert_memory(
        id_=new_id,
        content=body.content,
        embedding=emb,       
        metadata={"op": "UPDATE", "from": id},
    )

    # 4) Supabase: mark old row outdated
    mark_memory_outdated(id)

    return {"ok": True, "new_id": new_id}

@app.post("/memories/{id}/extend-to/{target_id}")
def extend_memory_to(id: str, target_id: str):
    try:
        return {"ok": True, **create_extend(id, target_id)}
    except Exception as e:
        raise HTTPException(500, f"extend failed: {e}")

@app.post("/memories/{id}/derive-new")
async def derive_memory_new(id: str, body: SupersedeRequest):
    new_id = str(uuid.uuid4())
    try:
        graph_res = create_derive(id, new_id, body.content)
        # Also write new node to Supabase
        emb = await get_embedding(body.content)
        insert_memory(
            id_=new_id,
            content=body.content,
            embedding=emb,
            metadata={"op": "DERIVE", "from": id},
        )
        return {"ok": True, "new_id": new_id, "graph": graph_res}
    except Exception as e:
        raise HTTPException(500, f"derive failed: {e}")

@app.get("/memories/{id}/lineage")
def get_lineage(id: str):
    return fetch_lineage(id)

@app.get("/timeline")
def global_timeline(limit: int = 100, status: str | None = None):
    return fetch_timeline(limit, status)