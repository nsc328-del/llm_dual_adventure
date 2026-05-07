import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Header } from './Header.js';
import { useGameStore } from '../../stores/gameStore.js';

function ErrorToast() {
  const error = useGameStore(s => s.error);
  const clearError = useGameStore(s => s.clearError);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(clearError, 300);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 pixel-border px-4 py-3 max-w-md"
      style={{
        transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s, transform 0.3s',
        background: 'var(--theme-bg-secondary)',
        borderColor: '#ef4444',
      }}
    >
      <div className="flex items-start gap-3">
        <span style={{ color: '#ef4444' }}>⚠</span>
        <p className="text-xs flex-1" style={{ color: 'var(--theme-text)' }}>{error}</p>
        <button
          className="text-xs shrink-0"
          style={{ color: 'var(--theme-text-secondary)' }}
          onClick={() => { setVisible(false); setTimeout(clearError, 300); }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--theme-bg)' }}>
      <Header />
      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
      <ErrorToast />
    </div>
  );
}
