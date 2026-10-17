import { z } from 'zod';

export const LobbyPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isReady: z.boolean(),
});

export type LobbyPlayer = z.infer<typeof LobbyPlayerSchema>;

export const LobbySchema = z.object({
  id: z.string(),
  players: z.array(LobbyPlayerSchema),
  hostId: z.string(),
  gameState: z.object({
    floor: z.number(),
    players: z.record(z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      hp: z.number(),
      maxHp: z.number(),
      level: z.number(),
      exp: z.number(),
      gold: z.number(),
      inventory: z.array(z.string()),
    })),
    currentTurnPlayerId: z.string().nullable(),
    phase: z.enum(['EXPLORE', 'COMBAT', 'SHOP']),
  }).nullable(),
});

export type Lobby = z.infer<typeof LobbySchema>;

export const CreateLobbyEventSchema = z.object({
  playerName: z.string(),
});

export type CreateLobbyEvent = z.infer<typeof CreateLobbyEventSchema>;

export const JoinLobbyEventSchema = z.object({
  lobbyId: z.string(),
  playerName: z.string(),
});

export type JoinLobbyEvent = z.infer<typeof JoinLobbyEventSchema>;

export const PlayerReadyEventSchema = z.object({
  lobbyId: z.string(),
  playerId: z.string(),
});

export type PlayerReadyEvent = z.infer<typeof PlayerReadyEventSchema>;

export const StartGameEventSchema = z.object({
  lobbyId: z.string(),
});

export type StartGameEvent = z.infer<typeof StartGameEventSchema>;

export type TileType = 0 | 1 | 2 | 3;
export type MapData = number[][];

export interface Boss {
  hp: number;
  maxHp: number;
  attack: number;
}
