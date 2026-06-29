"""
Centralized configuration for the Learning Log backend.
All path and port constants defined here to avoid duplication.
"""
import os

PROJECT_DIR = os.environ.get(
    "LEARNLOG_PROJECT_DIR",
    os.path.expanduser("~/PycharmProjects/learning-log")
)

BACKEND_PORT = int(os.environ.get("LEARNLOG_PORT", "8002"))
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"

RUNTIME_DIR = os.path.expanduser("~/.learning-log")

DB_PATH = os.path.join(PROJECT_DIR, "data", "learning-log.db")

MCP_SSE_PORT = int(os.environ.get("MCP_SSE_PORT", "8010"))
