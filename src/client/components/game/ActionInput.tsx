import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useGameStore } from '../../stores/gameStore.js';
import { useWS } from '../../App.js';
import { sendAsP2 } from '../../hooks/useWebSocket.js';

export function ActionInput() {
  const [action, setAction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mySlot = useGameStore(s => s.mySlot);
  const activePlayer = useGameStore(s => s.gameState?.activePlayer);
  const isGenerating = useGameStore(s => s.isGenerating);
  const gameStatus = useGameStore(s => s.gameState?.status);
  const storyLog = useGameStore(s => s.gameState?.storyLog ?? []);
  const isLocalMode = useGameStore(s => s.isLocalMode);
  const { send } = useWS();

  const isMyTurn = isLocalMode || mySlot === activePlayer;
  const disabled = !isMyTurn || isGenerating || gameStatus !== 'playing';

  useEffect(() => {
    if (isMyTurn && !isGenerating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn, isGenerating]);

  useEffect(() => {
    if (!isGenerating) setSubmitting(false);
  }, [isGenerating]);

  // Get latest suggestions from the most recent narration entry
  const latestNarration = [...storyLog].reverse().find(e => e.type === 'narration' && e.suggestions?.length);
  const suggestions = latestNarration?.suggestions ?? [];

  const room = useGameStore(s => s.room);
  const opponent = room?.players.find(p => p.slot !== mySlot);
  const p1 = room?.players.find(p => p.slot === mySlot);
  const opponentName = opponent?.character?.name ?? opponent?.displayName ?? '对方';

  function submitAction(text: string) {
    if (!text.trim() || disabled) return;
    setSubmitting(true);
    if (isLocalMode && activePlayer !== mySlot) {
      sendAsP2('submit_action', { action: text.trim() });
    } else {
      send('submit_action', { action: text.trim() });
    }
    setAction('');
  }

  function handleVoteFinale() {
    send('vote_finale', {});
  }

  if (gameStatus === 'finished' || gameStatus === 'finale') {
    return (
      <div className="p-4 text-center flex flex-col items-center gap-3" style={{ borderTop: '2px solid var(--theme-border)' }}>
        <span className="pixel-text text-xs" style={{ color: 'var(--theme-accent)' }}>
          {gameStatus === 'finale' ? '尾声生成中...' : '冒险已结束'}
        </span>
        {gameStatus === 'finished' && (
          <button
            className="pixel-btn pixel-btn-primary text-xs"
            onClick={() => {
              const { setArchiveRoom } = useGameStore.getState();
              const roomId = useGameStore.getState().room?.id;
              if (roomId) setArchiveRoom(roomId);
            }}
          >
            查看故事回顾
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4" style={{ borderTop: '2px solid var(--theme-border)' }}>
      {/* Turn indicator */}
      <div className="text-center mb-2">
        <span className="text-xs" style={{ color: isMyTurn ? 'var(--theme-accent)' : 'var(--theme-text-secondary)' }}>
          {isGenerating ? '叙事者正在讲述...' : isLocalMode
            ? `${activePlayer === mySlot ? (room?.players.find(p => p.slot === mySlot)?.character?.name ?? '玩家一') : opponentName} 的回合`
            : isMyTurn ? '你的回合' : `等待 ${opponentName}...`}
        </span>
      </div>

      {/* Suggestion buttons */}
      {isMyTurn && !isGenerating && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 justify-center">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="suggestion-appear pixel-btn text-xs px-3 py-1.5 suggestion-md"
              onClick={() => submitAction(s)}
              style={{ maxWidth: '300px', animationDelay: `${i * 80}ms` }}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <span>{children}</span>,
                }}
              >
                {s}
              </ReactMarkdown>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="pixel-input flex-1"
          value={action}
          onChange={e => setAction(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitAction(action)}
          placeholder={disabled ? (isGenerating ? '生成中...' : '等待对方行动...') : '输入你的行动...'}
          disabled={disabled}
          style={{ opacity: disabled ? 0.5 : 1 }}
        />
        <button
          className="pixel-btn pixel-btn-primary px-4"
          onClick={() => submitAction(action)}
          disabled={disabled || !action.trim() || submitting}
        >
          {submitting ? (
            <span className="loading-dots">发送中<span className="d1">.</span><span className="d2">.</span><span className="d3">.</span></span>
          ) : '行动'}
        </button>
      </div>

      {/* Vote finale button (only after every 5 turns) */}
      {!isGenerating && (
        <div className="text-center mt-2">
          <button
            className="text-xs underline"
            style={{ color: 'var(--theme-text-secondary)' }}
            onClick={handleVoteFinale}
          >
            进入尾声
          </button>
        </div>
      )}
    </div>
  );
}
