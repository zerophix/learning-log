'use client';
import { useState, useEffect } from 'react';
import { IconLightbulb } from '@/components/ui/Icons';
import type { Entry, LearningEntryCreate } from '@/types';

export default function EntryForm({ 
  entry, 
  onSave, 
  onCancel 
}: { 
  entry?: Entry | null;
  onSave: (data: LearningEntryCreate) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<LearningEntryCreate>({
    topic: '',
    insight: '',
    diagram: '',
    code_snippet: '',
    star_situation: '',
    star_task: '',
    star_action: '',
    star_result: '',
    topic_tag_id: '',
    project_tag_id: '',
    research_type: '',
    related_tag_ids: [],
    custom_tags: [],
    analogy: '',
    transfer_pattern: '',
    energy_level: 3,
    aha_moment: false,
    source: '',
    confidence_rating: 3
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        topic: entry.topic || '',
        insight: entry.insight || '',
        diagram: entry.diagram || '',
        code_snippet: entry.code_snippet || '',
        star_situation: entry.star_situation || '',
        star_task: entry.star_task || '',
        star_action: entry.star_action || '',
        star_result: entry.star_result || '',
        topic_tag_id: entry.topic_tag_id || '',
        project_tag_id: entry.project_tag_id || '',
        research_type: entry.research_type || '',
        related_tag_ids: entry.related_tag_ids || [],
        custom_tags: entry.custom_tags || [],
        analogy: entry.analogy || '',
        transfer_pattern: entry.transfer_pattern || '',
        energy_level: entry.energy_level || 3,
        aha_moment: entry.aha_moment === 1,
        source: entry.source || '',
        confidence_rating: entry.confidence_rating || 3
      });
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = <K extends keyof LearningEntryCreate>(field: K, value: LearningEntryCreate[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid #334155',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '28px'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {entry ? '编辑条目' : '新建条目'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 主题 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>主题 *</label>
            <input
              type="text"
              required
              value={formData.topic}
              onChange={e => handleChange('topic', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}
            />
          </div>

          {/* 核心洞察 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>核心洞察 (Markdown) *</label>
            <textarea
              required
              value={formData.insight}
              onChange={e => handleChange('insight', e.target.value)}
              rows={8}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />
          </div>

          {/* 研究类型 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>研究类型</label>
            <select
              value={formData.research_type}
              onChange={e => handleChange('research_type', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}
            >
              <option value="">请选择</option>
              <option value="deep-research">深度研究</option>
              <option value="topic-exploration">主题探索</option>
              <option value="domain-mapping">领域映射</option>
            </select>
          </div>

          {/* 能量等级 + 顿悟 */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>能量等级 (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.energy_level}
                onChange={e => handleChange('energy_level', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>顿悟时刻</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.aha_moment}
                  onChange={e => handleChange('aha_moment', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconLightbulb size={16} />
                  有顿悟
                </span>
              </label>
            </div>
          </div>

          {/* 自定义标签 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>自定义标签 (逗号分隔)</label>
            <input
              type="text"
              value={formData.custom_tags?.join(', ') || ''}
              onChange={e => handleChange('custom_tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              placeholder="例如: React, Hooks, 状态管理"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            取消
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#38bdf8',
              color: 'var(--bg-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {entry ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </form>
  );
}
