from fastapi import APIRouter
from app.utils.db_utils import db_session

router = APIRouter()


@router.get("/api/stats")
def get_stats():
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM learning_entries")
        entry_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM tags WHERE is_active = 1")
        tag_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM tag_links")
        link_count = cursor.fetchone()[0]
        return {"entries": entry_count, "tags": tag_count, "links": link_count}
