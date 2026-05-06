import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore.js';
import { useWS } from '../../App.js';

export function SystemPromptEditor() {
  const systemPrompt = useGameStore(s => s.gameState?.systemPrompt ?? '');
  const { send } = useWS();
  const [prompt, setPrompt] = useState(systemPrompt);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (systemPrompt) setPrompt(systemPrompt);
  }, [systemPrompt]);

  function save() {
    send('update_system_prompt', { prompt });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h4
        className="pixel-text text-xs mb-3"
        style={{ color: 'var(--theme-accent)' }}
      >
        System Prompt
      </h4>
      <textarea
        className="pixel-input w-full min-h-[200px] resize-y text-xs font-mono"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />
      <button
        className="pixel-btn pixel-btn-primary w-full mt-2 text-xs"
        onClick={save}
      >
        {saved ? '已保存' : '更新 Prompt'}
      </button>
    </div>
  );
}
