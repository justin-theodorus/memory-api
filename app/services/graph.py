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
