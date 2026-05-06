import { THEMES } from '@shared/constants.js';
import type { ThemeId } from '@shared/types.js';

const THEME_COLORS: Record<ThemeId, string> = {
  forest: '#5a8a3a',
  ocean: '#3a7a9a',
  mech: '#8a7a5a',
  cyber: '#6a40c8',
  western: '#8a6840',
};

interface ThemeSwitcherProps {
  current: ThemeId;
  onChange: (theme: ThemeId) => void;
}

export function ThemeSwitcher({ current, onChange }: ThemeSwitcherProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="pixel-text text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
        主题
      </span>
      <div className="flex gap-2">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            title={t.label}
            className="relative w-10 h-10 pixel-border-thin flex items-center justify-center transition-transform"
            style={{
              background: THEME_COLORS[t.id],
              transform: current === t.id ? 'scale(1.15)' : 'scale(1)',
              borderColor: current === t.id ? '#fff' : 'transparent',
            }}
          >
            <span className="pixel-text" style={{ fontSize: '8px', color: '#fff' }}>
              {t.label.charAt(0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
