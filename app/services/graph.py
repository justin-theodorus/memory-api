from neo4j import GraphDatabase
from app.config import settings
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


driver = GraphDatabase.driver(
    settings.neo4j_uri,
    auth=(settings.neo4j_user, settings.neo4j_password)
)


def verify_connection():
    """Verify Neo4j database connectivity."""
    try:
        driver.verify_connectivity()
        return True
    except Exception as e:
        print(f"Failed to connect to Neo4j: {e}")
        return (settings.neo4j_uri,settings.neo4j_user, settings.neo4j_password, str(e))


def create_memory_node(mem_id: str, content: str, version: int = 1, status: str = "active"):
    with driver.session() as session:
        session.run(
            """
            MERGE (m:Memory {id: $id})
            SET m.content = $content,
                m.version = $version,
                m.status = $status,
                m.created_at = datetime()
            """,
            id=mem_id,
            content=content,
            version=version,
            status=status,
        )
    
def create_relationship(source_id: str, target_id: str, rel_type: str):
    """
    rel_type: "UPDATE" | "EXTEND" | "DERIVE"
    """
    cypher = f"""
    MATCH (a:Memory {{id: $source_id}}),
          (b:Memory {{id: $target_id}})
    MERGE (a)-[r:{rel_type}]->(b)
    SET r.created_at = datetime()
    """
    try:
        with driver.session() as session:
            session.run(
                cypher,
                source_id=source_id,
                target_id=target_id,
            )
        print(f"[NEO4J] created {rel_type} between {source_id} -> {target_id}")
    except Exception as e:
        print(f"[NEO4J ERROR create_relationship {rel_type}]", repr(e))

def expand_memory_subgraph(memory_ids: list[str], depth: int = 2):
    if not memory_ids:
        print("[NEO4J expand] empty id list")
        return {}

    # build the variable-length pattern
    rel_pattern = f"[r:UPDATE|EXTEND|DERIVE*1..{depth}]"

    query = f"""
    MATCH (m:Memory)
    WHERE m.id IN $ids
    OPTIONAL MATCH p = (m)-{rel_pattern}-(n:Memory)
    WITH collect(DISTINCT m) + collect(DISTINCT n) AS nodes,
         [path IN collect(p) WHERE path IS NOT NULL] AS paths
    WITH nodes,
         reduce(allrels = [], path IN paths |
                allrels + relationships(path)) AS rels
    RETURN nodes, rels
    """

    try:
        print("[NEO4J expand] querying for ids:", memory_ids)
        with driver.session() as session:
            rec = session.run(query, ids=memory_ids).single()
            if not rec:
                print("[NEO4J expand] no record")
                return {}

            raw_nodes = rec["nodes"] or []
            raw_rels = rec["rels"] or []
            print(f"[NEO4J expand] got {len(raw_nodes)} raw nodes and {len(raw_rels)} rels")

            
            nodes = []
            internal_to_uuid = {}
            seen_node_uuids = set()  # Deduplicate nodes by UUID
            for n in raw_nodes:
                if not n:
                    continue
                uuid = n.get("id")
                
                # Skip if we've already processed this node
                if uuid in seen_node_uuids:
                    # Still map internal ID for relationship processing
                    internal_to_uuid[n.id] = uuid
                    continue
                    
                seen_node_uuids.add(uuid)
                internal_to_uuid[n.id] = uuid
                nodes.append({
                    "id": uuid,
                    "content": n.get("content"),
                    "status": n.get("status"),
                    "version": n.get("version"),
                })

            edges = []
            seen_rel_ids = set()
            for r in raw_rels:
                if not r:
                    continue
                # Deduplicate by relationship ID (bidirectional match causes duplicates)
                if r.id in seen_rel_ids:
                    continue
                seen_rel_ids.add(r.id)
                
                start_internal = r.start_node.id
                end_internal = r.end_node.id
                edges.append({
                    "from": internal_to_uuid.get(start_internal, start_internal),
                    "to": internal_to_uuid.get(end_internal, end_internal),
                    "type": r.type,   # "EXTEND" / "UPDATE" / "DERIVE"
                })

            print(f"[NEO4J expand] returning {len(nodes)} unique nodes and {len(edges)} edges")
            return {
                "nodes": nodes or [],
                "edges": edges or [],
            }
    except Exception as e:
        print("[NEO4J expand ERROR]", repr(e))
        return {}

