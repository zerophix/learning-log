"""
Services — business logic layer.
"""
from app.services.embedding_service import get_embedding_model, compute_embeddings, cosine_sim_matrix, to_python
from app.services.attention_service import entries_for_attention, infer_research_type
from app.services.clustering_service import louvain_community_detection, generate_cluster_labels, analyze_clusters
from app.services.ai_service import analyze as ai_analyze, get_default_entry
from app.services.lifecycle import check_alive, start, ensure, save_entry, BACKEND_URL
