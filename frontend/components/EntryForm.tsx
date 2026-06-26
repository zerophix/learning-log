'use client';

import { useState } from 'react';

interface EntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function EntryForm({ isOpen, onClose, onSave }: EntryFormProps) {
  const [topic, setTopic] = useState('');
  const [insight, setInsight] = useState('');
  const [analogy, setAnalogy] = useState('');
  const [pattern, setPattern] = useState('');
  const [energy, setEnergy] = useState(3);
  const [mermaidCode, setMermaidCode] = useState('flowchart TD\nA[Input] --> B{Process}\nB --> C[Output]');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ topic, insight, analogy, pattern, energy, mermaidCode });
    // Reset form
    setTopic(''); setInsight(''); setAnalogy(''); setPattern(''); setEnergy(3);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">✨ 新建学习记录</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">核心主题 (Topic)</label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：前端架构设计思维"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">关键洞察 (Insight)</label>
            <textarea
              className="form-textarea"
              placeholder="提炼出最核心的逻辑..."
              value={insight}
              onChange={(e) => setInsight(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">💡 生活类比 (Analogy)</label>
              <input
                type="text"
                className="form-input"
                placeholder="像...一样"
                value={analogy}
                onChange={(e) => setAnalogy(e.target.value)}
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">🔄 可迁移模式 (Pattern)</label>
              <input
                type="text"
                className="form-input"
                placeholder="在其他地方也能用..."
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label flex justify-between">
              <span>精力消耗 (Energy)</span>
              <span className="text-sky-400 font-mono">{energy}</span>
            </label>
            <input
              type="range"
              className="range-slider w-full"
              min="1"
              max="5"
              value={energy}
              onChange={(e) => setEnergy(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">📊 架构图 (Mermaid)</label>
            <textarea
              className="form-textarea font-mono text-xs"
              value={mermaidCode}
              onChange={(e) => setMermaidCode(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">保存并内化</button>
          </div>
        </form>
      </div>
    </div>
  );
}
