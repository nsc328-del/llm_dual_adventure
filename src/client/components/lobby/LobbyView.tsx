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
  is_local: number;
}

export function LobbyView() {
  const [localRooms, setLocalRooms] = useState<RoomSummary[]>([]);
  const [onlineRooms, setOnlineRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Local 2P
  const [showLocalSetup, setShowLocalSetup] = useState(false);
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Online
  const [roomName, setRoomName] = useState('');
  const [joinId, setJoinId] = useState('');
  const displayName = useGameStore(s => s.displayName);
  const setDisplayName = useGameStore(s => s.setDisplayName);

  const { send } = useWS();

  useEffect(() => { fetchRooms(); }, []);

  async function fetchRooms() {
    try {
      const [localRes, onlineRes] = await Promise.all([
        fetch('/api/rooms?local=1'),
        fetch('/api/rooms?local=0'),
      ]);
      setLocalRooms(await localRes.json());
      setOnlineRooms(await onlineRes.json());
    } catch {
      // server not ready
    } finally {
      setLoading(false);
    }
  }

  async function startLocal2P() {
    const name1 = p1Name.trim() || '玩家一';
    const name2 = p2Name.trim() || '玩家二';
    setDisplayName(name1);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${name1} & ${name2}`, isLocal: true }),
      });
      const room = await res.json();
      useGameStore.getState().setLocalMode(true);
      send('join_room', { roomId: room.id, displayName: name1 });
      await new Promise(r => setTimeout(r, 500));
      await connectLocalP2(room.id, name2);
    } catch {
      // handle error
    }
  }

  async function continueLocalRoom(room: RoomSummary) {
    try {
      const res = await fetch(`/api/rooms/${room.id}`);
      const data = await res.json();
      const players = (data.players as any[]) ?? [];
      const p1 = players.find((p: any) => p.slot === 1);
      const p2 = players.find((p: any) => p.slot === 2);

      useGameStore.getState().setLocalMode(true);
      const name1 = p1?.display_name ?? '玩家一';
      setDisplayName(name1);
      send('join_room', {
        roomId: room.id,
        displayName: name1,
        playerId: p1?.id,
      });
      await new Promise(r => setTimeout(r, 500));
      await connectLocalP2(
        room.id,
        p2?.display_name ?? '玩家二',
        p2?.id,
      );
    } catch {
      // handle error
    }
  }

  async function renameRoom(roomId: string, name: string) {
    if (!name.trim()) return;
    await fetch(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setEditingRoomId(null);
    fetchRooms();
  }

  async function deleteRoom(roomId: string) {
    await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
    fetchRooms();
  }

  async function createAndJoin() {
    if (!roomName.trim()) return;
    const name = displayName.trim() || '冒险者';
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, isLocal: false }),
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

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'Z');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center mb-2">
        <h2
          className="pixel-text text-lg mb-2"
          style={{ color: 'var(--theme-accent)' }}
        >
          双人文字冒险
        </h2>
        <p style={{ color: 'var(--theme-text-secondary)' }}>
          选择本地对战或网络联机，开始你们的冒险
        </p>
      </div>

      <div className="flex gap-8 flex-wrap justify-center w-full max-w-3xl">
        {/* ─── Section 1: 本地对战 ─── */}
        <div
          className="pixel-border p-6 flex-1 min-w-[320px]"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <h3
            className="pixel-text text-xs mb-4"
            style={{ color: 'var(--theme-accent)' }}
          >
            本地对战
          </h3>

          {showLocalSetup ? (
            <div className="mb-4">
              <div className="mb-3">
                <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  玩家一
                </label>
                <input
                  className="pixel-input"
                  placeholder="输入玩家一名字..."
                  value={p1Name}
                  onChange={e => setP1Name(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  玩家二
                </label>
                <input
                  className="pixel-input"
                  placeholder="输入玩家二名字..."
                  value={p2Name}
                  onChange={e => setP2Name(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button className="pixel-btn flex-1" onClick={() => setShowLocalSetup(false)}>
                  取消
                </button>
                <button className="pixel-btn pixel-btn-primary flex-1" onClick={startLocal2P}>
                  开始冒险
                </button>
              </div>
            </div>
          ) : (
            <button
              className="pixel-btn pixel-btn-primary w-full mb-4"
              onClick={() => setShowLocalSetup(true)}
            >
              新建对局
            </button>
          )}

          {/* Local room list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                历史对局
              </span>
              <button className="pixel-btn text-xs" onClick={fetchRooms} style={{ padding: '2px 8px' }}>
                刷新
              </button>
            </div>
            {loading ? (
              <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>加载中...</p>
            ) : localRooms.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>暂无本地对局</p>
            ) : (
              <div className="flex flex-col gap-2">
                {localRooms.map(room => (
                  <div
                    key={room.id}
                    className="pixel-border-thin p-3"
                    style={{ background: 'var(--theme-surface)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {editingRoomId === room.id ? (
                        <input
                          className="pixel-input text-xs flex-1 mr-2"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renameRoom(room.id, editingName);
                            if (e.key === 'Escape') setEditingRoomId(null);
                          }}
                          onBlur={() => renameRoom(room.id, editingName)}
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="font-medium truncate cursor-pointer"
                            style={{ color: 'var(--theme-text)' }}
                            onClick={() => { setEditingRoomId(room.id); setEditingName(room.name); }}
                            title="点击编辑名称"
                          >
                            {room.name}
                          </span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>
                            ({formatDate(room.created_at)})
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="pixel-btn pixel-btn-primary text-xs flex-1"
                        onClick={() => continueLocalRoom(room)}
                      >
                        继续游戏
                      </button>
                      <button
                        className="pixel-btn text-xs"
                        onClick={() => deleteRoom(room.id)}
                        style={{ color: '#ef4444', borderColor: '#ef4444' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Section 2: 网络联机 ─── */}
        <div
          className="pixel-border p-6 flex-1 min-w-[320px]"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <h3
            className="pixel-text text-xs mb-4"
            style={{ color: 'var(--theme-accent)' }}
          >
            网络联机
          </h3>

          {/* Name input */}
          <div className="mb-4">
            <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
              你的名字
            </label>
            <input
              className="pixel-input"
              placeholder="输入你的名字..."
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>

          {/* Create room */}
          <div className="mb-4">
            <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
              创建房间
            </label>
            <div className="flex gap-2">
              <input
                className="pixel-input flex-1"
                placeholder="房间名称..."
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createAndJoin()}
              />
              <button className="pixel-btn pixel-btn-primary text-xs" onClick={createAndJoin}>
                创建
              </button>
            </div>
          </div>

          {/* Join room */}
          <div className="mb-4">
            <label className="text-xs block mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
              加入房间
            </label>
            <div className="flex gap-2">
              <input
                className="pixel-input flex-1"
                placeholder="房间 ID..."
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinRoom(joinId)}
              />
              <button className="pixel-btn pixel-btn-primary text-xs" onClick={() => joinRoom(joinId)}>
                加入
              </button>
            </div>
          </div>

          {/* Online room list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                可用房间
              </span>
              <button className="pixel-btn text-xs" onClick={fetchRooms} style={{ padding: '2px 8px' }}>
                刷新
              </button>
            </div>
            {loading ? (
              <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>加载中...</p>
            ) : onlineRooms.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>暂无可用房间</p>
            ) : (
              <div className="flex flex-col gap-2">
                {onlineRooms.map(room => (
                  <div
                    key={room.id}
                    className="pixel-border-thin flex items-center justify-between p-3"
                    style={{ background: 'var(--theme-surface)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate" style={{ color: 'var(--theme-text)' }}>
                        {room.name}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--theme-text-secondary)' }}>
                        ({formatDate(room.created_at)}) {room.player_count}/2
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="pixel-btn text-xs"
                        onClick={() => joinRoom(room.id)}
                        disabled={room.player_count >= 2}
                      >
                        {room.player_count >= 2 ? '已满' : '加入'}
                      </button>
                      <button
                        className="pixel-btn text-xs"
                        onClick={() => deleteRoom(room.id)}
                        style={{ color: '#ef4444', borderColor: '#ef4444' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
    </div>
  );
}
