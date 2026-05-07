import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore.js';
import type { ServerMessage } from '@shared/ws-types.js';

let globalWs: WebSocket | null = null;
let globalWsP2: WebSocket | null = null;
let seqCounter = 0;

function makeWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function wsSend(ws: WebSocket | null, type: string, payload: unknown) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type,
      payload,
      seq: ++seqCounter,
      timestamp: new Date().toISOString(),
    }));
  }
}

export function connectLocalP2(roomId: string, displayName: string, playerId?: string): Promise<void> {
  return new Promise((resolve) => {
    if (globalWsP2?.readyState === WebSocket.OPEN) {
      globalWsP2.close();
    }
    const ws = new WebSocket(makeWsUrl());
    globalWsP2 = ws;
    ws.onopen = () => {
      wsSend(ws, 'join_room', { roomId, displayName, playerId });
      resolve();
    };
    ws.onmessage = () => {};
    ws.onclose = () => { globalWsP2 = null; };
    ws.onerror = () => { ws.close(); };
  });
}

export function sendAsP2(type: string, payload: unknown) {
  wsSend(globalWsP2, type, payload);
}

export function disconnectP2() {
  if (globalWsP2) {
    wsSend(globalWsP2, 'leave_room', {});
    globalWsP2.close();
    globalWsP2 = null;
  }
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      wsRef.current = globalWs;
      useGameStore.getState().setConnected(true);
      return;
    }

    const ws = new WebSocket(makeWsUrl());
    globalWs = ws;
    wsRef.current = ws;

    ws.onopen = () => {
      useGameStore.getState().setConnected(true);

      const savedRoomId = sessionStorage.getItem('roomId');
      const savedPlayerId = sessionStorage.getItem('playerId');
      if (savedRoomId) {
        send('join_room', {
          roomId: savedRoomId,
          displayName: useGameStore.getState().displayName || 'Player',
          playerId: savedPlayerId || undefined,
        });
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        handleServerMessage(msg);
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      globalWs = null;
      useGameStore.getState().setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const send = useCallback((type: string, payload: unknown) => {
    wsSend(globalWs, type, payload);
  }, []);

  const connected = useGameStore(s => s.connected);

  return { send, connected };
}

function handleServerMessage(msg: ServerMessage) {
  const store = useGameStore.getState();

  switch (msg.type) {
    case 'room_state':
      store.handleRoomState(msg.payload as any);
      break;
    case 'player_joined':
      store.handlePlayerJoined(msg.payload.player);
      break;
    case 'player_left':
      store.handlePlayerLeft(msg.payload.slot);
      break;
    case 'player_reconnected':
      store.handlePlayerReconnected(msg.payload.slot);
      break;
    case 'scenario_selected':
      store.handleScenarioSelected(msg.payload.scenario);
      break;
    case 'character_updated':
      store.handleCharacterUpdated(msg.payload.slot, msg.payload.character);
      break;
    case 'player_ready':
      store.handlePlayerReady(msg.payload.slot, msg.payload.ready);
      break;
    case 'game_started':
      store.handleGameStarted(msg.payload.gameState);
      break;
    case 'action_received':
      store.handleActionReceived(msg.payload.entry);
      break;
    case 'narration_stream':
      store.handleNarrationStream(msg.payload.chunk);
      break;
    case 'narration_complete':
      store.handleNarrationComplete(msg.payload.entry);
      break;
    case 'review_triggered':
      store.handleReviewTriggered(msg.payload.entry, msg.payload.turn);
      break;
    case 'gen_params_updated':
      store.handleGenParamsUpdated(msg.payload.params);
      break;
    case 'finale_started':
      store.handleFinaleStarted();
      break;
    case 'finale_complete':
      store.handleFinaleComplete(msg.payload.gameState);
      break;
    case 'generation_error':
      store.handleGenerationError(msg.payload.message);
      break;
    case 'error':
      console.error(`[WS Error] ${msg.payload.code}: ${msg.payload.message}`);
      break;
    case 'pong':
      break;
  }
}
