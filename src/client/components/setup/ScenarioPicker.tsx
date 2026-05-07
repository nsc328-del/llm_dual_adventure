import { useState, useEffect } from 'react';
import type { Scenario, ThemeId } from '@shared/types.js';
import { THEMES } from '@shared/constants.js';
import { useWS, useThemeContext } from '../../App.js';
import { nanoid } from 'nanoid';

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
  const [showCreate, setShowCreate] = useState(false);
  const { send } = useWS();
  const { setTheme } = useThemeContext();

  function fetchScenarios() {
    fetch('/api/scenarios')
      .then(r => r.json())
      .then(setScenarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchScenarios(); }, []);

  function selectScenario(scenario: Scenario) {
    send('select_scenario', { scenarioId: scenario.id });
    setTheme(scenario.defaultTheme);
  }

  async function createScenario(data: {
    name: string; genre: string; description: string;
    worldLore: string; tone: string; openingPrompt: string;
    defaultTheme: ThemeId;
  }) {
    const scenario = {
      id: `custom-${nanoid(6)}`,
      ...data,
      characterTemplates: [],
      isPreset: false,
    };
    await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    });
    setShowCreate(false);
    fetchScenarios();
    selectScenario(scenario as Scenario);
    setTheme(data.defaultTheme);
  }

  if (loading) {
    return <p style={{ color: 'var(--theme-text-secondary)' }}>加载场景中...</p>;
  }

  if (showCreate) {
    return <ScenarioCreator onSubmit={createScenario} onCancel={() => setShowCreate(false)} />;
  }

  return (
    <div className="w-full">
      <h3
        className="pixel-text text-xs mb-4"
        style={{ color: 'var(--theme-accent)' }}
      >
        选择场景
      </h3>
      <div className="scenario-grid grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
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

        {/* Create custom scenario card */}
        <button
          onClick={() => setShowCreate(true)}
          className="pixel-border p-4 text-left transition-all"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderStyle: 'dashed',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✦</span>
            <span
              className="pixel-text text-xs"
              style={{ color: 'var(--theme-accent)' }}
            >
              自定义场景
            </span>
          </div>
          <p
            className="text-xs mb-2"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            创建你自己的故事世界，自定义世界观、基调和开场剧情
          </p>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                background: 'var(--theme-surface)',
                color: 'var(--theme-text-secondary)',
              }}
            >
              自由创作
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

function ScenarioCreator({ onSubmit, onCancel }: {
  onSubmit: (data: { name: string; genre: string; description: string; worldLore: string; tone: string; openingPrompt: string; defaultTheme: ThemeId }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [worldLore, setWorldLore] = useState('');
  const [tone, setTone] = useState('');
  const [openingPrompt, setOpeningPrompt] = useState('');
  const [defaultTheme, setDefaultTheme] = useState<ThemeId>('forest');

  const canSubmit = name.trim() && description.trim();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="pixel-text text-xs"
          style={{ color: 'var(--theme-accent)' }}
        >
          创建自定义场景
        </h3>
        <button className="pixel-btn text-xs" onClick={onCancel}>
          ← 返回选择
        </button>
      </div>

      <div
        className="pixel-border p-5"
        style={{ background: 'var(--theme-bg-secondary)' }}
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {/* Left column */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                场景名称 *
              </label>
              <input className="pixel-input" value={name} onChange={e => setName(e.target.value)} placeholder="例：末日方舟" />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                类型
              </label>
              <input className="pixel-input" value={genre} onChange={e => setGenre(e.target.value)} placeholder="例：末日生存" />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                简介 *
              </label>
              <textarea className="pixel-input min-h-[60px] resize-y" value={description} onChange={e => setDescription(e.target.value)} placeholder="一段话描述你的故事世界和冒险主题..." />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                基调
              </label>
              <input className="pixel-input" value={tone} onChange={e => setTone(e.target.value)} placeholder="例：紧张刺激、黑暗幽默..." />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                世界观设定
              </label>
              <textarea className="pixel-input min-h-[80px] resize-y" value={worldLore} onChange={e => setWorldLore(e.target.value)} placeholder="详细描述你的世界：历史、地理、势力、规则等。LLM 会根据这些信息构建故事..." />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                开场剧情
              </label>
              <textarea className="pixel-input min-h-[80px] resize-y" value={openingPrompt} onChange={e => setOpeningPrompt(e.target.value)} placeholder="故事开头的场景描述。留空则由 LLM 根据世界观自由发挥..." />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                主题风格
              </label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    className="pixel-btn text-xs px-3 py-1"
                    onClick={() => setDefaultTheme(t.id)}
                    style={{
                      background: defaultTheme === t.id ? 'var(--theme-accent)' : undefined,
                      color: defaultTheme === t.id ? 'var(--theme-bg)' : undefined,
                    }}
                  >
                    {THEME_EMOJI[t.id]} {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          className="pixel-btn pixel-btn-primary w-full mt-4"
          onClick={() => onSubmit({ name: name.trim(), genre: genre.trim() || '自定义', description, worldLore, tone, openingPrompt, defaultTheme })}
          disabled={!canSubmit}
        >
          创建场景
        </button>
      </div>
    </div>
  );
}
