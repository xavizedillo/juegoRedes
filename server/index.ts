import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateMap } from '../shared/mapGenerator';
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
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (lobby.players.length >= MAX_PLAYERS_PER_LOBBY) {
      socket.emit('error', { message: 'Lobby is full' });
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
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (socket.id !== lobby.hostId) {
      socket.emit('error', { message: 'Only host can start the game' });
      return;
    }

    const allReady = lobby.players.every((p) => p.isReady);
    if (!allReady) {
      socket.emit('error', { message: 'Not all players are ready' });
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
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      socket.emit('error', { message: 'Game not started' });
      return;
    }

    const player = lobby.gameState.players[socket.id];
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    const map = activeMaps.get(data.lobbyId);
    if (!map) {
      socket.emit('error', { message: 'Map not found' });
      return;
    }

    const isValid = validateMovement(player, data.targetX, data.targetY, map);
    if (isValid) {
      io.to(data.lobbyId).emit('game_state_update', { gameState: lobby.gameState });
    } else {
      socket.emit('error', { message: 'Invalid movement' });
    }
  });

  socket.on('combat_action', (data: { lobbyId: string; action: 'attack' | 'defend' }) => {
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      socket.emit('error', { message: 'Game not started' });
      return;
    }

    const player = lobby.gameState.players[socket.id];
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    const boss = activeBosses.get(data.lobbyId);
    if (!boss) {
      socket.emit('error', { message: 'Boss not found' });
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
