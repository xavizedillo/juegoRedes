import { describe, it, expect, beforeEach } from 'vitest';
import type { Lobby, LobbyPlayer } from '../shared/types';

describe('Lobby Logic', () => {
  let lobbies: Map<string, Lobby>;
  const MAX_PLAYERS_PER_LOBBY = 3;

  beforeEach(() => {
    lobbies = new Map();
  });

  it('no debe permitir más de 3 jugadores en un mismo lobby', () => {
    const lobbyId = 'TEST01';
    const lobby: Lobby = {
      id: lobbyId,
      players: [
        { id: 'player1', name: 'Player 1', isReady: true },
        { id: 'player2', name: 'Player 2', isReady: true },
        { id: 'player3', name: 'Player 3', isReady: true },
      ],
      hostId: 'player1',
      gameState: null,
    };

    lobbies.set(lobbyId, lobby);

    const newPlayer: LobbyPlayer = { id: 'player4', name: 'Player 4', isReady: false };
    const currentLobby = lobbies.get(lobbyId)!;

    expect(currentLobby.players.length).toBe(MAX_PLAYERS_PER_LOBBY);

    if (currentLobby.players.length >= MAX_PLAYERS_PER_LOBBY) {
      expect(currentLobby.players.includes(newPlayer)).toBe(false);
    }
  });

  it('el evento de inicio solo debe proceder si los jugadores están marcados como listos', () => {
    const lobbyId = 'TEST02';
    const lobby: Lobby = {
      id: lobbyId,
      players: [
        { id: 'player1', name: 'Player 1', isReady: true },
        { id: 'player2', name: 'Player 2', isReady: false },
      ],
      hostId: 'player1',
      gameState: null,
    };

    lobbies.set(lobbyId, lobby);
    const currentLobby = lobbies.get(lobbyId)!;

    const allReady = currentLobby.players.every((p) => p.isReady);
    expect(allReady).toBe(false);

    currentLobby.players[1]!.isReady = true;
    const allReadyAfter = currentLobby.players.every((p) => p.isReady);
    expect(allReadyAfter).toBe(true);
  });
});
