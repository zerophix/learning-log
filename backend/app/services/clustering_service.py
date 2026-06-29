"""
Learning Log - 智能聚类模块
基于 Attention 矩阵的社区检测和聚类标签生成
"""

from collections import Counter
from typing import Optional
import re


# ==================== Louvain 社区检测 ====================

def louvain_community_detection(
    similarity_matrix: list[list[float]],
    n: int,
    resolution: float = 1.0
) -> list[int]:
    """
    简化的 Louvain 社区检测算法（Greedy Modularity Optimization）
    
    Args:
        similarity_matrix: n×n 相似度矩阵
        n: 节点数量
        resolution: 分辨率参数（>1 产生更多小社区，<1 产生更少大社区）
    
    Returns:
        communities: 每个节点的社区分配 (0-based)
    """
    if n <= 1:
        return [0]
    
    # Phase 1: 每个节点初始化为自己的社区
    communities = list(range(n))
    
    # 计算每个节点的总相似度（用于模块度计算）
    node_strength = [sum(similarity_matrix[i]) for i in range(n)]
    total_strength = sum(node_strength)
    
    if total_strength == 0:
        return [0] * n
    
    # 迭代优化
    improved = True
    while improved:
        improved = False
        for i in range(n):
            current_comm = communities[i]
            
            # 计算将节点 i 移动到每个邻居社区带来的模块度增益
            best_comm = current_comm
            best_gain = 0.0
            
            # 获取节点 i 的邻居社区
            neighbor_comms = set()
            for j in range(n):
                if similarity_matrix[i][j] > 0.05 and j != i:
                    neighbor_comms.add(communities[j])
            
            for target_comm in neighbor_comms:
                if target_comm == current_comm:
                    continue
                
                # 计算模块度增益（简化版）
                # ΔQ = [Σ_in + 2*k_i_in] - [Σ_tot + k_i]^2 - [Σ_in - Σ_tot^2]
                # 简化：使用社区内部连接密度变化
                gain = _compute_modularity_gain(
                    i, current_comm, target_comm,
                    similarity_matrix, communities, node_strength, total_strength, resolution
                )
                
                if gain > best_gain:
                    best_gain = gain
                    best_comm = target_comm
            
            if best_comm != current_comm:
                communities[i] = best_comm
                improved = True
    
    # 重新编号社区（确保从0开始连续）
    comm_map = {}
    new_communities = []
    for c in communities:
        if c not in comm_map:
            comm_map[c] = len(comm_map)
        new_communities.append(comm_map[c])
    
    return new_communities


def _compute_modularity_gain(
    node_idx: int,
    current_comm: int,
    target_comm: int,
    sim_matrix: list[list[float]],
    communities: list[int],
    node_strength: list[float],
    total_strength: float,
    resolution: float
) -> float:
    """计算将节点移动到目标社区的模块度增益"""
    # 当前社区内部连接
    sum_in = 0.0
    for i in range(len(communities)):
        if communities[i] == current_comm:
            for j in range(len(communities)):
                if communities[j] == current_comm:
                    sum_in += sim_matrix[i][j]
    
    # 目标社区内部连接
    sum_target = 0.0
    for i in range(len(communities)):
        if communities[i] == target_comm:
            for j in range(len(communities)):
                if communities[j] == target_comm:
                    sum_target += sim_matrix[i][j]
    
    # 目标社区总强度
    sum_tot = sum(node_strength[i] for i in range(len(communities)) if communities[i] == target_comm)
    
    # 节点到目标社区的连接
    ki_in = sum(sim_matrix[node_idx][j] for j in range(len(communities)) if communities[j] == target_comm)
    
    # 节点强度
    ki = node_strength[node_idx]
    
    if total_strength == 0:
        return 0.0
    
    # 模块度增益公式（简化版）
    gain = (2 * ki_in - resolution * (2 * sum_tot + ki) * ki / total_strength) / total_strength
    
    return gain


# ==================== 聚类标签生成 ====================

