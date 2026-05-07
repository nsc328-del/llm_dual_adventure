import { useState } from 'react';
import { useThemeContext, useSoundContext } from '../../App.js';
import { useGameStore } from '../../stores/gameStore.js';
import { ThemeSwitcher } from '../theme/ThemeSwitcher.js';
import { ConnectionStatus } from './ConnectionStatus.js';
import { SoundToggle } from './SoundToggle.js';
import { GenerationParamsPanel } from '../settings/GenerationParamsPanel.js';
import { SystemPromptEditor } from '../settings/SystemPromptEditor.js';
import { NarratorStyleSelector } from '../settings/NarratorStyleSelector.js';

export function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const { theme, setTheme } = useThemeContext();
  const { isMuted, toggleMute } = useSoundContext();
  const phase = useGameStore(s => s.phase);

  return (
    <>
      <header
        className="app-header pixel-border flex items-center justify-between px-4 py-3 relative z-10"
        style={{ background: 'var(--theme-bg-secondary)' }}
      >
        <h1 className="pixel-text text-sm" style={{ color: 'var(--theme-accent)' }}>
          Dual Adventure
        </h1>
        <div className="flex items-center gap-2">
          <ConnectionStatus />
          <SoundToggle isMuted={isMuted} onToggle={toggleMute} />
          <button
            className="pixel-btn text-xs"
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? '✕' : '⚙'}
          </button>
        </div>
      </header>

      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setShowSettings(false)}
          />
          <div
            className="settings-drawer fixed top-0 right-0 h-full w-80 max-w-[calc(100vw-1rem)] z-50 pixel-border p-4 overflow-y-auto flex flex-col gap-6"
            style={{ background: 'var(--theme-bg-secondary)' }}
          >
            <div className="flex items-center justify-between">
              <span className="pixel-text text-xs" style={{ color: 'var(--theme-accent)' }}>
                设置
              </span>
              <button className="pixel-btn text-xs" onClick={() => setShowSettings(false)}>
                ✕
              </button>
            </div>

            <ThemeSwitcher current={theme} onChange={setTheme} />

            {phase === 'playing' && (
              <>
                <div style={{ borderTop: '1px solid var(--theme-border)' }} />
                <NarratorStyleSelector />
                <div style={{ borderTop: '1px solid var(--theme-border)' }} />
                <GenerationParamsPanel />
                <div style={{ borderTop: '1px solid var(--theme-border)' }} />
                <SystemPromptEditor />
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
