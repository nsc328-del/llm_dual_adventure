import { createContext, useContext, useRef, useEffect, useState } from 'react';
import type { ThemeId } from '@shared/types.js';
import { useTheme } from './hooks/useTheme.js';
import { useSound } from './hooks/useSound.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useGameStore, type AppPhase } from './stores/gameStore.js';
import { AppShell } from './components/layout/AppShell.js';
import { LobbyView } from './components/lobby/LobbyView.js';
import { SetupView } from './components/setup/SetupView.js';
import { PixelDecorations } from './components/theme/PixelDecorations.js';
import { GameView } from './components/game/GameView.js';
import { StoryArchive } from './components/game/StoryArchive.js';

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

interface SoundContextValue {
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextValue>({
  isMuted: false,
  toggleMute: () => {},
});
export const useSoundContext = () => useContext(SoundContext);

export function App() {
  const phase = useGameStore(s => s.phase);
  const archiveRoomId = useGameStore(s => s.archiveRoomId);
  const clearArchive = useGameStore(s => s.clearArchive);
  const { theme, setTheme } = useTheme();
  const { isMuted, toggleMute, setThemeSound } = useSound();
  const { send } = useWebSocket();
  const [animKey, setAnimKey] = useState(0);
  const prevPhase = useRef<AppPhase>(phase);

  // Drive ambient sound from current theme
  useEffect(() => {
    setThemeSound(theme);
  }, [theme, setThemeSound]);

  useEffect(() => {
    if (prevPhase.current !== phase) {
      prevPhase.current = phase;
      setAnimKey(k => k + 1);
    }
  }, [phase]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <SoundContext.Provider value={{ isMuted, toggleMute }}>
        <WSContext.Provider value={{ send }}>
          <PixelDecorations />
          <AppShell>
            <div key={animKey} className="phase-enter flex-1 flex flex-col">
              {phase === 'lobby' && <LobbyView />}
              {phase === 'setup' && <SetupView />}
              {phase === 'playing' && <GameView />}
            </div>
          </AppShell>
          {archiveRoomId && (
            <StoryArchive
              roomId={archiveRoomId}
              onClose={clearArchive}
            />
          )}
        </WSContext.Provider>
      </SoundContext.Provider>
    </ThemeContext.Provider>
  );
}
