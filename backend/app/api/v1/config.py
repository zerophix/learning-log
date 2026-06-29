from fastapi import APIRouter, HTTPException
from app.core.config_service import get_config_json, get_research_types, get_link_types, get_project_types, get_tag_categories, set_config

router = APIRouter()


@router.get("/api/config/research-types")
def list_research_types():
    return get_research_types()


@router.get("/api/config/link-types")
def list_link_types():
    return get_link_types()


@router.get("/api/config/project-types")
def list_project_types():
    return get_project_types()


@router.get("/api/config/tag-categories")
def list_tag_categories():
    return get_tag_categories()
