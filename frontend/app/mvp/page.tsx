'use client';

import { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8002';

interface MvpEntry {
  id: number;
  topic: string;
  insight: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  energy_level: number;
  timestamp: string;
  research_type?: string;
  topic_tag_id?: string;
  project_tag_id?: string;
  reviewer?: string;
  review_comment?: string;
  reviewed_at?: string;
}

const STATUS_CONFIG = {
  pending: { label: '待审核', color: '#fbbf24', bg: '#fbbf2415' },
  approved: { label: '已通过', color: '#34d399', bg: '#34d39915' },
  rejected: { label: '已拒绝', color: '#f87171', bg: '#f8717115' },
};

const PRIORITY_CONFIG = {
  high: { label: '高优先级', color: '#ef4444' },
  medium: { label: '中优先级', color: '#f59e0b' },
  low: { label: '低优先级', color: '#6b7280' },
};

export default function MvpPage() {
  const [entries, setEntries] = useState<MvpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedEntry, setSelectedEntry] = useState<MvpEntry | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/entries?limit=100&offset=0`);
      const data = await res.json();
      
      // 模拟 MVP 数据（实际应该从后端获取）
      const mvpEntries: MvpEntry[] = (Array.isArray(data) ? data : []).map((entry: any, index: number) => ({
        ...entry,
        status: index % 3 === 0 ? 'pending' : index % 3 === 1 ? 'approved' : 'rejected',
        priority: index % 4 === 0 ? 'high' : index % 4 === 1 ? 'medium' : 'low',
      }));
      
      setEntries(mvpEntries);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      // TODO: 调用后端 API 更新状态
      setEntries(prev => prev.map(entry => 
        entry.id === id ? { ...entry, status: 'approved', reviewer: '当前用户', reviewed_at: new Date().toISOString() } : entry
      ));
      setSelectedEntry(null);
      setReviewComment('');
    } catch (error) {
      console.error('审核失败:', error);
    }
  };

  const handleReject = async (id: number) => {
    if (!reviewComment.trim()) {
      alert('请填写拒绝原因');
      return;
    }
    
    try {
      // TODO: 调用后端 API 更新状态
      setEntries(prev => prev.map(entry => 
        entry.id === id ? { ...entry, status: 'rejected', review_comment: reviewComment, reviewer: '当前用户', reviewed_at: new Date().toISOString() } : entry
      ));
      setSelectedEntry(null);
      setReviewComment('');
    } catch (error) {
      console.error('拒绝失败:', error);
    }
  };

  const filteredEntries = entries.filter(entry => 
    filter === 'all' || entry.status === filter
  );

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* 顶部导航 */}
      <header style={{ borderBottom: '1px solid #1E293B', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F172A' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.5px' }}>MVP 审核管理</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>Minimum Viable Product - 内容审核与发布管理</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#94A3B8' }}>
            总计: <strong style={{ color: '#F8FAFC' }}>{entries.length}</strong> | 
            待审核: <strong style={{ color: '#fbbf24' }}>{entries.filter(e => e.status === 'pending').length}</strong>
          </span>
        </div>
      </header>

      {/* 筛选栏 */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid #1E293B', display: 'flex', gap: '8px' }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: filter === status ? 'none' : '1px solid #334155',
              background: filter === status ? (STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#38bdf8') : 'transparent',
              color: filter === status ? '#0F172A' : '#94A3B8',
              fontSize: '13px',
              fontWeight: filter === status ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {status === 'all' ? '全部' : STATUS_CONFIG[status].label}
          </button>
        ))}
      </div>

      {/* 表格区域 */}
      <main style={{ padding: '24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>加载中...</div>
        ) : (
          <div style={{ background: '#1E293B', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', background: '#0F172A' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>主题</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>状态</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>优先级</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>能量值</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>创建时间</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => (
                  <tr 
                    key={entry.id} 
                    style={{ borderBottom: '1px solid #1E293B', transition: 'background 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#33415520'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#F1F5F9', marginBottom: '4px' }}>{entry.topic}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.insight}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: STATUS_CONFIG[entry.status].bg,
                        color: STATUS_CONFIG[entry.status].color,
                        border: `1px solid ${STATUS_CONFIG[entry.status].color}30`
                      }}>
                        {STATUS_CONFIG[entry.status].label}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        fontSize: '12px', 
                        color: PRIORITY_CONFIG[entry.priority].color,
                        fontWeight: 500
                      }}>
                        {PRIORITY_CONFIG[entry.priority].label}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: entry.energy_level >= 4 ? '#34d39915' : '#fbbf2415',
                        color: entry.energy_level >= 4 ? '#34d399' : '#fbbf24'
                      }}>
                        {entry.energy_level}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#94A3B8' }}>
                      {formatDate(entry.timestamp)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntry(entry);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                          background: 'transparent',
                          color: '#94A3B8',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#38bdf8';
                          e.currentTarget.style.color = '#38bdf8';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#334155';
                          e.currentTarget.style.color = '#94A3B8';
                        }}
                      >
                        审核
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 审核弹窗 */}
      {selectedEntry && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.9)', 
            backdropFilter: 'blur(4px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100 
          }} 
          onClick={() => {
            setSelectedEntry(null);
            setReviewComment('');
          }}
        >
          <div 
            style={{ 
              background: '#1E293B', 
              border: '1px solid #334155', 
              borderRadius: '16px', 
              padding: '32px', 
              maxWidth: '700px', 
              width: '90%', 
              maxHeight: '85vh', 
              overflow: 'auto',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: '#F8FAFC' }}>{selectedEntry.topic}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: STATUS_CONFIG[selectedEntry.status].bg,
                    color: STATUS_CONFIG[selectedEntry.status].color
                  }}>
                    {STATUS_CONFIG[selectedEntry.status].label}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: PRIORITY_CONFIG[selectedEntry.priority].color,
                    fontWeight: 500
                  }}>
                    {PRIORITY_CONFIG[selectedEntry.priority].label}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedEntry(null);
                  setReviewComment('');
                }}
                style={{ 
                  background: '#334155', 
                  border: 'none', 
                  color: '#94A3B8', 
                  fontSize: '18px', 
                  cursor: 'pointer', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>洞察内容</div>
              <div style={{ 
                fontSize: '14px', 
                lineHeight: '1.7', 
                color: '#CBD5E1', 
                background: '#0F172A', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #1E293B'
              }}>
                {selectedEntry.insight}
              </div>
            </div>

            {selectedEntry.status === 'pending' && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>审核意见（拒绝时必填）</div>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="请输入审核意见..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#0F172A',
                    color: '#F8FAFC',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            )}

            {selectedEntry.review_comment && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>拒绝原因</div>
                <div style={{ 
                  fontSize: '14px', 
                  lineHeight: '1.7', 
                  color: '#f87171', 
                  background: '#f8717115', 
                  padding: '16px', 
                  borderRadius: '8px',
                  border: '1px solid #f8717130'
                }}>
                  {selectedEntry.review_comment}
                </div>
              </div>
            )}

            {selectedEntry.status === 'pending' && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleReject(selectedEntry.id)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #f87171',
                    background: 'transparent',
                    color: '#f87171',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f87171';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#f87171';
                  }}
                >
                  拒绝
                </button>
                <button
                  onClick={() => handleApprove(selectedEntry.id)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#34d399',
                    color: '#0F172A',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#10b981';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#34d399';
                  }}
                >
                  通过
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
