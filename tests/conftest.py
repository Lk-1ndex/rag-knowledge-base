import sys
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
os.environ.setdefault("SQLITE_PATH", str(ROOT / "data" / "sqlite" / "test.sqlite3"))
os.environ.setdefault("UPLOAD_DIR", str(ROOT / "data" / "uploads"))
os.environ.setdefault("DEEPSEEK_API_KEY", "test-key")
os.environ.setdefault("SECRET_KEY", "test-secret")
sys.path.insert(0, str(BACKEND))
