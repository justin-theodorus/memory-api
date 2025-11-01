import uuid
from fastapi import FastAPI, HTTPException
from app.schemas import MemoryCreate
from app.services.embeddings import get_embedding
from app.services.db import insert_memory
from app.services.graph import create_memory_node, verify_connection

app = FastAPI(title="Memory Platform", version="0.1.0")

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
    return {
        "id": str(mem_id),
        "content": payload.content,
        "metadata": payload.metadata,
        "version": 1,
        "status": "active",
    }
