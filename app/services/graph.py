from neo4j import GraphDatabase
from app.config import settings

#print(f"[NEO4J] Connecting to: {settings.neo4j_uri}")
#print(f"[NEO4J] User: {settings.neo4j_user}")

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
