import express from 'express';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { generateMap, TILE } from '../shared/mapGenerator';
import { Prisma, PrismaClient } from '@prisma/client';
import { SavedGamePayloadSchema, type Lobby, type LobbyPlayer, type PlayerState, type SavedGamePayload, type SavedGameSummary } from '../shared/types';
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
  serializeGame,
  restoreGame,
  addPlayerToGame,
  type CombatAction,
} from './gameLogic';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const lobbies = new Map<string, Lobby>();
const MAX_PLAYERS_PER_LOBBY = 3;
const activeMaps = new Map<string, number[][]>();
const reservedSlots = new Map<string, Map<string, PlayerState>>();
const prisma = new PrismaClient();

type LeaveReason = 'saved' | 'left' | 'disconnected';
type Ack = (res: { ok: boolean; error?: string }) => void;

function parseSavedPayload(json: unknown): SavedGamePayload | null {
  const result = SavedGamePayloadSchema.safeParse(json);
  return result.success ? (result.data as SavedGamePayload) : null;
}

function cleanUserId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[\w-]{8,64}$/.test(value) ? value : undefined;
}

function generateLobbyId(): string {
  return Math.random().toString(36).substring(2, 8).trim().toUpperCase();
}

function emitGameState(lobby: Lobby): void {
  const gameState = lobby.gameState;
  if (!gameState) return;
  io.to(lobby.id).emit('game_state_update', { gameState });
  if (gameState.phase === 'VICTORY' || gameState.phase === 'GAME_OVER') {
    io.to(lobby.id).emit('game_completed', { status: gameState.phase, gameState });
    prisma.savedGame.deleteMany({ where: { lobbyId: lobby.id } }).catch((e) => console.error('Error borrando partidas guardadas:', e));
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

function leaveLobby(socket: Socket, reason: LeaveReason = 'disconnected', reserve = true): void {
  for (const [lobbyId, lobby] of lobbies.entries()) {
    const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) continue;
    const [leaving] = lobby.players.splice(playerIndex, 1);
    socket.leave(lobbyId);

    if (lobby.players.length === 0) {
      lobbies.delete(lobbyId);
      activeMaps.delete(lobbyId);
      reservedSlots.delete(lobbyId);
      continue;
    }
    if (socket.id === lobby.hostId) {
      lobby.hostId = lobby.players[0]!.id;
    }
    if (lobby.gameState) {
      const playerState = lobby.gameState.players[socket.id];
      if (reserve && playerState && leaving?.userId) {
        const slots = reservedSlots.get(lobbyId) ?? new Map<string, PlayerState>();
        slots.set(leaving.userId, structuredClone(playerState));
        reservedSlots.set(lobbyId, slots);
      }
      removePlayerFromGame(lobby.gameState, socket.id);
      io.to(lobbyId).emit('player_left', { name: leaving?.name ?? '', reason });
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

function rejoinGame(socket: Socket, lobby: Lobby, userId: string, name: string, saved: PlayerState): void {
  const map = activeMaps.get(lobby.id);
  if (!lobby.gameState || !map) return;
  leaveLobby(socket);
  const player = addPlayerToGame(lobby.gameState, socket.id, saved);
  player.name = name || player.name;
  lobby.players.push({ id: socket.id, name: player.name, isReady: true, characterId: player.characterId, userId });
  reservedSlots.get(lobby.id)?.delete(userId);
  socket.join(lobby.id);
  socket.emit('game_started', { lobby, map });
  io.to(lobby.id).emit('player_rejoined', { name: player.name });
  io.to(lobby.id).emit('lobby_updated', lobby);
  emitGameState(lobby);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_lobby', (data: { playerName: string; characterId?: string; userId?: string }) => {
    leaveLobby(socket);
    const userId = cleanUserId(data.userId);
    let lobbyId = generateLobbyId();
    while (lobbies.has(lobbyId)) lobbyId = generateLobbyId();
    const player: LobbyPlayer = {
      id: socket.id,
      name: data.playerName,
      isReady: false,
      ...(data.characterId && isValidCharacter(data.characterId) ? { characterId: data.characterId } : {}),
      ...(userId ? { userId } : {}),
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

  socket.on('join_lobby', (data: { lobbyId: string; playerName: string; characterId?: string; userId?: string }) => {
    const lobbyId = String(data.lobbyId ?? '').trim().toUpperCase();
    const userId = cleanUserId(data.userId);
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
      const reserved = userId ? reservedSlots.get(lobbyId)?.get(userId) : undefined;
      if (userId && reserved && lobby.players.length < MAX_PLAYERS_PER_LOBBY) {
        rejoinGame(socket, lobby, userId, data.playerName, reserved);
      } else {
        socket.emit('error', { message: 'La partida ya comenzó' });
      }
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
      ...(userId ? { userId } : {}),
    };

    leaveLobby(socket);
    lobby.players.push(player);
    socket.join(lobbyId);

    socket.emit('lobby_joined', { lobbyId, lobby });
    io.to(lobbyId).emit('lobby_updated', lobby);
  });

  socket.on('leave_lobby', () => {
    leaveLobby(socket, 'left', false);
  });

  socket.on('leave_game', () => {
    leaveLobby(socket, 'left', false);
  });

  socket.on('save_and_exit', async (data: { lobbyId: string; userId: string }, ack?: Ack) => {
    const reply: Ack = typeof ack === 'function' ? ack : () => {};
    const userId = cleanUserId(data?.userId);
    const lobby = lobbies.get(data?.lobbyId);
    const map = lobby ? activeMaps.get(lobby.id) : undefined;
    const member = lobby?.players.find((p) => p.id === socket.id);
    if (!userId || !lobby?.gameState || !map || !member || !lobby.gameState.players[socket.id]) {
      reply({ ok: false, error: 'No hay partida activa para guardar' });
      return;
    }
    if (lobby.gameState.phase === 'VICTORY' || lobby.gameState.phase === 'GAME_OVER') {
      reply({ ok: false, error: 'La partida ya terminó' });
      return;
    }
    member.userId = userId;
    const payload = serializeGame(lobby.gameState, map, lobby.players);
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { name: member.name },
        create: { id: userId, name: member.name },
      });
      const gameState = payload as unknown as Prisma.InputJsonValue;
      await prisma.savedGame.upsert({
        where: { userId_lobbyId: { userId, lobbyId: lobby.id } },
        update: { gameState },
        create: { userId, lobbyId: lobby.id, gameState },
      });
      reply({ ok: true });
    } catch (e) {
      console.error('Error guardando partida:', e);
      reply({ ok: false, error: 'No se pudo guardar en la base de datos' });
    }
    leaveLobby(socket, 'saved');
  });

  socket.on('get_saved_games', async (data: { userId: string }) => {
    const userId = cleanUserId(data?.userId);
    if (!userId) {
      socket.emit('saved_games', { games: [] });
      return;
    }
    try {
      const rows = await prisma.savedGame.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
      const games: SavedGameSummary[] = rows.flatMap((row) => {
        const payload = parseSavedPayload(row.gameState);
        if (!payload) return [];
        return [{
          id: row.id,
          lobbyId: row.lobbyId,
          floor: payload.state.floor,
          phase: payload.state.phase,
          players: payload.members.map((m) => m.name),
          updatedAt: row.updatedAt.toISOString(),
        }];
      });
      socket.emit('saved_games', { games });
    } catch (e) {
      console.error('Error leyendo partidas guardadas:', e);
      socket.emit('error', { message: 'No se pudieron cargar las partidas guardadas' });
    }
  });

  socket.on('resume_game', async (data: { userId: string; savedGameId: string; playerName?: string }) => {
    const userId = cleanUserId(data?.userId);
    if (!userId || typeof data.savedGameId !== 'string') {
      socket.emit('error', { message: 'Partida guardada no válida' });
      return;
    }
    let row;
    try {
      row = await prisma.savedGame.findFirst({ where: { id: data.savedGameId, userId } });
    } catch (e) {
      console.error('Error cargando partida:', e);
      socket.emit('error', { message: 'No se pudo cargar la partida' });
      return;
    }
    if (!row) {
      socket.emit('error', { message: 'Partida guardada no encontrada' });
      return;
    }
    const payload = parseSavedPayload(row.gameState);
    if (!payload) {
      socket.emit('error', { message: 'La partida guardada está dañada' });
      return;
    }
    const live = lobbies.get(row.lobbyId);
    if (live?.gameState) {
      if (live.players.some((p) => p.id === socket.id)) return;
      if (live.players.length >= MAX_PLAYERS_PER_LOBBY) {
        socket.emit('error', { message: 'La sala está llena' });
        return;
      }
      const me = payload.members.find((m) => m.userId === userId);
      const saved = reservedSlots.get(live.id)?.get(userId) ?? (me ? payload.state.players[me.playerId] : undefined);
      if (!saved) {
        socket.emit('error', { message: 'No estás en esta partida guardada' });
        return;
      }
      rejoinGame(socket, live, userId, data.playerName ?? '', saved);
      return;
    }

    const restored = restoreGame(payload, userId, socket.id);
    if (!restored) {
      socket.emit('error', { message: 'No estás en esta partida guardada' });
      return;
    }
    leaveLobby(socket);
    let lobbyId = row.lobbyId;
    while (lobbies.has(lobbyId)) lobbyId = generateLobbyId();
    if (data.playerName?.trim()) restored.player.name = data.playerName.trim();
    const lobby: Lobby = {
      id: lobbyId,
      players: [{ id: socket.id, name: restored.player.name, isReady: true, characterId: restored.player.characterId, userId }],
      hostId: socket.id,
      gameState: restored.state,
    };
    lobbies.set(lobbyId, lobby);
    activeMaps.set(lobbyId, restored.map);
    reservedSlots.set(lobbyId, restored.reserved);
    socket.join(lobbyId);
    socket.emit('game_started', { lobby, map: restored.map });
  });

  socket.on('player_ready', (data: { lobbyId: string }) => {
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

  socket.on('select_character', (data: { lobbyId: string; characterId: string }) => {
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

  socket.on('start_game', (data: { lobbyId: string }) => {
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

  socket.on('player_move', (data: { lobbyId: string; targetX: number; targetY: number }) => {
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

  socket.on('combat_action', (data: { lobbyId: string; action: 'attack' | 'defend'; attackId?: string }) => {
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

  socket.on('buy_attack', (data: { lobbyId: string; attackId: string }) => {
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

  socket.on('shop_ready', (data: { lobbyId: string }) => {
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
    leaveLobby(socket, 'disconnected');
  });
});

const PORT = process.env['PORT'] || 3001;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
