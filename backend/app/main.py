"""
Learning Log API Server
FastAPI backend with auto-growing tag system + attention graph
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from app.db import init_db
from app.core.config import DB_PATH
from app.services.embedding_service import get_embedding_model

app = FastAPI(title="Learning Log API", version="2.0.0")

@app.on_event("startup")
def startup():
    init_db()
    _conn = sqlite3.connect(DB_PATH)
    _conn.execute("UPDATE tags SET is_active = 0 WHERE is_auto = 0 AND is_active = 1")
    _conn.commit()
    _conn.close()
    get_embedding_model()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import router

app.include_router(router)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
