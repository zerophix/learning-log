'use client';
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import EntryDetail from '@/components/entry/EntryDetail';
import { IconTag, IconHourglass, IconEmpty, IconNetwork } from '@/components/ui/Icons';
import type { AttentionGraph, AttentionNode, Entry } from '@/types';
import { RESEARCH_TYPE_COLORS, RESEARCH_TYPE_LABELS, getResearchTypeInfo } from '@/lib/constants';

const CLUSTER_COLORS = ['#34d399', '#38bdf8', '#f59e0b', '#818cf8', '#fb923c', '#f472b6', '#2dd4bf', '#a78bfa', '#f87171', '#10b981'];
const CLUSTER_BG = ['#064e3b', '#0c4a6e', '#78350f', '#312e81', '#7c2d12', '#831843', '#134e4a', '#4c1d95', '#7f1d1d', '#064e3b'];

const RESEARCH_MODES = [
  { id: null as string | null, label: '全部', desc: '所有类型的语义聚类分析' },
  { id: 'deep-research', label: '深度研究', color: RESEARCH_TYPE_COLORS['deep-research'], desc: '单一主题纵深挖掘' },
  { id: 'topic-exploration', label: '主题探索', color: RESEARCH_TYPE_COLORS['topic-exploration'], desc: '发散式探索与连接' },
  { id: 'domain-mapping', label: '领域映射', color: RESEARCH_TYPE_COLORS['domain-mapping'], desc: '领域间相关性映射' },
];

