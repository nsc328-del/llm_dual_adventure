import { createContext, useContext, useRef, useEffect, useState } from 'react';
import type { ThemeId } from '@shared/types.js';
import { useTheme } from './hooks/useTheme.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useGameStore, type AppPhase } from './stores/gameStore.js';
import { AppShell } from './components/layout/AppShell.js';
import { LobbyView } from './components/lobby/LobbyView.js';
import { SetupView } from './components/setup/SetupView.js';
import { PixelDecorations } from './components/theme/PixelDecorations.js';
import { GameView } from './components/game/GameView.js';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'forest',
  setTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

interface WSContextValue {
  send: (type: string, payload: unknown) => void;
}

const WSContext = createContext<WSContextValue>({ send: () => {} });
export const useWS = () => useContext(WSContext);

export function App() {
  const phase = useGameStore(s => s.phase);
  const { theme, setTheme } = useTheme();
  const { send } = useWebSocket();
  const [animKey, setAnimKey] = useState(0);
  const prevPhase = useRef<AppPhase>(phase);

  useEffect(() => {
    if (prevPhase.current !== phase) {
      prevPhase.current = phase;
      setAnimKey(k => k + 1);
    }
  }, [phase]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <WSContext.Provider value={{ send }}>
        <PixelDecorations />
        <AppShell>
          <div key={animKey} className="phase-enter flex-1 flex flex-col">
            {phase === 'lobby' && <LobbyView />}
            {phase === 'setup' && <SetupView />}
            {phase === 'playing' && <GameView />}
          </div>
        </AppShell>
      </WSContext.Provider>
    </ThemeContext.Provider>
  );
}
