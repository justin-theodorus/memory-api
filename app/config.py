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

    auto_dup_thresh: float = 0.92
    auto_ext_thresh: float = 0.85
    auto_der_thresh: float = 0.75
    auto_max_suggestions: int = 5

settings = Settings()