export default function ClusterPage() {
  const [attention, setAttention] = useState<AttentionGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [researchMode, setResearchMode] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [entriesMap, setEntriesMap] = useState(new Map<number, Entry>());

  useEffect(() => {
    api.attention({ top_k: 5 })
      .then(async data => {
        setAttention(data);
        const entries = await Promise.all(
          data.nodes.map(n => api.entries.get(n.id).catch(() => null))
        );
        const map = new Map<number, Entry>();
        entries.forEach(e => { if (e) map.set(e.id, e); });
        setEntriesMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const clusters = useMemo(() => {
    if (!attention) return [];
    const groups = new Map<number, AttentionNode[]>();
    attention.nodes.forEach(n => {
      const entry = entriesMap.get(n.id);
      if (researchMode && entry?.research_type !== researchMode) return;
      const list = groups.get(n.cluster) || [];
      list.push(n);
      groups.set(n.cluster, list);
    });
    return attention.clusters.map((name, i) => ({
      index: i,
      name,
      nodes: groups.get(i) || [],
      total: attention.nodes.filter(n => n.cluster === i).length,
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      bg: CLUSTER_BG[i % CLUSTER_BG.length],
    })).filter(c => c.nodes.length > 0);
  }, [attention, researchMode, entriesMap]);

  const crossClusterEdges = useMemo(() => {
    if (!attention) return [];
    const pairs = new Map();
    attention.edges.forEach(e => {
      const srcNode = attention.nodes.find(n => n.id === e.source);
      const tgtNode = attention.nodes.find(n => n.id === e.target);
      if (!srcNode || !tgtNode) return;
      const c1 = Math.min(srcNode.cluster, tgtNode.cluster);
      const c2 = Math.max(srcNode.cluster, tgtNode.cluster);
      if (c1 === c2) return;
      const key = `${c1}-${c2}`;
      const existing = pairs.get(key) || { count: 0, totalWeight: 0 };
      existing.count += 1;
      existing.totalWeight += e.weight;
      pairs.set(key, existing);
    });
    return Array.from(pairs.entries())
      .map(([key, val]: [string, { count: number; totalWeight: number }]) => {
        const [c1, c2] = key.split('-').map(Number);
        return { c1, c2, count: val.count, avgWeight: val.totalWeight / val.count };
      })
      .sort((a, b) => b.avgWeight - a.avgWeight);
  }, [attention]);

  const selectedClusterData = selectedCluster !== null ? clusters.find(c => c.index === selectedCluster) : null;
  const currentMode = RESEARCH_MODES.find(m => m.id === researchMode) || RESEARCH_MODES[0];

  return (
    <div style={{ height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader icon={<IconTag size={24} />} title="语义聚类">
        <Navigation />
      </PageHeader>

      <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
            <IconHourglass size={32} /> 计算聚类中...
          </div>
        ) : !attention || attention.nodes.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
            <IconEmpty size={64} /><p>需要至少 2 条记录才能生成聚类</p>
          </div>
        ) : selectedClusterData ? (
          // ── Cluster detail ──
          <div>
            <button onClick={() => setSelectedCluster(null)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '13px', padding: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ← 返回聚类概览
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: selectedClusterData.color }} />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{selectedClusterData.name}</h2>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedClusterData.nodes.length} / {selectedClusterData.total} 条</span>
              {researchMode && <span style={{ fontSize: '11px', color: RESEARCH_TYPE_COLORS[researchMode] || 'var(--text-muted)' }}>· {RESEARCH_TYPE_LABELS[researchMode]}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedClusterData.nodes.map(n => {
                const entry = entriesMap.get(n.id);
                const typeColor = entry?.research_type ? (RESEARCH_TYPE_COLORS[entry.research_type] || '#64748b') : '#64748b';
                return (
                  <div key={n.id} onClick={() => entry && setSelectedEntry(entry)}
                    style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', cursor: 'pointer', borderLeft: `3px solid ${selectedClusterData.color}`, transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = selectedClusterData.color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{n.topic}</div>
                    {entry && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>能量 {entry.energy_level}</span>
                        <span style={{ color: typeColor }}>{entry.research_type ? RESEARCH_TYPE_LABELS[entry.research_type] || entry.research_type : '未分类'}</span>
                        <span>{new Date(entry.timestamp).toLocaleDateString('zh-CN')}</span>
                        {entry.custom_tags?.length > 0 && (
                          <span>标签: {entry.custom_tags.slice(0, 4).join(' · ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // ── Cluster overview with research tabs ──
          <>
            {/* Research type tabs */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {RESEARCH_MODES.map(mode => (
                  <button key={mode.id || 'all'}
                    onClick={() => setResearchMode(mode.id)}
                    style={{
                      padding: '8px 18px', borderRadius: '20px', cursor: 'pointer',
                      border: researchMode === mode.id ? 'none' : '1px solid var(--border-color)',
                      background: researchMode === mode.id && mode.color ? mode.color : 'transparent',
                      color: researchMode === mode.id ? 'var(--bg-primary)' : 'var(--text-muted)',
                      fontSize: '13px', fontWeight: researchMode === mode.id ? 600 : 400,
                      transition: 'all 0.2s',
                    }}>
                    {mode.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: currentMode.color || 'var(--text-muted)', lineHeight: 1.5, padding: '0 4px' }}>
                {currentMode.desc} · 基于 {attention.entry_count} 条记录的语义嵌入自动聚类
              </div>
            </div>

            {/* Cluster cards */}
            {clusters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <IconEmpty size={48} /><p>该类型下暂无聚类数据</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  {clusters.map(c => (
                    <div key={c.index} onClick={() => setSelectedCluster(c.index)}
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', borderLeft: `3px solid ${c.color}` }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name.length > 28 ? c.name.slice(0, 26) + '…' : c.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{c.nodes.length}/{c.total} 条</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {c.nodes.slice(0, 4).map(n => n.topic).join(' · ')}
                        {c.nodes.length > 4 && <span style={{ color: 'var(--text-muted)' }}> · 还有 {c.nodes.length - 4} 条</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cross-cluster connections */}
                {crossClusterEdges.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <IconNetwork size={16} color="#64748b" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>跨聚类关联</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>聚类之间的注意力连接</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {crossClusterEdges.map((e, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '12px' }}>
                          <span style={{ color: CLUSTER_COLORS[e.c1 % CLUSTER_COLORS.length], fontWeight: 500 }}>{clusters.find(c => c.index === e.c1)?.name.slice(0, 20) || `Cluster ${e.c1}`}</span>
                          <span style={{ color: 'var(--text-muted)' }}>↔</span>
                          <span style={{ color: CLUSTER_COLORS[e.c2 % CLUSTER_COLORS.length], fontWeight: 500 }}>{clusters.find(c => c.index === e.c2)?.name.slice(0, 20) || `Cluster ${e.c2}`}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{e.count} 条边 · 平均权重 {(e.avgWeight * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
