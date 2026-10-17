import { z } from 'zod';

export const LobbyPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isReady: z.boolean(),
  characterClass: z.enum(['warrior', 'mage', 'tank']).optional(),
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
      characterClass: z.enum(['warrior', 'mage', 'tank']),
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
  x: number;
  y: number;
}

export type CharacterClass = 'warrior' | 'mage' | 'tank';

export interface CharacterStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  color: string;
  name: string;
}

export const CHARACTER_CLASSES: Record<CharacterClass, CharacterStats> = {
  warrior: {
    hp: 120,
    maxHp: 120,
    attack: 20,
    defense: 15,
    color: '#c9a227',
    name: 'Guerrero',
  },
  mage: {
    hp: 80,
    maxHp: 80,
    attack: 30,
    defense: 5,
    color: '#9b59b6',
    name: 'Mago',
  },
  tank: {
    hp: 150,
    maxHp: 150,
    attack: 15,
    defense: 20,
    color: '#e74c3c',
    name: 'Pícara',
  },
};

export interface AttackOption {
  name: string;
  damageMin: number;
  damageMax: number;
  accuracy: number;
  id: string;
}

export const ATTACKS: Record<CharacterClass, AttackOption[]> = {
  warrior: [
    { name: 'Estocada con Espada', damageMin: 25, damageMax: 35, accuracy: 90, id: 'sword_thrust' },
  ],
  mage: [
    { name: 'Hechizo de Fuego', damageMin: 40, damageMax: 50, accuracy: 75, id: 'fire_spell' },
  ],
  tank: [
    { name: 'Golpe de Daga', damageMin: 15, damageMax: 25, accuracy: 95, id: 'dagger_strike' },
  ],
};

export type CombatPhase = 'EXPLORE' | 'COMBAT' | 'VICTORY' | 'DEFEAT';

export interface CombatState {
  phase: CombatPhase;
  currentTurnPlayerId: string | null;
  selectedAttack: string | null;
  combatLog: string[];
}
