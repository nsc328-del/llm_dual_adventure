import { useState, useEffect } from 'react';
import { AVATAR_LIST } from '@shared/constants.js';
import { PixelAvatar } from '../theme/PixelAvatar.js';
import { useWS } from '../../App.js';
import { useGameStore } from '../../stores/gameStore.js';
import { connectLocalP2 } from '../../hooks/useWebSocket.js';

interface RoomSummary {
  id: string;
  name: string;
  status: string;
  player_count: number;
  created_at: string;
}

export function LobbyView() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomName, setRoomName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(true);

  const displayName = useGameStore(s => s.displayName);
  const setDisplayName = useGameStore(s => s.setDisplayName);
  const { send } = useWS();

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data);
    } catch {
      // server not ready yet
    } finally {
      setLoading(false);
    }
  }

  async function createAndJoin() {
    if (!roomName.trim()) return;
    const name = displayName.trim() || '冒险者';
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName }),
      });
      const room = await res.json();
      if (!displayName.trim()) setDisplayName(name);
      send('join_room', { roomId: room.id, displayName: name });
    } catch {
      // handle error
    }
  }

  function joinRoom(roomId: string) {
    if (!roomId.trim()) return;
    const name = displayName.trim() || '冒险者';
    if (!displayName.trim()) setDisplayName(name);
    send('join_room', { roomId, displayName: name });
  }

  async function startLocal2P() {
    const p1Name = displayName.trim() || '玩家一';
    if (!displayName.trim()) setDisplayName(p1Name);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '本地对战' }),
      });
      const room = await res.json();
      useGameStore.getState().setLocalMode(true);
      send('join_room', { roomId: room.id, displayName: p1Name });
      await new Promise(r => setTimeout(r, 500));
      await connectLocalP2(room.id, '玩家二');
    } catch {
      // handle error
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center mb-4">
        <h2
          className="pixel-text text-lg mb-2"
          style={{ color: 'var(--theme-accent)' }}
        >
          双人文字冒险
        </h2>
        <p style={{ color: 'var(--theme-text-secondary)' }}>
          创建或加入一个房间，开始你们的冒险
        </p>
      </div>

      {/* Display Name */}
      <div
        className="pixel-border p-4 w-full max-w-sm"
        style={{ background: 'var(--theme-bg-secondary)' }}
      >
        <label
          className="pixel-text text-xs mb-2 block"
          style={{ color: 'var(--theme-accent)' }}
        >
          你的名字
        </label>
        <input
          className="pixel-input"
          placeholder="输入你的名字..."
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
        />
      </div>

      {/* Local 2P */}
      <button
        className="pixel-btn pixel-btn-primary px-8 py-3 text-sm"
        onClick={startLocal2P}
      >
        本地双人模式
      </button>

      <div
        className="flex items-center gap-3 w-full max-w-sm"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        <div className="flex-1" style={{ borderTop: '1px solid var(--theme-border)' }} />
        <span className="text-xs">或</span>
        <div className="flex-1" style={{ borderTop: '1px solid var(--theme-border)' }} />
      </div>

      <div className="flex gap-8 flex-wrap justify-center">
        {/* Create Room */}
        <div
          className="pixel-border p-6 w-72"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <h3
            className="pixel-text text-xs mb-4"
            style={{ color: 'var(--theme-accent)' }}
          >
            创建房间
          </h3>
          <input
            className="pixel-input mb-3"
            placeholder="房间名称..."
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createAndJoin()}
          />
          <button className="pixel-btn pixel-btn-primary w-full" onClick={createAndJoin}>
            创建并加入
          </button>
        </div>

        {/* Join Room */}
        <div
          className="pixel-border p-6 w-72"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <h3
            className="pixel-text text-xs mb-4"
            style={{ color: 'var(--theme-accent)' }}
          >
            加入房间
          </h3>
          <input
            className="pixel-input mb-3"
            placeholder="房间 ID..."
            value={joinId}
            onChange={e => setJoinId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinRoom(joinId)}
          />
          <button
            className="pixel-btn pixel-btn-primary w-full"
            onClick={() => joinRoom(joinId)}
          >
            加入
          </button>
        </div>
      </div>

      {/* Avatar Preview */}
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {AVATAR_LIST.map(a => (
          <div key={a.id} className="flex flex-col items-center gap-1">
            <PixelAvatar avatarId={a.id} size={32} />
            <span className="text-xs" style={{ color: 'var(--theme-text-secondary)', fontSize: '9px' }}>{a.name}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1">
          <PixelAvatar avatarId="narrator" size={32} />
          <span className="text-xs" style={{ color: 'var(--theme-text-secondary)', fontSize: '9px' }}>叙事者</span>
        </div>
      </div>

      {/* Room List */}
      <div className="w-full max-w-xl mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="pixel-text text-xs"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            可用房间
          </h3>
          <button
            className="pixel-btn text-xs"
            onClick={fetchRooms}
          >
            刷新
          </button>
        </div>
        {loading ? (
          <p style={{ color: 'var(--theme-text-secondary)' }}>加载中...</p>
        ) : rooms.length === 0 ? (
          <p style={{ color: 'var(--theme-text-secondary)' }}>暂无可用房间</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rooms.map(room => (
              <div
                key={room.id}
                className="pixel-border-thin flex items-center justify-between p-3"
                style={{ background: 'var(--theme-surface)' }}
              >
                <div>
                  <span className="font-medium" style={{ color: 'var(--theme-text)' }}>{room.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--theme-text-secondary)' }}>
                    ({room.player_count}/2)
                  </span>
                </div>
                <button
                  className="pixel-btn text-xs"
                  onClick={() => joinRoom(room.id)}
                  disabled={room.player_count >= 2}
                >
                  {room.player_count >= 2 ? '已满' : '加入'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
