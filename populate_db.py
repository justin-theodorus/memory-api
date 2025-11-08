"""
Script to populate the Memory Graph database with realistic test data.
This creates multiple disconnected subgraphs across different topics.
"""

import requests
import time

API_BASE = "http://localhost:8000"

# Define multiple topic clusters (disconnected subgraphs)
memory_clusters = {
    "tariffs": [
        "International trade tariffs were reduced in 2023 to promote global commerce",
        "The European Union implemented new carbon border tariffs in 2024",
        "US-China trade tariffs remain a contentious issue in international relations",
        "Import duties on agricultural products vary significantly across countries",
        "Digital services taxes are a new form of cross-border tariff",
    ],
    "climate": [
        "Global temperatures have risen 1.2°C since pre-industrial times",
        "Renewable energy adoption increased by 40% in the past decade",
        "Arctic ice coverage reached record lows in 2023",
        "Carbon capture technology is becoming more economically viable",
        "Electric vehicle sales surpassed 10 million units globally in 2023",
    ],
    "ai_technology": [
        "Large language models reached 100 billion parameters in 2023",
        "AI-powered protein folding solved critical biological problems",
        "Autonomous vehicles achieved level 4 autonomy in controlled environments",
        "Neural networks can now generate photorealistic images from text",
        "Quantum computing breakthroughs accelerated AI training times",
    ],
    "space_exploration": [
        "Mars rover Perseverance discovered evidence of ancient water",
        "James Webb Space Telescope revealed the earliest galaxies",
        "SpaceX successfully launched the first fully reusable rocket",
        "NASA plans to return humans to the Moon by 2025",
        "Private space tourism became commercially available in 2024",
    ],
    "healthcare": [
        "mRNA vaccine technology revolutionized disease prevention",
        "CRISPR gene editing received FDA approval for clinical use",
        "Telemedicine adoption increased 300% during the pandemic",
        "AI diagnostics can now detect cancers earlier than traditional methods",
        "Personalized medicine based on genetic profiles is becoming standard care",
    ],
    "finance": [
        "Central banks raised interest rates to combat inflation",
        "Cryptocurrency market cap exceeded $2 trillion in 2024",
        "Digital banking adoption reached 80% in developed countries",
        "Stock markets recovered to pre-pandemic levels",
        "ESG investing became mainstream among institutional investors",
    ]
}

# Relationships to create within each cluster
cluster_relationships = {
    "tariffs": [
        ("International trade tariffs were reduced in 2023 to promote global commerce", 
         "US-China trade tariffs remain a contentious issue in international relations", "EXTEND"),
        ("The European Union implemented new carbon border tariffs in 2024",
         "Digital services taxes are a new form of cross-border tariff", "DERIVE"),
    ],
    "climate": [
        ("Global temperatures have risen 1.2°C since pre-industrial times",
         "Arctic ice coverage reached record lows in 2023", "DERIVE"),
        ("Renewable energy adoption increased by 40% in the past decade",
         "Electric vehicle sales surpassed 10 million units globally in 2023", "EXTEND"),
    ],
    "ai_technology": [
        ("Large language models reached 100 billion parameters in 2023",
         "Neural networks can now generate photorealistic images from text", "EXTEND"),
        ("Quantum computing breakthroughs accelerated AI training times",
         "AI-powered protein folding solved critical biological problems", "DERIVE"),
    ],
    "space_exploration": [
        ("Mars rover Perseverance discovered evidence of ancient water",
         "NASA plans to return humans to the Moon by 2025", "EXTEND"),
        ("James Webb Space Telescope revealed the earliest galaxies",
         "Private space tourism became commercially available in 2024", "DERIVE"),
    ],
    "healthcare": [
        ("mRNA vaccine technology revolutionized disease prevention",
         "CRISPR gene editing received FDA approval for clinical use", "EXTEND"),
        ("AI diagnostics can now detect cancers earlier than traditional methods",
         "Personalized medicine based on genetic profiles is becoming standard care", "DERIVE"),
    ],
    "finance": [
        ("Central banks raised interest rates to combat inflation",
         "Stock markets recovered to pre-pandemic levels", "DERIVE"),
        ("Cryptocurrency market cap exceeded $2 trillion in 2024",
         "Digital banking adoption reached 80% in developed countries", "EXTEND"),
    ]
}

