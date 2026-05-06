import { useGameStore } from '../../stores/gameStore.js';

export function ConnectionStatus() {
  const connected = useGameStore(s => s.connected);

  return (
    <div
      className="flex items-center gap-1.5 text-xs px-2"
      style={{ color: connected ? '#4ade80' : '#ef4444' }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: connected ? '#4ade80' : '#ef4444',
          boxShadow: connected ? '0 0 4px #4ade80' : '0 0 4px #ef4444',
        }}
      />
      {connected ? '已连接' : '断线中...'}
    </div>
  );
}
