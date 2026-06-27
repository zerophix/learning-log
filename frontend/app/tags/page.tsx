'use client';
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import Navigation from '@/components/layout/Navigation';
import PageHeader from '@/components/layout/PageHeader';
import EntryDetail from '@/components/entry/EntryDetail';
import { IconTag, IconHourglass, IconEmpty, IconNetwork } from '@/components/ui/Icons';
import type { AttentionGraph, AttentionNode, Entry } from '@/types';

const CLUSTER_COLORS = ['#34d399', '#38bdf8', '#f59e0b', '#818cf8', '#fb923c', '#f472b6', '#2dd4bf', '#a78bfa', '#f87171', '#10b981'];
const CLUSTER_BG = ['#064e3b', '#0c4a6e', '#78350f', '#312e81', '#7c2d12', '#831843', '#134e4a', '#4c1d95', '#7f1d1d', '#064e3b'];

export default function ClusterPage() {
  const [attention, setAttention] = useState<AttentionGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [entriesMap, setEntriesMap] = useState(new Map<number, Entry>());

  useEffect(() => {
    api.attention({ top_k: 5 })
      .then(async data => {
        setAttention(data);
        // Fetch full entries for each node
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

  // Group nodes by cluster
  const clusters = useMemo(() => {
    if (!attention) return [];
    const groups = new Map<number, AttentionNode[]>();
    attention.nodes.forEach(n => {
      const list = groups.get(n.cluster) || [];
      list.push(n);
      groups.set(n.cluster, list);
    });
    return attention.clusters.map((name, i) => ({
      index: i,
      name,
      nodes: groups.get(i) || [],
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      bg: CLUSTER_BG[i % CLUSTER_BG.length],
    }));
  }, [attention]);

  // Cross-cluster edges summary
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
        ) : !attention || clusters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
            <IconEmpty size={64} /><p>需要至少 2 条记录才能生成聚类</p>
          </div>
        ) : selectedClusterData ? (
          // ── Cluster detail view ──
          <div>
            <button onClick={() => setSelectedCluster(null)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '13px', padding: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ← 返回聚类概览
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: selectedClusterData.color }} />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{selectedClusterData.name}</h2>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedClusterData.nodes.length} 条记录</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedClusterData.nodes.map(n => {
                const entry = entriesMap.get(n.id);
                return (
                  <div key={n.id} onClick={() => entry && setSelectedEntry(entry)}
                    style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = selectedClusterData.color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{n.topic}</div>
                    {entry && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                        <span>能量 {entry.energy_level}</span>
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
          // ── Cluster overview ──
          <>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                基于 {attention.entry_count} 条记录的语义嵌入自动聚类（k-means）
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                attention 权重: 内容 {(attention.weights.content*100).toFixed(0)}% / 标签 {(attention.weights.tags*100).toFixed(0)}% / 时间 {(attention.weights.temporal*100).toFixed(0)}%
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {clusters.map(c => (
                <div key={c.index} onClick={() => setSelectedCluster(c.index)}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', borderLeft: `3px solid ${c.color}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name.length > 28 ? c.name.slice(0, 26) + '…' : c.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{c.nodes.length} 条</span>
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
                      <span style={{ color: CLUSTER_COLORS[e.c1 % CLUSTER_COLORS.length], fontWeight: 500 }}>{clusters[e.c1]?.name.slice(0, 20)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>↔</span>
                      <span style={{ color: CLUSTER_COLORS[e.c2 % CLUSTER_COLORS.length], fontWeight: 500 }}>{clusters[e.c2]?.name.slice(0, 20)}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{e.count} 条边 · 平均权重 {(e.avgWeight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
