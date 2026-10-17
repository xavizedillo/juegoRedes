import { z } from 'zod';

export const PlayerStateSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  hp: z.number(),
  maxHp: z.number(),
  level: z.number(),
  exp: z.number(),
  gold: z.number(),
  inventory: z.array(z.string()),
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;

export const GameStateSchema = z.object({
  lobbyId: z.string(),
  floor: z.number(),
  players: z.record(PlayerStateSchema),
  currentTurnPlayerId: z.string().nullable(),
  phase: z.enum(['EXPLORE', 'COMBAT', 'SHOP']),
});

export type GameState = z.infer<typeof GameStateSchema>;

export type TileType = 0 | 1 | 2 | 3;
export type MapData = number[][];
