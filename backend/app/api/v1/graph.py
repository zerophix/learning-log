from fastapi import APIRouter
from collections import Counter
from datetime import datetime
from app.core.tag_config import FALLBACK_RESEARCH_TYPE
from app.utils.db_utils import db_session, row_to_dict
from app.services.attention_service import entries_for_attention
from app.services.embedding_service import compute_embeddings, cosine_sim_matrix, to_python
from app.services.clustering_service import louvain_community_detection, generate_cluster_labels

router = APIRouter()


@router.get("/api/graph")
def get_graph_data():
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT tag_id as id, tag_name as name, tag_category as category, usage_count as value
            FROM tags WHERE is_active = 1 AND is_auto = 1
            ORDER BY usage_count DESC
        """)
        nodes = [row_to_dict(row) for row in cursor.fetchall()]
        cursor.execute("""
            SELECT source_tag_id as source, target_tag_id as target, link_type as label
            FROM tag_links
        """)
        links = [row_to_dict(row) for row in cursor.fetchall()]
        return {"nodes": nodes, "links": links}


def _compute_triggers(entries, timestamps, content_sim, days_limit=14, sim_threshold=0.4):
    triggers = []
    for i in range(len(entries)):
        for j in range(len(entries)):
            if i == j:
                continue
            if entries[i]['timestamp'] >= entries[j]['timestamp']:
                continue
            day_diff = abs((timestamps[j] - timestamps[i]).days)
            if day_diff > days_limit:
                continue
            sim = content_sim[i][j]
            if sim < sim_threshold:
                continue
            triggers.append({
                "source": entries[i]['id'],
                "target": entries[j]['id'],
                "weight": round(sim, 4),
                "day_diff": day_diff,
            })
    return triggers


def _detect_surges(entries, timestamps):
    surge_ids = set()
    for i, e in enumerate(entries):
        nearby = [j for j in range(len(entries))
                  if abs((timestamps[j] - timestamps[i]).days) <= 7]
        avg = sum(entries[j]['energy_level'] for j in nearby) / len(nearby)
        if e['energy_level'] >= 4 and (e['energy_level'] - avg) >= 2:
            surge_ids.add(e['id'])
    return surge_ids


def _detect_jumps(entries):
    jumps = []
    sorted_indices = sorted(range(len(entries)), key=lambda i: entries[i]['timestamp'])
    for k in range(len(sorted_indices) - 1):
        i, j = sorted_indices[k], sorted_indices[k + 1]
        a_type = entries[i].get('research_type') or FALLBACK_RESEARCH_TYPE
        b_type = entries[j].get('research_type') or FALLBACK_RESEARCH_TYPE
        if a_type != b_type:
            jumps.append({
                "source": entries[i]['id'],
                "target": entries[j]['id'],
                "from_type": a_type,
                "to_type": b_type,
            })
    return jumps


@router.get("/api/graph/attention")
def get_attention_graph(
    w_content: float = 0.6,
    w_tags: float = 0.25,
    w_temporal: float = 0.15,
    top_k: int = 5,
    research_type: str | None = None,
):
    with db_session() as conn:
        entries = entries_for_attention(conn, research_type)

    if len(entries) < 2:
        return {
            "nodes": [], "edges": [], "clusters": [], "triggers": [], "jumps": [],
            "weights": {"content": w_content, "tags": w_tags, "temporal": w_temporal},
        }

    n = len(entries)

    texts = [f"{e['topic']} {e.get('summary', '') or ''} {e.get('insight', '') or ''}"[:2000] for e in entries]
    try:
        emb = compute_embeddings(texts)
        content_sim = cosine_sim_matrix(emb)
    except Exception:
        content_sim = [[0.0] * n for _ in range(n)]

    tag_sets = [set(e.get('custom_tags') or []) for e in entries]
    tag_sim = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            a, b = tag_sets[i], tag_sets[j]
            if not a or not b:
                tag_sim[i][j] = 0.0
            else:
                union = a | b
                tag_sim[i][j] = len(a & b) / len(union) if union else 0.0

    timestamps = []
    for e in entries:
        try:
            ts = datetime.strptime(e['timestamp'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            ts = datetime.strptime(e['timestamp'], '%Y-%m-%dT%H:%M:%S')
        timestamps.append(ts)

    min_ts = min(timestamps)
    max_diff = (max(timestamps) - min_ts).days or 1
    temporal_sim = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            diff_days = abs((timestamps[i] - timestamps[j]).days)
            temporal_sim[i][j] = 1.0 - (diff_days / max_diff)

    attn = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            attn[i][j] = w_content * content_sim[i][j] + w_tags * tag_sim[i][j] + w_temporal * temporal_sim[i][j]

    clusters = louvain_community_detection(attn, n, resolution=1.0)
    n_clusters = max(clusters) + 1 if clusters else 1
    cluster_labels = generate_cluster_labels(entries, clusters, n_clusters)

    edge_set = set()
    edges = []
    for i in range(n):
        sims = [(j, attn[i][j]) for j in range(n) if j != i]
        sims.sort(key=lambda x: -x[1])
        for j, w in sims[:top_k]:
            if w > 0.05:
                key = (min(i, j), max(i, j))
                if key not in edge_set:
                    edge_set.add(key)
                    edges.append({
                        "source": entries[i]['id'],
                        "target": entries[j]['id'],
                        "weight": round(w, 4),
                        "heads": {
                            "content": round(content_sim[i][j], 4),
                            "tags": round(tag_sim[i][j], 4),
                            "temporal": round(temporal_sim[i][j], 4),
                        }
                    })

    degree = Counter()
    for e in edges:
        degree[e['source']] += 1
        degree[e['target']] += 1

    surges = _detect_surges(entries, timestamps)

    nodes = []
    for i, e in enumerate(entries):
        cluster_id = int(clusters[i])
        nodes.append({
            "id": e['id'],
            "topic": e['topic'],
            "summary": (e.get('summary') or '')[:100],
            "full_summary": e.get('summary') or '',
            "energy": e['energy_level'],
            "aha": bool(e['aha_moment']),
            "research_type": e.get('research_type') or FALLBACK_RESEARCH_TYPE,
            "cluster": cluster_id,
            "cluster_name": cluster_labels.get(cluster_id, f'聚类 {cluster_id + 1}'),
            "timestamp": e['timestamp'],
            "degree": degree.get(e['id'], 0),
            "tag_count": len(e.get('custom_tags') or []),
            "tags": e.get('custom_tags') or [],
            "is_surge": e['id'] in surges,
        })

    edges.sort(key=lambda x: -x['weight'])

    triggers = _compute_triggers(entries, timestamps, content_sim)
    jumps = _detect_jumps(entries)

    cluster_list = []
    for i in range(n_clusters):
        cluster_list.append(cluster_labels.get(i, f'聚类 {i + 1}'))

    result = {
        "nodes": nodes,
        "edges": edges,
        "triggers": triggers,
        "jumps": jumps,
        "clusters": cluster_list,
        "weights": {"content": w_content, "tags": w_tags, "temporal": w_temporal},
        "entry_count": n,
    }
    return to_python(result)
