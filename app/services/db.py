import uuid
from app.config import settings
from supabase import create_client


SUPA_KEY = (
    settings.supabase_service_role_key
    or settings.supabase_anon_key
)

supabase = create_client(settings.supabase_url, SUPA_KEY)

def insert_memory(id_, content, embedding, metadata=None):
    data = {
        "id": str(id_),
        "content": content,
        "embedding": embedding,
        "metadata": metadata,
    }
    resp = supabase.table("memories").insert(data).execute()
    #print("[SUPABASE INSERT]", resp)
    return resp

def mark_memory_outdated(id_: str):
    res = supabase.table("memories").update({"status": "outdated"}).eq("id", id_).execute()
    print("[SUPABASE UPDATE status=outdated]", res)
    return res

def search_memories(query_embedding: list[float], k: int = 5, similarity_threshold: float = 0.0, exclude_id: str = None):
    """
    Calls the Postgres function match_memories(...)
    """
    resp = supabase.rpc(
        "match_memories",
        {
            "query_embedding": query_embedding,
            "match_count": k,
            "similarity_threshold": similarity_threshold,
        },
    ).execute()

    # supabase-py returns .data
    data = resp.data or []
    
    # Filter out excluded ID if provided
    if exclude_id:
        data = [row for row in data if row.get("id") != exclude_id]
    
    print("[SUPABASE SEARCH]", data)
    return data

def get_memory_by_id(mem_id: str):
    res = supabase.table("memories").select("*").eq("id", mem_id).limit(1).execute()
    if res.data:
        return res.data[0]
    return None