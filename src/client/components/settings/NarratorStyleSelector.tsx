import { useGameStore } from '../../stores/gameStore.js';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { NARRATOR_STYLES } from '@shared/constants.js';
import type { NarratorStyleId } from '@shared/types.js';

export function NarratorStyleSelector() {
  const { send } = useWebSocket();
  const currentStyle = useGameStore(s => s.narratorStyle);

  const handleSelect = (styleId: NarratorStyleId) => {
    if (styleId === currentStyle) return;
    send('update_narrator_style', { style: styleId });
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="pixel-text text-xs" style={{ color: 'var(--theme-text)' }}>
        叙事风格
      </span>
      <div className="grid grid-cols-2 gap-1.5">
        {NARRATOR_STYLES.map((style) => (
          <button
            key={style.id}
            className={`pixel-btn text-xs py-1.5 px-2 flex items-center gap-1 transition-all ${
              currentStyle === style.id ? 'ring-2' : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              ...(currentStyle === style.id
                ? { borderColor: 'var(--theme-accent)', ringColor: 'var(--theme-accent)', background: 'var(--theme-bg)' }
                : {}),
            }}
            onClick={() => handleSelect(style.id)}
          >
            <span>{style.emoji}</span>
            <span>{style.label}</span>
          </button>
        ))}
      </div>
      {currentStyle !== 'default' && (
        <p className="text-xs opacity-60 mt-1" style={{ color: 'var(--theme-text)' }}>
          {NARRATOR_STYLES.find(s => s.id === currentStyle)?.modifier.slice(0, 40)}...
        </p>
      )}
    </div>
  );
}
