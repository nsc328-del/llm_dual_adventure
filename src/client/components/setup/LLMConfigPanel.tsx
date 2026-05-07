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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setProvider(storedConfig.provider);
    setBaseUrl(storedConfig.baseUrl);
    setApiKey(storedConfig.apiKey);
    setModel(storedConfig.model);
  }, [storedConfig]);

  function handleProviderChange(p: LLMProvider) {
    setProvider(p);
    setTestResult(null);
    if (p === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
      setModel('mimo-v2.5-pro');
    } else {
      setBaseUrl('https://api.anthropic.com');
      setModel('claude-sonnet-4-6');
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey, model }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, msg: `连接成功 — ${data.model}` });
      } else {
        setTestResult({ ok: false, msg: data.error || '连接失败' });
      }
    } catch {
      setTestResult({ ok: false, msg: '请求失败，请检查网络' });
    } finally {
      setTesting(false);
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
        className="pixel-text text-xs mb-1"
        style={{ color: 'var(--theme-accent)' }}
      >
        LLM 配置
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
        只需一方配置即可，双方共享
      </p>

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

      <div className="flex gap-2">
        <button className="pixel-btn pixel-btn-primary flex-1" onClick={save}>
          {saved ? '已保存' : '保存配置'}
        </button>
        <button
          className="pixel-btn flex-1 text-xs"
          style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
          onClick={testConnection}
          disabled={testing || !apiKey}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>

      {testResult && (
        <div
          className="mt-3 p-3 text-xs pixel-border"
          style={{
            background: testResult.ok ? 'rgba(0,200,100,0.1)' : 'rgba(255,60,60,0.1)',
            borderColor: testResult.ok ? '#00c864' : '#ff3c3c',
            color: testResult.ok ? '#00c864' : '#ff3c3c',
          }}
        >
          {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
        </div>
      )}
    </div>
  );
}
