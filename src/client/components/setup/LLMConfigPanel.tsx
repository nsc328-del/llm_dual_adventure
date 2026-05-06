import { useState, useEffect } from 'react';
import type { LLMConfig, LLMProvider } from '@shared/types.js';
import { useGameStore } from '../../stores/gameStore.js';
import { useWS } from '../../App.js';

export function LLMConfigPanel() {
  const storedConfig = useGameStore(s => s.llmConfig);
  const setLLMConfig = useGameStore(s => s.setLLMConfig);
  const { send } = useWS();

  const [provider, setProvider] = useState<LLMProvider>(storedConfig.provider);
  const [baseUrl, setBaseUrl] = useState(storedConfig.baseUrl);
  const [apiKey, setApiKey] = useState(storedConfig.apiKey);
  const [model, setModel] = useState(storedConfig.model);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProvider(storedConfig.provider);
    setBaseUrl(storedConfig.baseUrl);
    setApiKey(storedConfig.apiKey);
    setModel(storedConfig.model);
  }, [storedConfig]);

  function handleProviderChange(p: LLMProvider) {
    setProvider(p);
    if (p === 'openai') {
      setBaseUrl('https://token-plan-cn.xiaomimimo.com/v1');
      setModel('gpt-4o');
    } else {
      setBaseUrl('https://api.anthropic.com');
      setModel('claude-sonnet-4-6');
    }
  }

  function save() {
    const config: LLMConfig = { provider, baseUrl, apiKey, model };
    setLLMConfig(config);
    send('update_llm_config', { config });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div
      className="pixel-border p-5 w-full"
      style={{ background: 'var(--theme-bg-secondary)' }}
    >
      <h3
        className="pixel-text text-xs mb-4"
        style={{ color: 'var(--theme-accent)' }}
      >
        LLM 配置
      </h3>

      {/* Provider toggle */}
      <div className="mb-3">
        <label className="text-xs block mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
          Provider
        </label>
        <div className="flex gap-2">
          <button
            className="pixel-btn flex-1 text-xs"
            style={{
              background: provider === 'openai' ? 'var(--theme-accent)' : 'var(--theme-surface)',
              color: provider === 'openai' ? 'var(--theme-bg)' : 'var(--theme-text)',
            }}
            onClick={() => handleProviderChange('openai')}
          >
            OpenAI
          </button>
          <button
            className="pixel-btn flex-1 text-xs"
            style={{
              background: provider === 'anthropic' ? 'var(--theme-accent)' : 'var(--theme-surface)',
              color: provider === 'anthropic' ? 'var(--theme-bg)' : 'var(--theme-text)',
            }}
            onClick={() => handleProviderChange('anthropic')}
          >
            Anthropic
          </button>
        </div>
      </div>

      {/* Base URL */}
      <div className="mb-3">
        <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
          Base URL
        </label>
        <input
          className="pixel-input text-xs"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
        />
      </div>

      {/* API Key */}
      <div className="mb-3">
        <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
          API Key
        </label>
        <input
          className="pixel-input text-xs"
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
      </div>

      {/* Model */}
      <div className="mb-4">
        <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
          Model
        </label>
        <input
          className="pixel-input text-xs"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="gpt-4o"
        />
      </div>

      <button className="pixel-btn pixel-btn-primary w-full" onClick={save}>
        {saved ? '已保存' : '保存配置'}
      </button>
    </div>
  );
}