def supersede_version(old_id: str, new_id: str, content: str) -> Dict[str, Any]:
    """
    - Marks old memory as 'outdated'
    - Creates (or updates) new memory with version = old.version + 1
    - Creates :UPDATE edge old -> new
    """
    now = datetime.utcnow().isoformat()

    cypher = """
    MATCH (old:Memory {id: $old_id})
    SET   old.status = 'outdated'
    WITH old

    MERGE (new:Memory {id: $new_id})
      ON CREATE SET
        new.content    = $content,
        new.status     = 'active',
        new.version    = coalesce(old.version, 1) + 1,
        new.created_at = datetime($now)
      ON MATCH SET
        new.content    = $content

    MERGE (old)-[r:UPDATE]->(new)
      ON CREATE SET r.at = datetime($now)

    RETURN
      old { .id, .status, .version } AS old,
      new { .id, .status, .version, .content } AS new,
      type(r) AS rel_type, r.at AS at
    """
    with driver.session() as session:
        rec = session.run(cypher, {
            "old_id": old_id,
            "new_id": new_id,
            "content": content,
            "now": now,
        }).single()

    return rec.data() if rec else {}


# ---------- EXTEND (a -> b) ----------
def create_extend(old_id: str, new_id: str) -> Dict[str, Any]:
    """
    Creates an :EXTEND edge old -> new (assumes nodes already exist).
    """
    now = datetime.utcnow().isoformat()
    cypher = """
    MATCH (a:Memory {id: $old_id}), (b:Memory {id: $new_id})
    MERGE (a)-[r:EXTEND]->(b)
      ON CREATE SET r.at = datetime($now)
    RETURN type(r) AS rel_type, r.at AS at,
           startNode(r).id AS from_id, endNode(r).id AS to_id
    """
    with driver.session() as session:
        rec = session.run(cypher, {"old_id": old_id, "new_id": new_id, "now": now}).single()
    return rec.data() if rec else {}


# ---------- DERIVE (base -> derived) ----------
def create_derive(base_id: str, derived_id: str, content: str) -> Dict[str, Any]:
    """
    Create a new derived node and connect with :DERIVE.
    """
    now = datetime.utcnow().isoformat()
    cypher = """
    MATCH (base:Memory {id: $base_id})
    MERGE (d:Memory {id: $derived_id})
      ON CREATE SET
        d.content    = $content,
        d.status     = 'active',
        d.version    = 1,
        d.created_at = datetime($now)
      ON MATCH SET
        d.content    = $content

    MERGE (base)-[r:DERIVE]->(d)
      ON CREATE SET r.at = datetime($now)

    RETURN
      base { .id } AS base,
      d    { .id, .status, .version, .content } AS derived,
      type(r) AS rel_type, r.at AS at
    """
    with driver.session() as session:
        rec = session.run(cypher, {
            "base_id": base_id,
            "derived_id": derived_id,
            "content": content,
            "now": now
        }).single()
    return rec.data() if rec else {}


# ---------- LINEAGE (ordered edge hops from a root) ----------
def fetch_lineage(root_id: str, max_hops: int = 8) -> List[Dict[str, Any]]:
    """
    Returns chronologically ordered hops from `root_id`.
    No APOC; flatten relationships with reduce(...).
    """
    cypher = f"""
    MATCH (root:Memory {{id: $id}})
    OPTIONAL MATCH p = (root)-[r:UPDATE|EXTEND|DERIVE*1..{max_hops}]->(n:Memory)
    WITH collect(p) AS paths
    WITH reduce(all = [], p IN paths | all + relationships(p)) AS rels
    UNWIND rels AS rel
    RETURN
      type(rel)         AS op,
      rel.at            AS at,
      startNode(rel).id AS from_id,
      endNode(rel).id   AS to_id
    ORDER BY at
    """
    with driver.session() as session:
        result = session.run(cypher, {"id": root_id})
        return [r.data() for r in result]


