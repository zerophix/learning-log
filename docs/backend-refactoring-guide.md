# Learning Log Backend Refactoring Guide

## Achieved Architecture (After 6 Phases)

### Code Anatomy

| File | Lines | Responsibility |
|------|-------|----------------|
| `main.py` | **72** | App init + startup + middleware + include_routers |
| `db/__init__.py` | 20 | DB_PATH + init_db (re-exports) |
| `db/schema.py` | 78 | Table DDL in SQL string |
| `db/migrations.py` | 18 | ALTER TABLE migrations |
| `clustering.py` | 321 | Louvain + cluster labeling (unchanged) |
| `models/__init__.py` | 42 | 6 Pydantic models |
| `api/v1/entries.py` | 369 | 12 entry/tag/backfill endpoints |
| `api/v1/tags.py` | 181 | 8 tag + tag-link endpoints |
| `api/v1/graph.py` | 142 | 2 graph endpoints |
| `api/v1/projects.py` | 36 | 2 project endpoints |
| `api/v1/stats.py` | 17 | 1 stats endpoint |
| `api/v1/nl_commands.py` | 37 | 2 NL command endpoints |
| `utils/db_utils.py` | 42 | get_db, db_session, row_to_dict, parse_entry_rows |
| `utils/text_processing.py` | 125 | extract_summary, auto_extract_tags, ensure_tags, STOP_WORDS |
| `utils/date_utils.py` | 14 | get_week_dates |
| `services/embedding_service.py` | 44 | SentenceTransformer + TF-IDF fallback |
| `services/attention_service.py` | 36 | entries_for_attention, infer_research_type |
| `services/ai_service.py` | 50 | call_ai_for_analysis (MCP) |
| `services/lifecycle.py` | 81 | Backend lifecycle management (MCP) |
| `mcp_server.py` | 300 | MCP tool definitions + handlers + SSE/STDIO |

### Directory Structure

```
backend/
├── main.py                 # 72 lines — just app init + include_routers
├── mcp_server.py            # 300 lines — MCP protocol + tool handlers
├── clustering.py            # Unchanged (321 lines)
├── db/                      # Phase 5: Database package
│   ├── __init__.py          # DB_PATH + init_db
│   ├── schema.py            # Table DDL
│   └── migrations.py        # ALTER TABLE migrations
├── models/
│   └── __init__.py          # 6 Pydantic models
├── api/
│   └── v1/                  # Phase 3: Route routers
│       ├── entries.py       # Entry CRUD + feed + week + neighbors
│       ├── tags.py          # Tag CRUD + tree + links + cloud
│       ├── graph.py         # Graph data + attention graph
│       ├── projects.py      # Project listing + entries
│       ├── stats.py         # Health check stats
│       └── nl_commands.py   # NL command recording
├── services/                # Phase 4+6: Business logic
│   ├── embedding_service.py # Embedding model + compute
│   ├── attention_service.py # Attention graph helpers
│   ├── ai_service.py        # AI analysis (MCP)
│   └── lifecycle.py         # Backend lifecycle (MCP)
└── utils/                   # Phase 2: Stateless helpers
    ├── db_utils.py          # DB connection + row helpers
    ├── text_processing.py   # Tag extraction + NLP
    └── date_utils.py        # Week date calculation
```

### Key Changes Made

| Phase | What | Risk | Status |
|-------|------|------|--------|
| 1 | Pydantic models → `models/__init__.py` | Low | ✅ |
| 2 | Utility functions → `utils/{db_utils,text_processing,date_utils}.py` | Low | ✅ |
| 3 | API routes → `api/v1/{entries,tags,graph,projects,stats,nl_commands}.py` | Medium | ✅ |
| 4 | Business logic → `services/{embedding,attention}_service.py` | Medium | ✅ |
| 5 | DB layer → `db/{schema,migrations}.py` | Medium | ✅ |
| 6 | MCP server modularized → `services/{ai,lifecycle}.py` + `mcp_server.py` | Low | ✅ |

### Verification

All 14 API endpoints return 200:
- `/api/stats`, `/api/tags`, `/api/tags/tree`, `/api/tag-links`
- `/api/graph`, `/api/projects`, `/api/nl-commands`
- `/api/tags/cloud`, `/api/tags/auto`, `/api/entries/week-index`
- `/api/entries`, `/api/entries/{id}`, `/api/entries/feed`
- `/api/entries/week`

MCP server imports cleanly: `python3 -c "import mcp_server"`
