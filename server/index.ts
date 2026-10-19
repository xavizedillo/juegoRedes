import next from 'next';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { generateMap, TILE } from '../shared/mapGenerator';
import type { Lobby, LobbyPlayer } from '../shared/types';
import { isValidCharacter } from '../shared/battleData';
import {
  validateMovement,
  createGameState,
  startCombat,
  performCombatAction,
  buyAttack,
  setShopReady,
  allShopReady,
  advanceToNextFloor,
  removePlayerFromGame,
  type CombatAction,
} from './gameLogic';

const nextApp = next({ dev: process.env['NODE_ENV'] !== 'production' });
const handleNextRequest = nextApp.getRequestHandler();
const httpServer = createServer((request, response) => {
  void handleNextRequest(request, response).catch((error: unknown) => {
    console.error('Error handling Next.js request:', error);
    if (!response.headersSent) {
      response.statusCode = 500;
    }
    response.end('Internal Server Error');
  });
});
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const lobbies = new Map<string, Lobby>();
const MAX_PLAYERS_PER_LOBBY = 3;
const activeMaps = new Map<string, number[][]>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlayerPayload(
  value: unknown,
): value is { playerName: string; characterId?: string } {
  return isRecord(value)
    && typeof value['playerName'] === 'string'
    && (value['characterId'] === undefined || typeof value['characterId'] === 'string');
}

function isJoinPayload(
  value: unknown,
): value is { lobbyId: string; playerName: string; characterId?: string } {
  return isPlayerPayload(value) && hasLobbyId(value);
}

function isCombatPayload(
  value: unknown,
): value is { lobbyId: string; action: 'attack' | 'defend'; attackId?: string } {
  return hasLobbyId(value)
    && 'action' in value
    && (value.action === 'attack' || value.action === 'defend')
    && (!('attackId' in value) || typeof value.attackId === 'string');
}

function isCharacterPayload(value: unknown): value is { lobbyId: string; characterId: string } {
  return hasLobbyId(value)
    && 'characterId' in value
    && typeof value.characterId === 'string';
}

function isMovementPayload(
  value: unknown,
): value is { lobbyId: string; targetX: number; targetY: number } {
  return hasLobbyId(value)
    && 'targetX' in value
    && typeof value.targetX === 'number'
    && Number.isFinite(value.targetX)
    && 'targetY' in value
    && typeof value.targetY === 'number'
    && Number.isFinite(value.targetY);
}

function hasLobbyId(value: unknown): value is { lobbyId: string } {
  return isRecord(value) && typeof value['lobbyId'] === 'string';
}

function handleFatalError(context: string, error: unknown): void {
  console.error(`${context}; terminating so Railway can restart the server:`, error);
  process.exit(1);
}

process.on('uncaughtException', (error: Error) => {
  handleFatalError('Uncaught exception', error);
});

process.on('unhandledRejection', (reason: unknown) => {
  handleFatalError('Unhandled promise rejection', reason);
});

function generateLobbyId(): string {
  return Math.random().toString(36).substring(2, 8).trim().toUpperCase();
}

function emitGameState(lobby: Lobby): void {
  const gameState = lobby.gameState;
  if (!gameState) return;
  io.to(lobby.id).emit('game_state_update', { gameState });
  if (gameState.phase === 'VICTORY' || gameState.phase === 'GAME_OVER') {
    io.to(lobby.id).emit('game_completed', { status: gameState.phase, gameState });
  }
}

function startNextFloor(lobby: Lobby): void {
  if (!lobby.gameState) return;
  advanceToNextFloor(lobby.gameState);
  const map = generateMap(20, 20);
  activeMaps.set(lobby.id, map);
  io.to(lobby.id).emit('floor_started', { map, gameState: lobby.gameState });
  io.to(lobby.id).emit('game_state_update', { gameState: lobby.gameState });
}

