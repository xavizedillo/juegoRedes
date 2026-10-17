import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Lobby, LobbyPlayer, CharacterClass } from '../shared/types';
import { calculateBossStats, processCombatTurn } from './gameLogic';
import { CHARACTER_CLASSES } from '../shared/types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const lobbies = new Map<string, Lobby>();
const MAX_PLAYERS_PER_LOBBY = 3;
const activeBosses = new Map<string, any>();

function generateLobbyId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_lobby', (data: { playerName: string; characterClass?: CharacterClass }) => {
    const lobbyId = generateLobbyId();
    const player: LobbyPlayer = {
      id: socket.id,
      name: data.playerName,
      isReady: false,
      characterClass: data.characterClass || 'warrior',
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

  socket.on('join_lobby', (data: { lobbyId: string; playerName: string; characterClass?: CharacterClass }) => {
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
      characterClass: data.characterClass || 'warrior',
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

    const playersState: Record<string, any> = {};

    const boss = calculateBossStats(lobby.players.length, 1);
    activeBosses.set(data.lobbyId, boss);

    for (let i = 0; i < lobby.players.length; i++) {
      const player = lobby.players[i]!;
      const characterClass = player.characterClass || 'warrior';
      const stats = CHARACTER_CLASSES[characterClass];

      playersState[player.id] = {
        id: player.id,
        hp: stats.hp,
        maxHp: stats.maxHp,
        level: 1,
        exp: 0,
        gold: 0,
        inventory: ['sword_thrust', 'fire_spell', 'dagger_strike'],
        characterClass,
      };
    }

    lobby.gameState = {
      floor: 1,
      players: playersState,
      currentTurnPlayerId: lobby.players[0]!.id,
      phase: 'COMBAT',
    };

    io.to(data.lobbyId).emit('game_started', { lobby, boss });
  });



  socket.on('combat_action', (data: { lobbyId: string; attackId: string }) => {
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

    const result = processCombatTurn(player, boss, data.attackId);
    lobby.gameState.players[socket.id].hp = result.playerHp;
    activeBosses.set(data.lobbyId, boss);

    if (boss.hp <= 0) {
      const goldReward = 50 + lobby.gameState.floor * 25;
      player.gold += goldReward;
      player.exp += 100 + lobby.gameState.floor * 20;

      if (lobby.gameState.floor < 10) {
        lobby.gameState.floor += 1;
        const newBoss = calculateBossStats(lobby.players.length, lobby.gameState.floor);
        activeBosses.set(data.lobbyId, newBoss);

        Object.values(lobby.gameState.players).forEach((p: any) => {
          p.hp = p.maxHp;
        });

        io.to(data.lobbyId).emit('game_state_update', {
          gameState: lobby.gameState,
          boss: newBoss,
          combatLog: `¡${boss.name} ha sido derrotado! Ganas ${goldReward} oro. Avanzando al nivel ${lobby.gameState.floor}...`,
        });
      } else {
        io.to(data.lobbyId).emit('game_completed', {
          winner: socket.id,
          gameState: lobby.gameState,
        });
      }
    } else {
      io.to(data.lobbyId).emit('game_state_update', { gameState: lobby.gameState, boss, combatLog: result.combatLog });
    }
  });

  socket.on('buy_attack', (data: { lobbyId: string; attackId: string }) => {
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

    const characterClass = player.characterClass || 'warrior';
    const attacks = ATTACKS[characterClass];
    const attack = attacks.find((a: any) => a.id === data.attackId);

    if (!attack) {
      socket.emit('error', { message: 'Ataque no encontrado' });
      return;
    }

    if (player.inventory.includes(data.attackId)) {
      socket.emit('error', { message: 'Ya tienes este ataque' });
      return;
    }

    const cost = attack.cost || 0;
    if (player.gold < cost) {
      socket.emit('error', { message: 'No tienes suficiente oro' });
      return;
    }

    player.gold -= cost;
    player.inventory.push(data.attackId);

    io.to(data.lobbyId).emit('game_state_update', {
      gameState: lobby.gameState,
      combatLog: `¡Has desbloqueado ${attack.name} por ${cost} oro!`,
    });
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
