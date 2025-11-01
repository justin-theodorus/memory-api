from pydantic import BaseModel
from typing import Any, Optional

class MemoryCreate(BaseModel):
    content: str
    metadata: Optional[dict[str, Any]] = None

class RelationshipCreate(BaseModel):
    target_id: str       
    metadata: dict | None = None
