"""
API v1 router aggregation.
Combines all domain routers into a single APIRouter for main.py to mount.
"""
from fastapi import APIRouter

from app.api.v1.tags import router as tags_router
from app.api.v1.entries import router as entries_router
from app.api.v1.graph import router as graph_router
from app.api.v1.projects import router as projects_router
from app.api.v1.stats import router as stats_router
from app.api.v1.nl_commands import router as nl_commands_router
from app.api.v1.config import router as config_router

router = APIRouter()
router.include_router(tags_router)
router.include_router(entries_router)
router.include_router(graph_router)
router.include_router(projects_router)
router.include_router(stats_router)
router.include_router(nl_commands_router)
router.include_router(config_router)
