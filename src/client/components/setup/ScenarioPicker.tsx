import { useState, useEffect } from 'react';
import type { Scenario, ThemeId } from '@shared/types.js';
import { THEMES } from '@shared/constants.js';
import { useWS, useThemeContext } from '../../App.js';

const THEME_EMOJI: Record<ThemeId, string> = {
  forest: '🌲',
  ocean: '🌊',
  mech: '⚙',
  cyber: '💠',
  western: '⚔',
};

export function ScenarioPicker({ currentScenarioId }: { currentScenarioId: string | null }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const { send } = useWS();
  const { setTheme } = useThemeContext();

  useEffect(() => {
    fetch('/api/scenarios')
      .then(r => r.json())
      .then(setScenarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function selectScenario(scenario: Scenario) {
    send('select_scenario', { scenarioId: scenario.id });
    setTheme(scenario.defaultTheme);
  }

  if (loading) {
    return <p style={{ color: 'var(--theme-text-secondary)' }}>加载场景中...</p>;
  }

  return (
    <div className="w-full">
      <h3
        className="pixel-text text-xs mb-4"
        style={{ color: 'var(--theme-accent)' }}
      >
        选择场景
      </h3>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {scenarios.map(s => {
          const isSelected = s.id === currentScenarioId;
          const themeDef = THEMES.find(t => t.id === s.defaultTheme);
          return (
            <button
              key={s.id}
              onClick={() => selectScenario(s)}
              className="pixel-border p-4 text-left transition-all"
              style={{
                background: isSelected ? 'var(--theme-accent-bg, rgba(255,255,255,0.1))' : 'var(--theme-bg-secondary)',
                borderColor: isSelected ? 'var(--theme-accent)' : undefined,
                boxShadow: isSelected ? '0 0 12px var(--theme-accent)' : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{THEME_EMOJI[s.defaultTheme]}</span>
                <span
                  className="pixel-text text-xs"
                  style={{ color: 'var(--theme-accent)' }}
                >
                  {s.name}
                </span>
              </div>
              <p
                className="text-xs mb-2 line-clamp-3"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                {s.description}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: 'var(--theme-surface)',
                    color: 'var(--theme-text-secondary)',
                  }}
                >
                  {s.genre}
                </span>
                {themeDef && (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--theme-text-secondary)' }}
                  >
                    {themeDef.label}主题
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
