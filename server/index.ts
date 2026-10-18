import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateMap, TILE } from '../shared/mapGenerator';
import type { Lobby, LobbyPlayer } from '../shared/types';
import { isValidCharacter, TOTAL_LEVELS } from '../shared/battleData';
import {
  validateMovement,
  createGameState,
  startCombat,
  performCombatAction,
  buyAttack,
  setShopReady,
  allShopReady,
  removePlayerFromGame,
  startMazePhase,
  collectItem,
  placeRouletteBet,
  type CombatAction,
} from './gameLogic';
import { getMazeConfig, generateMazeItems, generateFallbackMaze } from '../shared/mazeGenerator';

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

function generateLobbyId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
  
  const currentFloor = lobby.gameState.floor;
  const bossesDefeated = lobby.gameState.bossesDefeated;
  
  console.log('Starting next floor:', { currentFloor, bossesDefeated });

  // All floors (including first): enter MAZE phase
  if (bossesDefeated < TOTAL_LEVELS) {
    lobby.gameState.phase = 'MAZE';
    lobby.gameState.mazeLevel = bossesDefeated + 1; // Level 1 starts with bossesDefeated=0
    const mazeConfig = getMazeConfig(bossesDefeated + 1);
    const mazeItems = generateMazeItems(mazeConfig);
    startMazePhase(lobby.gameState, mazeItems);

    // Generate fallback maze map (client will analyze image for collision)
    const map = generateFallbackMaze(mazeConfig);
    activeMaps.set(lobby.id, map);
    io.to(lobby.id).emit('floor_started', { map, gameState: lobby.gameState });
    return;
  }
  
  // Victory or GAME_OVER
  console.log('Game should be over or won');
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_lobby', (data: { playerName: string; characterId?: string }) => {
    const lobbyId = generateLobbyId();
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

  socket.on('join_lobby', (data: { lobbyId: string; playerName: string; characterId?: string }) => {
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby) {
      socket.emit('error', { message: 'Sala no encontrada' });
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
    console.log('Movimiento recibido:', { socketId: socket.id, ...data });

    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      console.log('Error: Partida no iniciada');
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    if (lobby.gameState.phase !== 'EXPLORE' && lobby.gameState.phase !== 'MAZE') {
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
      
      // In MAZE phase, check for exit to proceed to next boss
      if (lobby.gameState.phase === 'MAZE' && tile === TILE.EXIT) {
        // Increment floor and transition to EXPLORE phase for the next boss
        lobby.gameState.floor = Math.min(TOTAL_LEVELS, lobby.gameState.floor + 1);
        lobby.gameState.phase = 'EXPLORE';
        lobby.gameState.mazeItems = [];
        const exploreMap = generateMap(20, 20);
        activeMaps.set(lobby.id, exploreMap);
        io.to(data.lobbyId).emit('floor_started', { map: exploreMap, gameState: lobby.gameState });
        return;
      }
      
      // In EXPLORE phase, exit triggers combat
      if (lobby.gameState.phase === 'EXPLORE' && tile === TILE.EXIT) {
        startCombat(lobby.gameState);
      }

      io.to(data.lobbyId).emit('game_state_update', { gameState: lobby.gameState });
    } else {
      console.log('Error: Movimiento inválido');
      socket.emit('error', { message: 'Movimiento inválido' });
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

  socket.on('collect_item', (data: { lobbyId: string; itemId: string }) => {
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    const result = collectItem(lobby.gameState, socket.id, data.itemId);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(data.lobbyId).emit('item_collected', { gameState: lobby.gameState, goldReward: result.goldReward });
  });

  socket.on('roulette_bet', (data: { lobbyId: string; amount: number }) => {
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      socket.emit('error', { message: 'Partida no iniciada' });
      return;
    }

    const result = placeRouletteBet(lobby.gameState, socket.id, data.amount);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(data.lobbyId).emit('roulette_result', { gameState: lobby.gameState, won: result.won, amount: result.amount });
  });

  socket.on('maze_map_analyzed', (data: { lobbyId: string; map: number[][] }) => {
    const lobby = lobbies.get(data.lobbyId);
    if (!lobby || !lobby.gameState) {
      return;
    }

    // Update the active map with the client-analyzed collision map
    activeMaps.set(data.lobbyId, data.map);
    console.log('Maze map updated for lobby:', data.lobbyId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    for (const [lobbyId, lobby] of lobbies.entries()) {
      const playerIndex = lobby.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        lobby.players.splice(playerIndex, 1);

        if (lobby.players.length === 0) {
          lobbies.delete(lobbyId);
          activeMaps.delete(lobbyId);
        } else {
          if (socket.id === lobby.hostId) {
            lobby.hostId = lobby.players[0]!.id;
          }
          io.to(lobbyId).emit('lobby_updated', lobby);
          if (lobby.gameState) {
            removePlayerFromGame(lobby.gameState, socket.id);
            if (lobby.gameState.phase === 'SHOP' && allShopReady(lobby.gameState)) {
              startNextFloor(lobby);
            } else {
              emitGameState(lobby);
            }
          }
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
