import ReactMarkdown from 'react-markdown';
import type { StoryEntry as StoryEntryType } from '@shared/types.js';
import { PixelAvatar } from '../theme/PixelAvatar.js';
import { useGameStore } from '../../stores/gameStore.js';

interface StoryEntryProps {
  entry: StoryEntryType;
}

export function StoryEntryView({ entry }: StoryEntryProps) {
  const room = useGameStore(s => s.room);
  const mySlot = useGameStore(s => s.mySlot);

  if (entry.type === 'system') {
    return (
      <div className="story-entry-appear text-center py-2 my-2" style={{ borderTop: '1px dashed var(--theme-border)', borderBottom: '1px dashed var(--theme-border)' }}>
        <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
          {entry.content}
        </span>
      </div>
    );
  }

  if (entry.type === 'review') {
    return (
      <div
        className="story-entry-appear mx-auto max-w-lg my-4 p-4 text-center"
        style={{
          background: 'var(--theme-surface)',
          border: '2px dashed var(--theme-accent)',
          borderRadius: '4px',
        }}
      >
        <span className="pixel-text text-xs block mb-2" style={{ color: 'var(--theme-accent)' }}>
          故事回顾
        </span>
        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
          {entry.content}
        </p>
      </div>
    );
  }

  if (entry.type === 'action') {
    const isMe = entry.playerSlot === mySlot;
    const player = room?.players.find(p => p.slot === entry.playerSlot);
    const name = player?.character?.name ?? player?.displayName ?? `玩家${entry.playerSlot}`;
    const avatarId = player?.character?.avatarId ?? 'warrior';

    return (
      <div
        className={`story-entry-appear flex gap-3 my-3 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}
        style={{ maxWidth: '80%', marginLeft: isMe ? '0' : 'auto', marginRight: isMe ? 'auto' : '0' }}
      >
        <div className="flex flex-col items-center gap-1 shrink-0">
          <PixelAvatar avatarId={avatarId} size={32} />
          <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{name}</span>
        </div>
        <div
          className="pixel-border-thin p-3 flex-1"
          style={{
            background: isMe ? 'var(--theme-player1-bg, rgba(100,200,100,0.1))' : 'var(--theme-player2-bg, rgba(100,100,200,0.1))',
          }}
        >
          <p className="text-sm break-words" style={{ color: 'var(--theme-text)', overflowWrap: 'anywhere' }}>
            {entry.content}
          </p>
        </div>
      </div>
    );
  }

  // narration or finale
  return (
    <div className="story-entry-appear my-4 mx-auto max-w-2xl">
      <div className="flex items-center gap-2 mb-2">
        <PixelAvatar avatarId="narrator" size={24} />
        <span className="text-xs" style={{ color: 'var(--theme-accent)' }}>叙事者</span>
      </div>
      <div
        className="p-4"
        style={{
          background: 'var(--theme-narration-bg, rgba(255,255,255,0.05))',
          borderLeft: '3px solid var(--theme-accent)',
        }}
      >
        <div className="prose-sm break-words" style={{ color: 'var(--theme-text)', overflowWrap: 'anywhere' }}>
          <ReactMarkdown>{entry.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
