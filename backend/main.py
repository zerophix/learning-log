"""
Learning Log API Server
FastAPI backend with auto-growing tag system + attention graph
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from db import DB_PATH, init_db
from services.embedding_service import get_embedding_model

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

from api.v1.tags import router as tags_router
from api.v1.entries import router as entries_router
from api.v1.graph import router as graph_router
from api.v1.projects import router as projects_router
from api.v1.stats import router as stats_router
from api.v1.nl_commands import router as nl_commands_router

app.include_router(tags_router)
app.include_router(entries_router)
app.include_router(graph_router)
app.include_router(projects_router)
app.include_router(stats_router)
app.include_router(nl_commands_router)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
