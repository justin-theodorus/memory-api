import asyncio
import httpx
from fastapi import HTTPException
from app.config import settings

OPENAI_URL = "https://api.openai.com/v1/embeddings"

async def get_embedding(text: str) -> list[float]:
    #print("[EMB] start call to OpenAI")
    async with httpx.AsyncClient(timeout=15.0) as client:
        for attempt in range(3):
            #print(f"[EMB] attempt {attempt+1}")
            resp = await client.post(
                OPENAI_URL,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={"input": text, "model": settings.embedding_model},
            )
            #print("[EMB] status:", resp.status_code)
            if resp.status_code == 429 and attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            if resp.status_code == 429:
                raise HTTPException(503, "OpenAI still rate limiting after retries")
            resp.raise_for_status()
            data = resp.json()
            #print("[EMB] got embedding len", len(data["data"][0]["embedding"]))
            return data["data"][0]["embedding"]

    raise HTTPException(503, "OpenAI embedding failed unexpectedly")