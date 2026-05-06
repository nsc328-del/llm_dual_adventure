interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

export function ParamSlider({ label, value, min, max, step, onChange }: ParamSliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
          {label}
        </label>
        <span className="text-xs font-mono" style={{ color: 'var(--theme-accent)' }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-current"
        style={{ accentColor: 'var(--theme-accent)' }}
      />
    </div>
  );
}
