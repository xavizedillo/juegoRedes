import { z } from 'zod';

export const LobbyPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isReady: z.boolean(),
  characterId: z.string().optional(),
  userId: z.string().optional(),
});

export type LobbyPlayer = z.infer<typeof LobbyPlayerSchema>;

export const PlayerStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  characterId: z.string(),
  x: z.number(),
  y: z.number(),
  hp: z.number(),
  maxHp: z.number(),
  energy: z.number(),
  maxEnergy: z.number(),
  level: z.number(),
  exp: z.number(),
  gold: z.number(),
  inventory: z.array(z.string()),
  attacks: z.array(z.string()),
  shield: z.number(),
  defending: z.boolean(),
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;

export const BossStateSchema = z.object({
  level: z.number(),
  name: z.string(),
  title: z.string(),
  hp: z.number(),
  maxHp: z.number(),
  attack: z.number(),
  stunned: z.boolean(),
});

export type BossState = z.infer<typeof BossStateSchema>;
export type Boss = BossState;

export const CombatLogEntrySchema = z.object({
  id: z.number(),
  text: z.string(),
  kind: z.enum(['player', 'boss', 'info']),
});

export type CombatLogEntry = z.infer<typeof CombatLogEntrySchema>;

export const GamePhaseSchema = z.enum(['EXPLORE', 'COMBAT', 'SHOP', 'VICTORY', 'GAME_OVER']);

export type GamePhase = z.infer<typeof GamePhaseSchema>;

export const GameStateSchema = z.object({
  floor: z.number(),
  players: z.record(PlayerStateSchema),
  currentTurnPlayerId: z.string().nullable(),
  phase: GamePhaseSchema,
  boss: BossStateSchema.nullable(),
  combatLog: z.array(CombatLogEntrySchema),
  turn: z.number(),
  bossesDefeated: z.number(),
  shopReady: z.array(z.string()),
});

export type GameState = z.infer<typeof GameStateSchema>;

export const LobbySchema = z.object({
  id: z.string(),
  players: z.array(LobbyPlayerSchema),
  hostId: z.string(),
  gameState: GameStateSchema.nullable(),
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

export interface SavedGameMember {
  userId: string;
  playerId: string;
  name: string;
}

export interface SavedGamePayload {
  version: 1;
  state: GameState;
  map: MapData;
  members: SavedGameMember[];
}

export interface SavedGameSummary {
  id: string;
  lobbyId: string;
  floor: number;
  phase: GamePhase;
  players: string[];
  updatedAt: string;
}

export const SavedGamePayloadSchema = z.object({
  version: z.literal(1),
  state: GameStateSchema,
  map: z.array(z.array(z.number())),
  members: z.array(z.object({ userId: z.string(), playerId: z.string(), name: z.string() })),
});
