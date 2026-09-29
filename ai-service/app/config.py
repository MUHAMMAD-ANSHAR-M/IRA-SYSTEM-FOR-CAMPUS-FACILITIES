import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "saved_models"
DATA_DIR = BASE_DIR / "data_store"

MODEL_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))
NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://localhost:5000")
