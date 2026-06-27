export default function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ 
      padding: '2px 8px', 
      background: `${color}15`, 
      border: `1px solid ${color}30`,
      borderRadius: '4px', 
      fontSize: '10px', 
      fontWeight: 500,
      color: color,
      letterSpacing: '0.5px'
    }}>
      {label.toUpperCase()}
    </span>
  );
}
