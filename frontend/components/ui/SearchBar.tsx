'use client';
import { useState } from 'react';

export default function SearchBar({ 
  onSearch 
}: { 
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="搜索主题、洞察、标签..."
        style={{
          width: '240px',
          padding: '8px 32px 8px 12px',
          borderRadius: '16px',
          border: '1px solid #334155',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          outline: 'none',
          transition: 'all 0.2s'
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--text-muted)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; }}
      />
      {query && (
        <button
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
