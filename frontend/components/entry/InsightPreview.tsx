export default function InsightPreview({ insight }: { insight: string }) {
  const renderInsight = () => {
    const lines = insight.split('\n').filter(l => l.trim());
    const elements: JSX.Element[] = [];
    let count = 0;
    const maxChars = 150;
    let totalChars = 0;

    for (const line of lines) {
      if (totalChars >= maxChars) break;
      
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        const text = headingMatch[2].trim();
        totalChars += text.length;
        elements.push(
          <span key={count++} style={{
            display: 'inline',
            fontWeight: 600,
            color: '#E2E8F0',
            fontSize: '12px'
          }}>
            {text}
          </span>
        );
      } else if (!line.startsWith('```') && line.trim()) {
        const text = line.trim();
        totalChars += text.length;
        elements.push(
          <span key={count++} style={{
            display: 'inline',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            fontSize: '12px'
          }}>
            {' '}{text}
          </span>
        );
      }
    }

    if (totalChars > maxChars) {
      elements.push(<span key="ellipsis" style={{ color: 'var(--text-muted)' }}>…</span>);
    }

    return elements;
  };

  return (
    <div style={{
      margin: 0,
      fontSize: '12px',
      lineHeight: '1.65',
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Times New Roman", sans-serif'
    }}>
      {renderInsight()}
    </div>
  );
}
