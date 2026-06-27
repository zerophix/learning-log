'use client';
import { useState, useEffect } from 'react';
import FormField, { FormInput, FormTextarea, FormSelect, FormNumber, FormCheckbox } from '@/components/entry/FormField';
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
        border: '1px solid var(--border-color)',
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
          <FormField label="主题 *">
            <FormInput value={formData.topic} onChange={v => handleChange('topic', v)} required />
          </FormField>
          <FormField label="核心洞察 (Markdown) *">
            <FormTextarea value={formData.insight} onChange={v => handleChange('insight', v)} required />
          </FormField>
          <FormField label="研究类型">
            <FormSelect value={formData.research_type} onChange={v => handleChange('research_type', v)} options={[
              { value: 'deep-research', label: '深度研究' },
              { value: 'topic-exploration', label: '主题探索' },
              { value: 'domain-mapping', label: '领域映射' }
            ]} />
          </FormField>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <FormField label="能量等级 (1-5)">
                <FormNumber value={formData.energy_level} onChange={v => handleChange('energy_level', v)} min={1} max={5} />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label="顿悟时刻">
                <FormCheckbox checked={formData.aha_moment} onChange={v => handleChange('aha_moment', v)} label="有顿悟" />
              </FormField>
            </div>
          </div>
          <FormField label="自定义标签 (逗号分隔)">
            <FormInput value={formData.custom_tags?.join(', ') || ''} onChange={v => handleChange('custom_tags', v.split(',').map(t => t.trim()).filter(Boolean))} placeholder="例如: React, Hooks, 状态管理" />
          </FormField>
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
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
              background: 'var(--accent-sky)',
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
