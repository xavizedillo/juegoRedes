interface BarProps {
  value: number;
  max: number;
  color: string;
  height?: number;
  label?: string;
}

export default function Bar({ value, max, color, height = 10, label }: BarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ fontSize: '11px', color: '#d0d0f0', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          <span>{Math.max(0, Math.round(value))} / {max}</span>
        </div>
      )}
      <div style={{
        width: '100%',
        height: `${height}px`,
        background: 'rgba(0, 0, 0, 0.55)',
        borderRadius: `${height}px`,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: color,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}
