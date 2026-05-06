import { useGameStore } from '../../stores/gameStore.js';
import { useWS } from '../../App.js';
import { PixelAvatar } from '../theme/PixelAvatar.js';
import { ScenarioPicker } from './ScenarioPicker.js';
import { CharacterEditor } from './CharacterEditor.js';
import { LLMConfigPanel } from './LLMConfigPanel.js';
import { sendAsP2 } from '../../hooks/useWebSocket.js';

export function SetupView() {
  const room = useGameStore(s => s.room);
  const mySlot = useGameStore(s => s.mySlot);
  const scenario = useGameStore(s => s.scenario);
  const isLocalMode = useGameStore(s => s.isLocalMode);
  const llmConfig = useGameStore(s => s.llmConfig);
  const { send } = useWS();

  if (!room) return null;

  const me = room.players.find(p => p.slot === mySlot);
  const opponent = room.players.find(p => p.slot !== mySlot);
  const myTemplate = scenario?.characterTemplates[mySlot === 1 ? 0 : 1] ?? null;
  const p2Template = scenario?.characterTemplates[mySlot === 1 ? 1 : 0] ?? null;
  const bothReady = room.players.length === 2 && room.players.every(p => p.ready);
  const canReady = !!scenario && !!me?.character && !!me?.character?.name;
  const canReadyLocal = canReady && (isLocalMode ? !!opponent?.character?.name : true);

  return (
    <div className="flex-1 flex flex-col items-center p-6 gap-6 overflow-y-auto">
      {/* Room header */}
      <div className="text-center">
        <h2
          className="pixel-text text-sm mb-1"
          style={{ color: 'var(--theme-accent)' }}
        >
          {room.name}
        </h2>
        <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
          房间 ID: {room.id}
        </p>
      </div>

      {/* Player slots */}
      <div className="flex gap-4 flex-wrap justify-center w-full max-w-xl">
        <PlayerSlotCard
          label={mySlot === 1 ? '玩家 1 (你)' : '玩家 2 (你)'}
          player={me ?? null}
          isMe
        />
        <PlayerSlotCard
          label={mySlot === 1 ? '玩家 2' : '玩家 1'}
          player={opponent ?? null}
          isMe={false}
        />
      </div>

      {/* Waiting notice or scenario picker */}
      {room.players.length < 2 ? (
        <div
          className="pixel-border-thin p-4 text-center w-full max-w-md"
          style={{ background: 'var(--theme-surface)' }}
        >
          <p style={{ color: 'var(--theme-text-secondary)' }}>
            等待另一名玩家加入...
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--theme-text-secondary)' }}>
            将房间 ID <span style={{ color: 'var(--theme-accent)' }}>{room.id}</span> 分享给你的伙伴
          </p>
        </div>
      ) : (
        <>
          {/* Scenario picker */}
          <div className="w-full max-w-2xl">
            <ScenarioPicker currentScenarioId={room.scenarioId} />
          </div>

          {/* Character + LLM config */}
          {scenario && (
            <div className="flex gap-4 flex-wrap justify-center w-full max-w-2xl">
              <div className="flex-1 min-w-[280px]">
                <CharacterEditor
                  template={myTemplate}
                  currentCharacter={me?.character ?? null}
                  label={isLocalMode ? '玩家一 角色' : undefined}
                />
              </div>
              {isLocalMode ? (
                <div className="flex-1 min-w-[280px]">
                  <CharacterEditor
                    template={p2Template}
                    currentCharacter={opponent?.character ?? null}
                    label="玩家二 角色"
                    sendFn={sendAsP2}
                  />
                </div>
              ) : (
                <div className="flex-1 min-w-[280px]">
                  <LLMConfigPanel />
                </div>
              )}
            </div>
          )}

          {/* LLM config for local mode (full width below) */}
          {scenario && isLocalMode && (
            <div className="w-full max-w-2xl">
              <LLMConfigPanel />
            </div>
          )}

          {/* Ready button */}
          {scenario && (
            <div className="w-full max-w-md text-center">
              <button
                className="pixel-btn pixel-btn-primary w-full text-sm py-3"
                onClick={() => {
                  if (isLocalMode) {
                    sendAsP2('update_llm_config', { config: llmConfig });
                    setTimeout(() => {
                      send('ready', {});
                      setTimeout(() => sendAsP2('ready', {}), 300);
                    }, 300);
                  } else {
                    send('ready', {});
                  }
                }}
                disabled={!canReadyLocal}
                style={{ opacity: canReadyLocal ? 1 : 0.5 }}
              >
                {bothReady ? '双方已准备...' : me?.ready ? '取消准备' : isLocalMode ? '双方准备就绪' : '准备就绪'}
              </button>
              {bothReady && (
                <p
                  className="pixel-text text-xs mt-3"
                  style={{ color: 'var(--theme-accent)' }}
                >
                  双方已准备，游戏即将开始...
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlayerSlotCard({
  label,
  player,
  isMe,
}: {
  label: string;
  player: { displayName: string; character: { avatarId: string; name: string } | null; connected: boolean; ready: boolean } | null;
  isMe: boolean;
}) {
  return (
    <div
      className="pixel-border p-4 flex-1 min-w-[200px] max-w-[260px] flex flex-col items-center gap-2"
      style={{
        background: 'var(--theme-bg-secondary)',
        opacity: player ? 1 : 0.5,
      }}
    >
      <span
        className="pixel-text text-xs"
        style={{ color: isMe ? 'var(--theme-accent)' : 'var(--theme-text-secondary)' }}
      >
        {label}
      </span>

      {player ? (
        <>
          <PixelAvatar avatarId={player.character?.avatarId ?? 'warrior'} size={40} />
          <span className="text-sm" style={{ color: 'var(--theme-text)' }}>
            {player.character?.name || player.displayName}
          </span>
          <div className="flex gap-2 text-xs">
            <span style={{ color: player.connected ? '#4ade80' : '#ef4444' }}>
              {player.connected ? '在线' : '离线'}
            </span>
            {player.ready && (
              <span style={{ color: 'var(--theme-accent)' }}>已准备</span>
            )}
          </div>
        </>
      ) : (
        <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
          等待加入...
        </span>
      )}
    </div>
  );
}
