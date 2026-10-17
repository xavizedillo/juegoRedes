import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateMap, TILE } from '../shared/mapGenerator';
import type { Lobby, LobbyPlayer } from '../shared/types';
import { validateMovement, calculateBossStats, processCombatTurn } from './gameLogic';

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
const activeBosses = new Map<string, any>();

function generateLobbyId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_lobby', (data: { playerName: string }) => {
    const lobbyId = generateLobbyId();
    const player: LobbyPlayer = {
      id: socket.id,
      name: data.playerName,
      isReady: false,
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

  socket.on('join_lobby', (data: { lobbyId: string; playerName: string }) => {
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby) {
      socket.emit('error', { message: 'Sala no encontrada' });
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
    };

    lobby.players.push(player);
    socket.join(data.lobbyId);

    io.to(data.lobbyId).emit('lobby_updated', lobby);
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

  socket.on('start_game', (data: { lobbyId: string }) => {
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby) {
      socket.emit('error', { message: 'Sala no encontrada' });
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
    const playersState: Record<string, any> = {};

    for (const player of lobby.players) {
      playersState[player.id] = {
        id: player.id,
        x: 1,
        y: 1,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        gold: 0,
        inventory: [],
      };
    }

    lobby.gameState = {
      floor: 1,
      players: playersState,
      currentTurnPlayerId: lobby.players[0]!.id,
      phase: 'EXPLORE',
    };

    const boss = calculateBossStats(lobby.players.length);
    activeBosses.set(data.lobbyId, boss);

    io.to(data.lobbyId).emit('game_started', { lobby, map, boss });
  });

  socket.on('player_move', (data: { lobbyId: string; targetX: number; targetY: number }) => {
    console.log('Movimiento recibido:', { socketId: socket.id, ...data });

    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      console.log('Error: Partida no iniciada');
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    const player = lobby.gameState.players[socket.id];
    if (!player) {
      console.log('Error: Jugador no encontrado');
      socket.emit('error', { message: 'Jugador no encontrado' });
      return;
    }

    console.log('Posición actual del jugador:', { x: player.x, y: player.y });
    console.log('Posición objetivo:', { x: data.targetX, y: data.targetY });

    const map = activeMaps.get(data.lobbyId);
    if (!map) {
      console.log('Error: Mapa no encontrado');
      socket.emit('error', { message: 'Mapa no encontrado' });
      return;
    }

    const isValid = validateMovement(player, data.targetX, data.targetY, map);
    console.log('Validación de movimiento:', isValid);

    if (isValid) {
      player.x = data.targetX;
      player.y = data.targetY;

      const tile = map[data.targetY]?.[data.targetX];
      if (tile === TILE.EXIT) {
        io.to(data.lobbyId).emit('game_completed', {
          winner: socket.id,
          gameState: lobby.gameState,
        });
      }

      io.to(data.lobbyId).emit('game_state_update', { gameState: lobby.gameState });
    } else {
      console.log('Error: Movimiento inválido');
      socket.emit('error', { message: 'Movimiento inválido' });
    }
  });

  socket.on('combat_action', (data: { lobbyId: string; action: 'attack' | 'defend' }) => {
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    const player = lobby.gameState.players[socket.id];
    if (!player) {
      socket.emit('error', { message: 'Jugador no encontrado' });
      return;
    }

    const boss = activeBosses.get(data.lobbyId);
    if (!boss) {
      socket.emit('error', { message: 'Jefe no encontrado' });
      return;
    }

    processCombatTurn(player, boss, data.action);
    activeBosses.set(data.lobbyId, boss);

    io.to(data.lobbyId).emit('game_state_update', { gameState: lobby.gameState, boss });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    for (const [lobbyId, lobby] of lobbies.entries()) {
      const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        lobby.players.splice(playerIndex, 1);

        if (lobby.players.length === 0) {
          lobbies.delete(lobbyId);
        } else {
          if (socket.id === lobby.hostId) {
            lobby.hostId = lobby.players[0]!.id;
          }
          io.to(lobbyId).emit('lobby_updated', lobby);
        }
        break;
      }
    }
  });
});

const PORT = process.env['PORT'] || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
