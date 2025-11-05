from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class MemoryCreate(BaseModel):
    content: str
    metadata: Optional[dict[str, Any]] = None

class RelationshipCreate(BaseModel):
    target_id: str       
    metadata: dict | None = None

class SearchRequest(BaseModel):
    query: str
    k: int = 5
    similarity_threshold: float = 0.0
    with_graph: bool = True
    
class SupersedeRequest(BaseModel):
    content: str

class TimelineItem(BaseModel):
    id: str
    version: Optional[int] = None
    status: Optional[str] = None
    at: Optional[datetime] = None
    content: Optional[str] = None
    op: Optional[str] = None
    from_id: Optional[str] = None
    to_id: Optional[str] = None

class LineageItem(BaseModel):
    op: str
    at: Optional[datetime] = None
    from_id: str
    to_id: str
