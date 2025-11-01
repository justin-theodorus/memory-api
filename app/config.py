# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    openai_api_key: str


    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_anon_key: str | None = None

    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    embedding_model: str = "text-embedding-3-small"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

settings = Settings()

print("[CONFIG DEBUG] supabase_url =", repr(settings.supabase_url))
print("[CONFIG DEBUG] neo4j_uri =", repr(settings.neo4j_uri))