from fastapi import APIRouter, HTTPException
from typing import Optional
from app.core.tag_config import TAG_PREFIX, PROJECT_TYPES
from app.utils.db_utils import db_session, row_to_dict, parse_entry_rows

router = APIRouter()

_PROJECT_PREFIX = f"{TAG_PREFIX}.project"


@router.get("/api/projects")
def list_projects(project_type: Optional[str] = None):
    with db_session() as conn:
        cursor = conn.cursor()
        if project_type:
            parent_id = f"{_PROJECT_PREFIX}.{project_type}"
            cursor.execute("SELECT * FROM tags WHERE parent_tag_id = ? AND is_active = 1 ORDER BY tag_name", (parent_id,))
        else:
            cursor.execute("SELECT * FROM tags WHERE tag_category = 'project' AND is_active = 1 ORDER BY tag_name")
        return [row_to_dict(row) for row in cursor.fetchall()]


@router.get("/api/projects/{project_id}/entries")
def get_entries_by_project(project_id: str, research_type: Optional[str] = None):
    with db_session() as conn:
        cursor = conn.cursor()
        if project_id in PROJECT_TYPES:
            prefix = f"{_PROJECT_PREFIX}.{project_id}."
            if research_type:
                cursor.execute(
                    "SELECT * FROM learning_entries WHERE project_tag_id LIKE ? AND research_type = ? ORDER BY timestamp DESC",
                    (f"{prefix}%", research_type)
                )
            else:
                cursor.execute(
                    "SELECT * FROM learning_entries WHERE project_tag_id LIKE ? ORDER BY timestamp DESC",
                    (f"{prefix}%",)
                )
        else:
            if research_type:
                cursor.execute(
                    "SELECT * FROM learning_entries WHERE project_tag_id = ? AND research_type = ? ORDER BY timestamp DESC",
                    (project_id, research_type)
                )
            else:
                cursor.execute(
                    "SELECT * FROM learning_entries WHERE project_tag_id = ? ORDER BY timestamp DESC",
                    (project_id,)
                )
        return parse_entry_rows(cursor.fetchall())
