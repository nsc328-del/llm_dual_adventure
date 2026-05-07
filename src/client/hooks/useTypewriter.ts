import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore.js';

export function useTypewriter(): string {
  const streamBuffer = useGameStore(s => s.streamBuffer);
  const displayedStreamLength = useGameStore(s => s.displayedStreamLength);
  const isGenerating = useGameStore(s => s.isGenerating);

  useEffect(() => {
    // When generation finishes, snap to full length immediately
    if (!isGenerating) {
      const current = useGameStore.getState();
      if (current.streamBuffer.length > 0 && current.displayedStreamLength < current.streamBuffer.length) {
        useGameStore.setState({ displayedStreamLength: current.streamBuffer.length });
      }
      return;
    }

    const interval = setInterval(() => {
      const { streamBuffer, displayedStreamLength } = useGameStore.getState();
      if (displayedStreamLength < streamBuffer.length) {
        // Adaptive speed: advance more chars when buffer is far ahead
        const charsToAdvance = Math.max(1, Math.floor((streamBuffer.length - displayedStreamLength) / 30));
        const next = Math.min(displayedStreamLength + charsToAdvance, streamBuffer.length);
        useGameStore.setState({ displayedStreamLength: next });
      }
    }, 20);

    return () => clearInterval(interval);
  }, [isGenerating]);

  return streamBuffer.slice(0, displayedStreamLength);
}
