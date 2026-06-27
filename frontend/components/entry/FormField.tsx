'use client';
import { IconLightbulb } from '@/components/ui/Icons';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-primary)',
  color: 'var(--text-secondary)',
  fontSize: '14px',
} as const;

export default function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}

export function FormInput({ value, onChange, required, placeholder }: { value?: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return <input type="text" required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />;
}

export function FormTextarea({ value, onChange, required, rows }: { value?: string; onChange: (v: string) => void; required?: boolean; rows?: number }) {
  return <textarea required={required} value={value} onChange={e => onChange(e.target.value)} rows={rows || 8} style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }} />;
}

export function FormSelect({ value, onChange, options }: { value?: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
      <option value="">请选择</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function FormNumber({ value, onChange, min, max }: { value?: number; onChange: (v: number) => void; min: number; max: number }) {
  return <input type="number" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))} style={inputStyle} />;
}

export function FormCheckbox({ checked, onChange, label }: { checked?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: '18px', height: '18px' }} />
      <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconLightbulb size={16} />
        {label}
      </span>
    </label>
  );
}
