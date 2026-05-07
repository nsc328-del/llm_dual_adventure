import { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore.js';
import { StoryEntryView } from './StoryEntry.js';
import ReactMarkdown from 'react-markdown';
import { PixelAvatar } from '../theme/PixelAvatar.js';
import { useTypewriter } from '../../hooks/useTypewriter.js';

export function StoryLog() {
  const storyLog = useGameStore(s => s.gameState?.storyLog ?? []);
  const isGenerating = useGameStore(s => s.isGenerating);
  const displayedText = useTypewriter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storyLog.length, displayedText]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-2"
    >
      {storyLog.map(entry => (
        <StoryEntryView key={entry.id} entry={entry} />
      ))}

      {/* Streaming content */}
      {isGenerating && displayedText && (
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
            <div className="prose-sm streaming-cursor" style={{ color: 'var(--theme-text)' }}>
              <ReactMarkdown>{displayedText}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {isGenerating && !displayedText && (
        <div className="story-entry-appear text-center py-8">
          <div className="inline-flex items-center gap-3">
            <PixelAvatar avatarId="narrator" size={20} />
            <span
              className="text-sm loading-dots"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              叙事者正在构思<span className="d1">.</span><span className="d2">.</span><span className="d3">.</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