function leaveLobby(socket: Socket): void {
  for (const [lobbyId, lobby] of lobbies.entries()) {
    const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) continue;
    lobby.players.splice(playerIndex, 1);
    socket.leave(lobbyId);

    if (lobby.players.length === 0) {
      lobbies.delete(lobbyId);
      activeMaps.delete(lobbyId);
      continue;
    }
    if (socket.id === lobby.hostId) {
      lobby.hostId = lobby.players[0]!.id;
    }
    if (lobby.gameState) {
      removePlayerFromGame(lobby.gameState, socket.id);
    }
    io.to(lobbyId).emit('lobby_updated', lobby);
    if (lobby.gameState) {
      if (lobby.gameState.phase === 'SHOP' && allShopReady(lobby.gameState)) {
        startNextFloor(lobby);
      } else {
        emitGameState(lobby);
      }
    }
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_lobby', (data: unknown) => {
    if (!isPlayerPayload(data)) {
      socket.emit('error', { message: 'Datos del jugador no válidos' });
      return;
    }
    leaveLobby(socket);
    let lobbyId = generateLobbyId();
    while (lobbies.has(lobbyId)) lobbyId = generateLobbyId();
    const player: LobbyPlayer = {
      id: socket.id,
      name: data.playerName,
      isReady: false,
      ...(data.characterId && isValidCharacter(data.characterId) ? { characterId: data.characterId } : {}),
    };

    const lobby: Lobby = {
      id: lobbyId,
      players: [player],
      hostId: socket.id,
      gameState: null,
    };

    lobbies.set(lobbyId, lobby);
    socket.join(lobbyId);

    socket.emit('lobby_created', { lobbyId, lobby });
    io.to(lobbyId).emit('lobby_updated', lobby);
  });

  socket.on('join_lobby', (data: unknown) => {
    if (!isJoinPayload(data)) {
      socket.emit('error', { message: 'Datos de unión no válidos' });
      return;
    }
    const lobbyId = String(data.lobbyId ?? '').trim().toUpperCase();
    const lobby = lobbies.get(lobbyId);

    if (!lobby) {
      socket.emit('error', { message: 'Sala no encontrada' });
      return;
    }

    if (lobby.players.some((p) => p.id === socket.id)) {
      socket.emit('lobby_joined', { lobbyId, lobby });
      return;
    }

    if (lobby.gameState) {
      socket.emit('error', { message: 'La partida ya comenzó' });
      return;
    }

    if (lobby.players.length >= MAX_PLAYERS_PER_LOBBY) {
      socket.emit('error', { message: 'La sala está llena' });
      return;
    }

    const player: LobbyPlayer = {
      id: socket.id,
      name: data.playerName,
      isReady: false,
      ...(data.characterId && isValidCharacter(data.characterId) ? { characterId: data.characterId } : {}),
    };

    leaveLobby(socket);
    lobby.players.push(player);
    socket.join(lobbyId);

    socket.emit('lobby_joined', { lobbyId, lobby });
    io.to(lobbyId).emit('lobby_updated', lobby);
  });

  socket.on('leave_lobby', () => {
    leaveLobby(socket);
  });

  socket.on('player_ready', (data: unknown) => {
    if (!hasLobbyId(data)) {
      socket.emit('error', { message: 'Datos de sala no válidos' });
      return;
    }
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    const player = lobby.players.find((p) => p.id === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.to(data.lobbyId).emit('lobby_updated', lobby);
    }
  });

  socket.on('select_character', (data: unknown) => {
    if (!isCharacterPayload(data)) {
      socket.emit('error', { message: 'Datos de personaje no válidos' });
      return;
    }
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby) {
      socket.emit('error', { message: 'Sala no encontrada' });
      return;
    }
    if (lobby.gameState) {
      socket.emit('error', { message: 'La partida ya comenzó' });
      return;
    }
    if (!isValidCharacter(data.characterId)) {
      socket.emit('error', { message: 'Personaje no válido' });
      return;
    }
    const player = lobby.players.find((p) => p.id === socket.id);
    if (player) {
      player.characterId = data.characterId;
      io.to(data.lobbyId).emit('lobby_updated', lobby);
    }
  });

  socket.on('start_game', (data: unknown) => {
    if (!hasLobbyId(data)) {
      socket.emit('error', { message: 'Datos de sala no válidos' });
      return;
    }
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby) {
      socket.emit('error', { message: 'Sala no encontrada' });
      return;
    }

    if (lobby.gameState) {
      socket.emit('error', { message: 'La partida ya comenzó' });
      return;
    }

    if (socket.id !== lobby.hostId) {
      socket.emit('error', { message: 'Solo el anfitrión puede iniciar la partida' });
      return;
    }

    const allReady = lobby.players.every((p) => p.isReady);
    if (!allReady) {
      socket.emit('error', { message: 'No todos los jugadores están listos' });
      return;
    }

    const map = generateMap(20, 20);
    activeMaps.set(data.lobbyId, map);
    lobby.gameState = createGameState(lobby.players);

    io.to(data.lobbyId).emit('game_started', { lobby, map });
  });

  socket.on('player_move', (data: unknown) => {
    if (!isMovementPayload(data)) {
      socket.emit('error', { message: 'Datos de movimiento no válidos' });
      return;
    }
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      console.log('Error: Partida no iniciada');
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    if (lobby.gameState.phase !== 'EXPLORE') {
      return;
    }

    const player = lobby.gameState.players[socket.id];
    if (!player) {
      console.log('Error: Jugador no encontrado');
      socket.emit('error', { message: 'Jugador no encontrado' });
      return;
    }

    const map = activeMaps.get(data.lobbyId);
    if (!map) {
      console.log('Error: Mapa no encontrado');
      socket.emit('error', { message: 'Mapa no encontrado' });
      return;
    }

    const isValid = validateMovement(player, data.targetX, data.targetY, map);

    if (isValid) {
      player.x = data.targetX;
      player.y = data.targetY;

      const tile = map[data.targetY]?.[data.targetX];
      if (tile === TILE.EXIT) {
        startCombat(lobby.gameState);
      }

      emitGameState(lobby);
    }
  });

  socket.on('combat_action', (data: unknown) => {
    if (!isCombatPayload(data)) {
      socket.emit('error', { message: 'Datos de combate no válidos' });
      return;
    }
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    const action: CombatAction = data.action === 'attack'
      ? { type: 'attack', attackId: data.attackId ?? '' }
      : { type: 'defend' };
    const result = performCombatAction(lobby.gameState, socket.id, action);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    emitGameState(lobby);
  });

  socket.on('buy_attack', (data: unknown) => {
    if (!hasLobbyId(data) || !('attackId' in data) || typeof data.attackId !== 'string') {
      socket.emit('error', { message: 'Datos de compra no válidos' });
      return;
    }
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    const result = buyAttack(lobby.gameState, socket.id, data.attackId);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    emitGameState(lobby);
  });

  socket.on('shop_ready', (data: unknown) => {
    if (!hasLobbyId(data)) {
      socket.emit('error', { message: 'Datos de sala no válidos' });
      return;
    }
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    if (setShopReady(lobby.gameState, socket.id)) {
      startNextFloor(lobby);
    } else {
      emitGameState(lobby);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    leaveLobby(socket);
  });
});

async function startServer(): Promise<void> {
  await nextApp.prepare();
  const port = Number(process.env['PORT'] || 3000);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});