# ---------- GLOBAL TIMELINE (newest first) ----------
def fetch_timeline(limit: int = 100, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Mixed feed of node creates and relationship events.
    """
    cypher = """
    MATCH (m:Memory)
    WHERE $status IS NULL OR m.status = $status
    OPTIONAL MATCH (m)-[r:UPDATE|EXTEND|DERIVE]->(n)
    WITH m, r, coalesce(r.at, m.created_at) AS t
    ORDER BY t DESC
    LIMIT $limit
    RETURN
      m.id      AS id,
      m.content AS content,
      m.status  AS status,
      m.version AS version,
      t         AS at,
      type(r)   AS op,
      CASE WHEN r IS NULL THEN NULL ELSE startNode(r).id END AS from_id,
      CASE WHEN r IS NULL THEN NULL ELSE endNode(r).id   END AS to_id
    """
    with driver.session() as session:
        result = session.run(cypher, {"limit": limit, "status": status})
        return [r.data() for r in result]

def create_link(from_id: str, to_id: str, rel_type: str):
    cypher = f"""
    MATCH (a:Memory {{id:$from}}), (b:Memory {{id:$to}})
    MERGE (a)-[r:{rel_type}]->(b)
    SET r.created_at = datetime()
    RETURN type(r) as type
    """
    with driver.session() as s:
        s.run(cypher, {"from": from_id, "to": to_id})

def merge_duplicate_nodes(source_id: str, target_id: str):
    """
    Merges source node into target node, keeping target's ID.
    Transfers all relationships from source to target, then deletes source.
    Uses multiple queries for clarity and reliability.
    """
    with driver.session() as session:
        # First, verify both nodes exist
        verify = session.run("""
            MATCH (s:Memory {id:$src})
            MATCH (t:Memory {id:$tgt})
            RETURN s.id AS s_id, t.id AS t_id
        """, {"src": source_id, "tgt": target_id}).single()
        
        if not verify:
            return {"ok": False, "error": "One or both nodes not found"}
        
        # Transfer outgoing UPDATE relationships
        session.run("""
            MATCH (s:Memory {id:$src})-[r:UPDATE]->(other)
            MATCH (t:Memory {id:$tgt})
            WHERE other <> t
            MERGE (t)-[:UPDATE]->(other)
        """, {"src": source_id, "tgt": target_id})
        
        # Transfer outgoing EXTEND relationships  
        session.run("""
            MATCH (s:Memory {id:$src})-[r:EXTEND]->(other)
            MATCH (t:Memory {id:$tgt})
            WHERE other <> t
            MERGE (t)-[:EXTEND]->(other)
        """, {"src": source_id, "tgt": target_id})
        
        # Transfer outgoing DERIVE relationships
        session.run("""
            MATCH (s:Memory {id:$src})-[r:DERIVE]->(other)
            MATCH (t:Memory {id:$tgt})
            WHERE other <> t
            MERGE (t)-[:DERIVE]->(other)
        """, {"src": source_id, "tgt": target_id})
        
        # Transfer incoming UPDATE relationships
        session.run("""
            MATCH (other)-[r:UPDATE]->(s:Memory {id:$src})
            MATCH (t:Memory {id:$tgt})
            WHERE other <> t
            MERGE (other)-[:UPDATE]->(t)
        """, {"src": source_id, "tgt": target_id})
        
        # Transfer incoming EXTEND relationships
        session.run("""
            MATCH (other)-[r:EXTEND]->(s:Memory {id:$src})
            MATCH (t:Memory {id:$tgt})
            WHERE other <> t
            MERGE (other)-[:EXTEND]->(t)
        """, {"src": source_id, "tgt": target_id})
        
        # Transfer incoming DERIVE relationships
        session.run("""
            MATCH (other)-[r:DERIVE]->(s:Memory {id:$src})
            MATCH (t:Memory {id:$tgt})
            WHERE other <> t
            MERGE (other)-[:DERIVE]->(t)
        """, {"src": source_id, "tgt": target_id})
        
        # Finally, delete source node
        session.run("""
            MATCH (s:Memory {id:$src})
            DETACH DELETE s
        """, {"src": source_id})
        
        return {"ok": True, "kept": target_id}

