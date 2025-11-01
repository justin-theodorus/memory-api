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
