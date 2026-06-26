'use client';

import { useState, useEffect } from 'react';
import FeedCard from './FeedCard';
import DetailModal from './DetailModal';

interface TimelineViewProps {
  entries: any[];
}

export default function TimelineView({ entries }: TimelineViewProps) {
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [groupedEntries, setGroupedEntries] = useState<Record<string, any[]>>({});

  // 按日期分组
  useEffect(() => {
    const grouped: Record<string, any[]> = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const dateKey = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });
    
    setGroupedEntries(grouped);
  }, [entries]);

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      {/* 时间线头部 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '48px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #38bdf8 0%, #a78bfa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '12px'
        }}>
          📚 学习日志时间线
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#94a3b8'
        }}>
          共 {entries.length} 条记录，点击卡片查看详情
        </p>
      </div>

      {/* 时间线内容 */}
      <div style={{ position: 'relative' }}>
        {/* 时间线中轴线 */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'linear-gradient(to bottom, transparent, rgba(56,189,248,0.3), transparent)',
          transform: 'translateX(-50%)'
        }} />

        {Object.entries(groupedEntries).map(([date, dateEntries], dateIndex) => (
          <div key={date} style={{ marginBottom: '48px' }}>
            {/* 日期标签 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(167,139,250,0.2))',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#38bdf8',
                backdropFilter: 'blur(8px)'
              }}>
                {date}
              </div>
            </div>

            {/* 该日期的所有记录 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {dateEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    justifyContent: index % 2 === 0 ? 'flex-start' : 'flex-end',
                    paddingLeft: index % 2 === 0 ? '0' : 'calc(50% + 30px)',
                    paddingRight: index % 2 === 0 ? 'calc(50% + 30px)' : '0',
                    position: 'relative'
                  }}
                >
                  {/* 时间线节点 */}
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '20px',
                    width: '16px',
                    height: '16px',
                    background: entry.energy_level >= 4 ? '#34d399' : '#fbbf24',
                    borderRadius: '50%',
                    border: '3px solid #0f172a',
                    boxShadow: `0 0 0 3px ${entry.energy_level >= 4 ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`,
                    transform: 'translateX(-50%)',
                    zIndex: 2
                  }} />

                  {/* 连接线 */}
                  <div style={{
                    position: 'absolute',
                    top: '28px',
                    width: '30px',
                    height: '2px',
                    background: 'rgba(56,189,248,0.3)',
                    ...(index % 2 === 0 
                      ? { right: 'calc(50% - 16px)' }
                      : { left: 'calc(50% - 16px)' }
                    )
                  }} />

                  {/* 卡片 */}
                  <div style={{ width: '100%' }}>
                    <FeedCard
                      entry={entry}
                      onClick={(e) => setSelectedEntry(e)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 详情弹窗 */}
      <DetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
