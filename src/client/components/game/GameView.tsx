import { useGameStore } from '../../stores/gameStore.js';
import { useWS } from '../../App.js';
import { StoryLog } from './StoryLog.js';
import { ActionInput } from './ActionInput.js';
import { CharacterStatusPanel } from './CharacterStatusPanel.js';
import { PixelAvatar } from '../theme/PixelAvatar.js';
import { disconnectP2 } from '../../hooks/useWebSocket.js';

export function GameView() {
  const room = useGameStore(s => s.room);
  const gameState = useGameStore(s => s.gameState);
  const mySlot = useGameStore(s => s.mySlot);
  const isLocalMode = useGameStore(s => s.isLocalMode);
  const reset = useGameStore(s => s.reset);
  const { send } = useWS();

  function leaveGame() {
    if (isLocalMode) disconnectP2();
    send('leave_room', {});
    reset();
  }

  if (!room || !gameState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="pixel-text text-xs animate-pulse" style={{ color: 'var(--theme-text-secondary)' }}>
          加载游戏中...
        </span>
      </div>
    );
  }

  const me = room.players.find(p => p.slot === mySlot);
  const opponent = room.players.find(p => p.slot !== mySlot);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar with player info */}
      <div
        className="game-topbar flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: '2px solid var(--theme-border)' }}
      >
        <button
          className="pixel-btn text-xs shrink-0 mr-2"
          onClick={leaveGame}
          title="离开游戏"
        >
          ←
        </button>
        <PlayerBadge
          name={me?.character?.name ?? me?.displayName ?? '你'}
          avatarId={me?.character?.avatarId ?? 'warrior'}
          isActive={gameState.activePlayer === mySlot}
          label={isLocalMode ? 'P1' : '你'}
        />
        <div className="text-center">
          <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
            第 {gameState.currentTurn} 回合
          </span>
        </div>
        <PlayerBadge
          name={opponent?.character?.name ?? opponent?.displayName ?? '对手'}
          avatarId={opponent?.character?.avatarId ?? 'warrior'}
          isActive={gameState.activePlayer !== mySlot}
          label={isLocalMode ? 'P2' : ''}
        />
      </div>

      {/* Character status panel */}
      <CharacterStatusPanel />

      {/* Story log */}
      <StoryLog />

      {/* Action input */}
      <ActionInput />
    </div>
  );
}

function PlayerBadge({
  name,
  avatarId,
  isActive,
  label,
}: {
  name: string;
  avatarId: string;
  isActive: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0 max-w-[40%]">
      <div className="shrink-0" style={{ opacity: isActive ? 1 : 0.5 }}>
        <PixelAvatar avatarId={avatarId} size={28} />
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className="text-xs font-medium truncate"
          style={{ color: isActive ? 'var(--theme-accent)' : 'var(--theme-text-secondary)' }}
        >
          {name}
        </span>
        {isActive && (
          <span className="text-xs" style={{ color: 'var(--theme-accent)', fontSize: '10px' }}>
            行动中
          </span>
        )}
      </div>
    </div>
  );
}
