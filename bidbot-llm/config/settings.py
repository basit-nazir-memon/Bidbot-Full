import os
from pydantic_settings import BaseSettings # type: ignore

class Settings(BaseSettings):
    """Application settings."""
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "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")
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    DEFAULT_MODEL: str = "llama3-8b-8192"  # Updated to a valid Groq model
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()