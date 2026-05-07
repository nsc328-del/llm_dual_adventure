import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { StoryEntry as StoryEntryType, ReactionEmoji } from '@shared/types.js';
import { PixelAvatar } from '../theme/PixelAvatar.js';
import { useGameStore } from '../../stores/gameStore.js';
import { useWS } from '../../App.js';
import { sendAsP2 } from '../../hooks/useWebSocket.js';

const REACTION_EMOJIS: ReactionEmoji[] = ['😱', '😂', '😰', '🔥', '👍'];
const EMPTY_REACTIONS: { emoji: ReactionEmoji; playerSlot: 1 | 2 }[] = [];

interface StoryEntryProps {
  entry: StoryEntryType;
}

function ReactionBar({ entryId }: { entryId: string }) {
  const { send } = useWS();
  const mySlot = useGameStore(s => s.mySlot);
  const entryReactions = useGameStore(s => s.reactions[entryId] ?? EMPTY_REACTIONS);
  const [popEmoji, setPopEmoji] = useState<string | null>(null);

  function handleReact(emoji: ReactionEmoji) {
    send('send_reaction', { entryId, emoji });
    setPopEmoji(emoji);
    setTimeout(() => setPopEmoji(null), 300);
  }

  return (
    <div className="reaction-bar" style={{ marginTop: '4px' }}>
      {REACTION_EMOJIS.map(emoji => {
        const count = entryReactions.filter(r => r.emoji === emoji).length;
        const active = entryReactions.some(r => r.emoji === emoji && r.playerSlot === mySlot);
        return (
          <span
            key={emoji}
            className={`reaction-emoji${active ? ' active' : ''}${popEmoji === emoji ? ' reaction-pop' : ''}`}
            onClick={() => handleReact(emoji)}
          >
            {emoji}
            {count > 0 && <span className="reaction-count">{count}</span>}
          </span>
        );
      })}
    </div>
  );
}

export function StoryEntryView({ entry }: StoryEntryProps) {
  const room = useGameStore(s => s.room);
  const mySlot = useGameStore(s => s.mySlot);
  const pendingDirections = useGameStore(s => s.pendingDirections);
  const votedDirection = useGameStore(s => s.votedDirection);
  const resolvedDirection = useGameStore(s => s.resolvedDirection);
  const { send } = useWS();

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
    const directions = entry.suggestions ?? [];
    const hasDirections = directions.length > 0;
    const isLocalMode = useGameStore(s => s.isLocalMode);
    const localP1Voted = useGameStore(s => s.localP1Voted);
    // In local mode, "hasVoted" means both players voted; in online mode, just the current player
    const hasVoted = isLocalMode ? (votedDirection !== null && localP1Voted) : votedDirection !== null;
    const isResolved = resolvedDirection !== null;

    function handleVoteDirection(direction: string) {
      if (isLocalMode) {
        if (!localP1Voted) {
          // First click: P1 votes
          send('vote_direction', { direction });
          useGameStore.setState({ localP1Voted: true, votedDirection: direction });
        } else {
          // Second click: P2 votes
          sendAsP2('vote_direction', { direction });
          useGameStore.setState({ votedDirection: direction });
        }
      } else {
        useGameStore.setState({ votedDirection: direction });
        send('vote_direction', { direction });
      }
    }

    const voteLabel = isResolved
      ? '故事方向已决定'
      : isLocalMode
        ? (localP1Voted ? (hasVoted ? '等待结果...' : 'P2 请投票') : 'P1 请投票')
        : (hasVoted ? '等待对方投票...' : '投票选择故事方向');

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

        {hasDirections && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px dashed var(--theme-border)' }}>
            <span className="pixel-text text-xs block mb-2" style={{ color: 'var(--theme-accent)' }}>
              {voteLabel}
            </span>
            <div className="flex flex-col gap-2 items-center">
              {directions.map((dir, i) => {
                const isChosen = resolvedDirection === dir;
                const isMyVote = votedDirection === dir;
                const canVote = !hasVoted && !isResolved && pendingDirections !== null;

                return (
                  <button
                    key={i}
                    className="pixel-btn text-xs px-4 py-2 w-full max-w-sm"
                    onClick={() => canVote && handleVoteDirection(dir)}
                    disabled={!canVote}
                    style={{
                      opacity: isResolved ? (isChosen ? 1 : 0.4) : (hasVoted ? (isMyVote ? 1 : 0.5) : 1),
                      background: isChosen
                        ? 'var(--theme-accent)'
                        : isMyVote
                          ? 'var(--theme-surface)'
                          : undefined,
                      color: isChosen ? 'var(--theme-bg)' : undefined,
                      border: isMyVote && !isResolved ? '2px solid var(--theme-accent)' : undefined,
                      cursor: canVote ? 'pointer' : 'default',
                    }}
                  >
                    {isMyVote && !isResolved && '✓ '}
                    {isChosen && '★ '}
                    {dir}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
          <div className="text-sm break-words prose-sm" style={{ color: 'var(--theme-text)', overflowWrap: 'anywhere' }}>
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </div>
          <ReactionBar entryId={entry.id} />
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
        <ReactionBar entryId={entry.id} />
      </div>
    </div>
  );
}