def generate_cluster_labels(
    entries: list[dict],
    clusters: list[int],
    n_clusters: int
) -> dict[int, str]:
    """
    根据每个聚类中的条目自动生成语义化标签
    
    Args:
        entries: 条目列表，每项包含 topic, custom_tags, research_type 等字段
        clusters: 每个节点所属的聚类
        n_clusters: 聚类数量
    
    Returns:
        {cluster_id: label} 映射
    """
    # 收集每个聚类的标签
    cluster_tags: dict[int, list[str]] = {i: [] for i in range(n_clusters)}
    cluster_topics: dict[int, list[str]] = {i: [] for i in range(n_clusters)}
    cluster_research_types: dict[int, list[str]] = {i: [] for i in range(n_clusters)}
    
    for entry, cluster in zip(entries, clusters):
        # 提取标签
        tags = entry.get('custom_tags') or []
        if isinstance(tags, str):
            tags = []
        cluster_tags[cluster].extend(tags)
        
        # 提取主题（分词后取关键名词）
        topic = entry.get('topic', '')
        cluster_topics[cluster].append(topic)
        
        # 研究类型
        rtype = entry.get('research_type', 'deep-research')
        cluster_research_types[cluster].append(rtype)
    
    labels = {}
    for cluster_id in range(n_clusters):
        label = _generate_single_label(
            cluster_id,
            cluster_tags[cluster_id],
            cluster_topics[cluster_id],
            cluster_research_types[cluster_id],
            len([c for c in clusters if c == cluster_id])
        )
        labels[cluster_id] = label
    
    return labels


def _generate_single_label(
    cluster_id: int,
    tags: list[str],
    topics: list[str],
    research_types: list[str],
    size: int
) -> str:
    """为单个聚类生成标签"""
    
    # 1. 优先使用高频标签
    if tags:
        tag_counter = Counter(tags)
        top_tags = [tag for tag, count in tag_counter.most_common(3) if count >= 1]
        if top_tags:
            return ' · '.join(top_tags[:2]) + (f' +{size}' if size > 1 else '')
    
    # 2. 从主题中提取关键词
    if topics:
        # 取主题中的公共部分
        topic_words = []
        for topic in topics:
            words = re.findall(r'[\u4e00-\u9fffA-Za-z]+', topic)
            topic_words.extend(words[:3])
        if topic_words:
            word_counter = Counter(topic_words)
            common = word_counter.most_common(2)
            if common:
                label = ' · '.join(w for w, _ in common)
                return f'{label} (聚类 {cluster_id + 1})' if size > 3 else label
    
    # 3. 使用研究类型作为标签
    if research_types:
        rtype_counter = Counter(research_types)
        dominant = rtype_counter.most_common(1)[0][0]
        rtype_name = {
            'deep-research': '深度研究',
            'topic-exploration': '主题探索',
            'domain-mapping': '领域映射',
        }.get(dominant, dominant)
        return f'{rtype_name} #{cluster_id + 1}'
    
    return f'聚类 {cluster_id + 1}'


# ==================== 聚类分析 ====================

def analyze_clusters(
    entries: list[dict],
    clusters: list[int],
    n_clusters: int
) -> list[dict]:
    """
    分析每个聚类的统计信息
    
    Returns:
        [{
            "id": int,
            "label": str,
            "size": int,
            "avg_energy": float,
            "dominant_research_type": str,
            "entries": [entry_id, ...]
        }]
    """
    labels = generate_cluster_labels(entries, clusters, n_clusters)
    
    cluster_data = {}
    for i in range(n_clusters):
        cluster_data[i] = {
            'entries': [],
            'energies': [],
            'research_types': [],
        }
    
    for entry, cluster in zip(entries, clusters):
        cluster_data[cluster]['entries'].append(entry['id'])
        cluster_data[cluster]['energies'].append(entry.get('energy_level', 3))
        cluster_data[cluster]['research_types'].append(
            entry.get('research_type', 'deep-research')
        )
    
    result = []
    for cluster_id, data in cluster_data.items():
        if not data['entries']:
            continue
        
        # 主要研究类型
        rtype_counter = Counter(data['research_types'])
        dominant = rtype_counter.most_common(1)[0][0] if data['research_types'] else 'deep-research'
        
        result.append({
            'id': cluster_id,
            'label': labels.get(cluster_id, f'聚类 {cluster_id + 1}'),
            'size': len(data['entries']),
            'avg_energy': round(sum(data['energies']) / len(data['energies']), 2) if data['energies'] else 0,
            'dominant_research_type': dominant,
            'entries': data['entries'],
        })
    
    return sorted(result, key=lambda x: -x['size'])


# ==================== 标签云生成 ====================

def generate_cluster_tag_cloud(
    entries: list[dict],
    clusters: list[int],
    n_clusters: int
) -> dict[int, list[dict]]:
    """
    为每个聚类生成标签云
    
    Returns:
        {cluster_id: [{"tag": str, "count": int}, ...]}
    """
    result = {}
    for cluster_id in range(n_clusters):
        tags = []
        for entry, c in zip(entries, clusters):
            if c == cluster_id:
                entry_tags = entry.get('custom_tags') or []
                if isinstance(entry_tags, str):
                    entry_tags = []
                tags.extend(entry_tags)
        
        if tags:
            counter = Counter(tags)
            result[cluster_id] = [
                {"tag": tag, "count": count}
                for tag, count in counter.most_common(10)
            ]
        else:
            result[cluster_id] = []
    
    return result