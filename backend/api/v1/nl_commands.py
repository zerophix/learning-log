from fastapi import APIRouter, HTTPException
from typing import Optional
from utils.db_utils import get_db, row_to_dict
from models import NLCommandCreate

router = APIRouter()


@router.post("/api/nl-commands")
def create_nl_command(cmd: NLCommandCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO nl_commands (command_text, intent_category, skill_triggered, execution_status, is_effective)
            VALUES (?, ?, ?, ?, ?)
        ''', (cmd.command_text, cmd.intent_category, cmd.skill_triggered, cmd.execution_status, cmd.is_effective))
        conn.commit()
        return {"id": cursor.lastrowid, "message": "NL Command recorded"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/api/nl-commands")
def list_nl_commands(limit: int = 50, offset: int = 0, intent_category: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    if intent_category:
        cursor.execute("SELECT * FROM nl_commands WHERE intent_category = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", (intent_category, limit, offset))
    else:
        cursor.execute("SELECT * FROM nl_commands ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset))
    commands = [row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return commands
