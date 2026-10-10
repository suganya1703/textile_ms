# Loomdo Core Configuration
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "loomdo.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

API_PREFIX = "/api"
PROJECT_NAME = "Loomdo"
TAGLINE = "Every roll, traced from yarn to invoice."
DEMO_CLIENT = "Everest Textile Mills"