def create_memory(content):
    """Create a new memory and return its ID."""
    try:
        response = requests.post(
            f"{API_BASE}/memories",
            json={"content": content}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Created: {content[:60]}... [ID: {data['id'][:8]}...]")
            return data['id']
        else:
            print(f"✗ Failed to create: {content[:60]}...")
            return None
    except Exception as e:
        print(f"✗ Error creating memory: {e}")
        return None

def create_relationship(source_id, target_id, rel_type):
    """Create a relationship between two memories."""
    try:
        endpoint_map = {
            "EXTEND": f"{API_BASE}/memories/{source_id}/extend",
            "DERIVE": f"{API_BASE}/memories/{source_id}/derive",
        }
        
        response = requests.post(
            endpoint_map[rel_type],
            json={"target_id": target_id}
        )
        
        if response.status_code == 200:
            print(f"  → Created {rel_type} relationship")
            return True
        else:
            print(f"  ✗ Failed to create relationship")
            return False
    except Exception as e:
        print(f"  ✗ Error creating relationship: {e}")
        return False

def populate_database():
    """Populate the database with all memory clusters."""
    print("=" * 80)
    print("POPULATING MEMORY GRAPH DATABASE")
    print("=" * 80)
    
    all_memory_ids = {}
    
    # Create all memories first
    for topic, memories in memory_clusters.items():
        print(f"\n📁 Topic: {topic.upper()}")
        print("-" * 80)
        
        topic_ids = {}
        for memory_content in memories:
            memory_id = create_memory(memory_content)
            if memory_id:
                topic_ids[memory_content] = memory_id
                time.sleep(0.5)  # Rate limiting
        
        all_memory_ids[topic] = topic_ids
    
    # Create relationships within clusters
    print("\n" + "=" * 80)
    print("CREATING RELATIONSHIPS")
    print("=" * 80)
    
    for topic, relationships in cluster_relationships.items():
        print(f"\n🔗 Linking: {topic.upper()}")
        print("-" * 80)
        
        topic_ids = all_memory_ids[topic]
        for source_content, target_content, rel_type in relationships:
            source_id = topic_ids.get(source_content)
            target_id = topic_ids.get(target_content)
            
            if source_id and target_id:
                print(f"  {source_content[:50]}...")
                print(f"  → {target_content[:50]}...")
                create_relationship(source_id, target_id, rel_type)
                time.sleep(0.3)
    
    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    total_memories = sum(len(ids) for ids in all_memory_ids.values())
    total_relationships = sum(len(rels) for rels in cluster_relationships.values())
    
    print(f"✓ Created {total_memories} memories across {len(memory_clusters)} topics")
    print(f"✓ Created {total_relationships} relationships")
    print(f"✓ Generated {len(memory_clusters)} disconnected subgraphs")
    
    print("\n📊 Topic Distribution:")
    for topic, ids in all_memory_ids.items():
        print(f"  • {topic}: {len(ids)} memories")
    
    print("\n" + "=" * 80)
    print("🎉 DATABASE POPULATION COMPLETE!")
    print("=" * 80)
    print("\nNow try searching for:")
    print("  • 'tariffs' - should show only tariff-related subgraph")
    print("  • 'climate change' - should show only climate-related subgraph")
    print("  • 'artificial intelligence' - should show only AI-related subgraph")
    print("  • 'space missions' - should show only space-related subgraph")
    print("=" * 80)

if __name__ == "__main__":
    print("\n🚀 Starting database population...")
    print("⚠️  Make sure your backend is running on http://localhost:8000\n")
    
    try:
        # Test connection
        response = requests.get(f"{API_BASE}/timeline?limit=1")
        if response.status_code == 200:
            print("✓ Backend connection successful!\n")
            populate_database()
        else:
            print("✗ Backend is not responding correctly")
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to backend. Please start the backend server first.")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")

