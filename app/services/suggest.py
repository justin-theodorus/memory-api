from typing import List, Dict
from app.services.db import *
from app.config import settings

def suggest_links_for(id: str) -> List[Dict]:
    row = get_memory_by_id(id) 
    if not row: return []

    hits = search_memories(row["embedding"], k=20, exclude_id=id)
    out = []
    dup = float(settings.auto_dup_thresh)
    ext = float(settings.auto_ext_thresh)
    der = float(settings.auto_der_thresh)
    cap = int(settings.auto_max_suggestions)

    for h in hits:
        s = h["similarity"]
        if s >= dup:
            t = "DUPLICATE"
            reason = f"sim={s:.3f} ≥ {dup}"
        elif s >= ext:
            t = "EXTEND"
            reason = f"sim={s:.3f} ≥ {ext}"
        elif s >= der:
            t = "DERIVE"
            reason = f"sim={s:.3f} ≥ {der}"
        else:
            continue

        out.append({
            "from": id,
            "to": h["id"],
            "type": t,
            "similarity": s,
            "reason": reason
        })
        if len(out) >= cap: break
    return out