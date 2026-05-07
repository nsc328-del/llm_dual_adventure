import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore.js';
import { PixelAvatar } from '../theme/PixelAvatar.js';

export function CharacterStatusPanel() {
  const characterStatuses = useGameStore(s => s.characterStatuses);
  const room = useGameStore(s => s.room);
  const [collapsed, setCollapsed] = useState(true);

  if (characterStatuses.length === 0) return null;

  return (
    <div
      className="status-panel shrink-0"
      style={{
        borderBottom: '2px solid var(--theme-border)',
        background: 'var(--theme-bg-secondary)',
      }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-1.5"
        onClick={() => setCollapsed(c => !c)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span
          className="pixel-text"
          style={{ fontSize: '9px', color: 'var(--theme-accent)', letterSpacing: '1px' }}
        >
          {collapsed ? '▸' : '▾'} 角色状态
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--theme-text-secondary)', fontSize: '10px' }}
        >
          {characterStatuses.map(s => s.name).join(' / ')}
        </span>
      </button>

      <div
        className="status-panel-content"
        style={{
          maxHeight: collapsed ? '0px' : '300px',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease-in-out',
        }}
      >
        <div className="px-4 pb-3 flex flex-wrap gap-3">
          {characterStatuses.map((status, idx) => {
            const player = room?.players.find(
              p => p.character?.name === status.name
            );
            const avatarId = player?.character?.avatarId ?? (idx === 0 ? 'warrior' : 'mage');

            return (
              <div
                key={status.name}
                className="flex-1 min-w-[180px] p-2"
                style={{
                  background: 'var(--theme-surface)',
                  border: '2px solid var(--theme-border)',
                  boxShadow: '2px 2px 0 0 rgba(0,0,0,0.2)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <PixelAvatar avatarId={avatarId} size={22} />
                  <span
                    className="pixel-text"
                    style={{
                      fontSize: '9px',
                      color: idx === 0 ? 'var(--theme-p1)' : 'var(--theme-p2)',
                    }}
                  >
                    {status.name}
                  </span>
                </div>

                <div className="flex flex-col gap-1" style={{ fontSize: '12px' }}>
                  {status.location && (
                    <div className="flex items-start gap-1">
                      <span style={{ color: 'var(--theme-accent)', flexShrink: 0, fontSize: '10px' }}>
                        位置
                      </span>
                      <span style={{ color: 'var(--theme-text)' }}>{status.location}</span>
                    </div>
                  )}

                  {status.items.length > 0 && (
                    <div className="flex items-start gap-1">
                      <span style={{ color: 'var(--theme-accent)', flexShrink: 0, fontSize: '10px' }}>
                        物品
                      </span>
                      <span style={{ color: 'var(--theme-text)' }}>
                        {status.items.join(', ')}
                      </span>
                    </div>
                  )}

                  {status.condition && (
                    <div className="flex items-start gap-1">
                      <span style={{ color: 'var(--theme-accent)', flexShrink: 0, fontSize: '10px' }}>
                        状态
                      </span>
                      <span style={{ color: 'var(--theme-text)' }}>{status.condition}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
