import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from utils.text_processing import STOP_WORDS, ENGLISH_STOP

_EMBEDDING_MODEL = None

def get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            _EMBEDDING_MODEL = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        except Exception:
            _EMBEDDING_MODEL = None
    return _EMBEDDING_MODEL

def compute_embeddings(texts: list[str]):
    model = get_embedding_model()
    if model is not None:
        try:
            return model.encode(texts, show_progress_bar=False)
        except Exception:
            pass
    vec = TfidfVectorizer(max_features=500, stop_words=list(ENGLISH_STOP | STOP_WORDS))
    return vec.fit_transform(texts).toarray()

def cosine_sim_matrix(emb):
    return cosine_similarity(emb)

def to_python(obj):
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, list):
        return [to_python(v) for v in obj]
    if isinstance(obj, dict):
        return {k: to_python(v) for k, v in obj.items()}
    return obj
