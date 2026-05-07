import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { StoryEntry, PlayerInfo, Scenario } from '@shared/types.js';
import { PixelAvatar } from '../theme/PixelAvatar.js';

interface StoryArchiveData {
  roomName: string;
  roomId: string;
  status: string;
  players: PlayerInfo[];
  scenario: Scenario | null;
  storyLog: StoryEntry[];
  createdAt: string;
}

interface StoryArchiveProps {
  roomId: string;
  onClose: () => void;
  /** If provided, use this data instead of fetching */
  inlineData?: {
    roomName: string;
    players: PlayerInfo[];
    scenario: Scenario | null;
    storyLog: StoryEntry[];
    createdAt: string;
  };
}

export function StoryArchive({ roomId, onClose, inlineData }: StoryArchiveProps) {
  const [data, setData] = useState<StoryArchiveData | null>(
    inlineData
      ? {
          roomName: inlineData.roomName,
          roomId,
          status: 'finished',
          players: inlineData.players,
          scenario: inlineData.scenario,
          storyLog: inlineData.storyLog,
          createdAt: inlineData.createdAt,
        }
      : null,
  );
  const [loading, setLoading] = useState(!inlineData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inlineData) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/story`);
        if (!res.ok) throw new Error('Failed to load story');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('无法加载故事数据');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomId, inlineData]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--theme-bg)' }}>
        <span className="pixel-text text-xs animate-pulse" style={{ color: 'var(--theme-text-secondary)' }}>
          加载故事中...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--theme-bg)' }}>
        <span className="text-sm" style={{ color: '#ef4444' }}>{error ?? '数据加载失败'}</span>
        <button className="pixel-btn" onClick={onClose}>返回</button>
      </div>
    );
  }

  const { roomName, players, scenario, storyLog, createdAt } = data;

  const p1 = players.find(p => p.slot === 1);
  const p2 = players.find(p => p.slot === 2);

  // Stats
  const totalTurns = Math.max(0, ...storyLog.map(e => e.turnNumber));
  const totalWords = storyLog.reduce((acc, e) => acc + e.content.length, 0);
  const timestamps = storyLog.map(e => new Date(e.timestamp).getTime()).filter(t => !isNaN(t));
  const durationMs = timestamps.length >= 2 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;
  const durationMin = Math.round(durationMs / 60000);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr.includes('Z') ? dateStr : dateStr + 'Z');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Group entries by chapter (every 5 turns)
  const chapters: { turnStart: number; entries: StoryEntry[] }[] = [];
  let currentChapter: { turnStart: number; entries: StoryEntry[] } | null = null;

  for (const entry of storyLog) {
    const chapterIdx = Math.floor(entry.turnNumber / 5);
    const chapterStart = chapterIdx * 5;
    if (!currentChapter || currentChapter.turnStart !== chapterStart) {
      currentChapter = { turnStart: chapterStart, entries: [] };
      chapters.push(currentChapter);
    }
    currentChapter.entries.push(entry);
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'var(--theme-bg)' }}
    >
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          className="pixel-btn text-xs mb-6"
          onClick={onClose}
        >
          &larr; 返回
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="pixel-text text-sm mb-2"
            style={{ color: 'var(--theme-accent)' }}
          >
            {scenario?.name ?? '冒险故事'}
          </h1>
          <p className="text-sm mb-1" style={{ color: 'var(--theme-text)' }}>
            {roomName}
          </p>
          <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
            {formatDate(createdAt)}
          </p>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex-1 h-px" style={{ background: 'var(--theme-border)' }} />
          <span className="pixel-text" style={{ color: 'var(--theme-accent)', fontSize: '8px' }}>
            &#9670; &#9670; &#9670;
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--theme-border)' }} />
        </div>

        {/* Player profiles */}
        <div className="flex justify-center gap-8 mb-8">
          {p1 && (
            <PlayerProfile
              player={p1}
              label="玩家一"
            />
          )}
          <div className="flex items-center">
            <span className="pixel-text text-xs" style={{ color: 'var(--theme-text-secondary)' }}>VS</span>
          </div>
          {p2 && (
            <PlayerProfile
              player={p2}
              label="玩家二"
            />
          )}
        </div>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex-1 h-px" style={{ background: 'var(--theme-border)' }} />
          <span className="pixel-text" style={{ color: 'var(--theme-accent)', fontSize: '8px' }}>
            &#9670;
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--theme-border)' }} />
        </div>

        {/* Story flow */}
        <div className="mb-8">
          {chapters.map((chapter, ci) => (
            <div key={ci}>
              {/* Chapter divider */}
              {ci > 0 && (
                <div className="flex items-center justify-center gap-3 my-8">
                  <div className="flex-1" style={{ borderBottom: '1px dashed var(--theme-border)' }} />
                  <span
                    className="pixel-text shrink-0"
                    style={{ color: 'var(--theme-accent)', fontSize: '9px' }}
                  >
                    第 {ci + 1} 章
                  </span>
                  <div className="flex-1" style={{ borderBottom: '1px dashed var(--theme-border)' }} />
                </div>
              )}

              {ci === 0 && (
                <div className="text-center mb-6">
                  <span
                    className="pixel-text"
                    style={{ color: 'var(--theme-accent)', fontSize: '9px' }}
                  >
                    第 1 章
                  </span>
                </div>
              )}

              {chapter.entries.map(entry => (
                <ArchiveEntry key={entry.id} entry={entry} players={players} />
              ))}
            </div>
          ))}
        </div>

        {/* Ending flourish */}
        <div className="text-center my-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'var(--theme-accent)' }} />
            <span className="pixel-text" style={{ color: 'var(--theme-accent)', fontSize: '10px' }}>
              &#10022; THE END &#10022;
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--theme-accent)' }} />
          </div>
        </div>

        {/* Statistics */}
        <div
          className="pixel-border p-6 mb-8"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <h3
            className="pixel-text text-xs mb-4 text-center"
            style={{ color: 'var(--theme-accent)' }}
          >
            冒险统计
          </h3>
          <div className="flex justify-center gap-8 flex-wrap">
            <StatItem label="总回合" value={String(totalTurns)} />
            <StatItem label="总字数" value={String(totalWords)} />
            <StatItem
              label="冒险时长"
              value={durationMin > 0 ? `${durationMin} 分钟` : '< 1 分钟'}
            />
          </div>
        </div>

        {/* Bottom back button */}
        <div className="text-center mb-8">
          <button className="pixel-btn" onClick={onClose}>
            &larr; 返回
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerProfile({ player, label }: { player: PlayerInfo; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <PixelAvatar avatarId={player.character?.avatarId ?? 'warrior'} size={48} />
      <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
        {player.character?.name ?? player.displayName}
      </span>
      <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-lg font-bold" style={{ color: 'var(--theme-accent)' }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

function ArchiveEntry({ entry, players }: { entry: StoryEntry; players: PlayerInfo[] }) {
  if (entry.type === 'system') {
    return (
      <div
        className="text-center py-2 my-2"
        style={{ borderTop: '1px dashed var(--theme-border)', borderBottom: '1px dashed var(--theme-border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
          {entry.content}
        </span>
      </div>
    );
  }

  if (entry.type === 'review') {
    return (
      <div
        className="mx-auto max-w-lg my-6 p-4 text-center"
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
    const isP1 = entry.playerSlot === 1;
    const player = players.find(p => p.slot === entry.playerSlot);
    const name = player?.character?.name ?? player?.displayName ?? `玩家${entry.playerSlot}`;
    const avatarId = player?.character?.avatarId ?? 'warrior';

    return (
      <div
        className={`flex gap-3 my-3 ${isP1 ? 'flex-row' : 'flex-row-reverse'}`}
        style={{ maxWidth: '80%', marginLeft: isP1 ? '0' : 'auto', marginRight: isP1 ? 'auto' : '0' }}
      >
        <div className="flex flex-col items-center gap-1 shrink-0">
          <PixelAvatar avatarId={avatarId} size={32} />
          <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{name}</span>
        </div>
        <div
          className="pixel-border-thin p-3 flex-1"
          style={{
            background: isP1
              ? 'var(--theme-player1-bg, rgba(100,200,100,0.1))'
              : 'var(--theme-player2-bg, rgba(100,100,200,0.1))',
          }}
        >
          <p className="text-sm break-words" style={{ color: 'var(--theme-text)', overflowWrap: 'anywhere' }}>
            {entry.content}
          </p>
        </div>
      </div>
    );
  }

  if (entry.type === 'finale') {
    return (
      <div className="my-6 mx-auto max-w-2xl">
        <div className="flex items-center gap-2 mb-2">
          <PixelAvatar avatarId="narrator" size={24} />
          <span className="pixel-text" style={{ color: 'var(--theme-accent)', fontSize: '10px' }}>
            尾声
          </span>
        </div>
        <div
          className="p-5"
          style={{
            background: 'var(--theme-narration-bg, rgba(255,255,255,0.05))',
            borderLeft: '4px solid var(--theme-accent)',
            borderRight: '4px solid var(--theme-accent)',
          }}
        >
          <div className="prose-sm break-words" style={{ color: 'var(--theme-text)', overflowWrap: 'anywhere' }}>
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // narration
  return (
    <div className="my-4 mx-auto max-w-2xl">
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
