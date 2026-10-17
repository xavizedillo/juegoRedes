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
  level: number;
  name: string;
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
  cost?: number;
  unlocked?: boolean;
}

export const ATTACKS: Record<CharacterClass, AttackOption[]> = {
  warrior: [
    { name: 'Estocada con Espada', damageMin: 25, damageMax: 35, accuracy: 90, id: 'sword_thrust', unlocked: true },
    { name: 'Golpe de Escudo', damageMin: 15, damageMax: 25, accuracy: 95, id: 'shield_bash', cost: 50, unlocked: false },
    { name: 'Corte Vertical', damageMin: 30, damageMax: 40, accuracy: 85, id: 'vertical_slash', cost: 75, unlocked: false },
    { name: 'Torbellino', damageMin: 35, damageMax: 45, accuracy: 80, id: 'whirlwind', cost: 100, unlocked: false },
    { name: 'Golpe Heroico', damageMin: 40, damageMax: 50, accuracy: 75, id: 'heroic_strike', cost: 125, unlocked: false },
    { name: 'Corte Cruzado', damageMin: 30, damageMax: 45, accuracy: 85, id: 'cross_slash', cost: 150, unlocked: false },
    { name: 'Impacto de Acero', damageMin: 45, damageMax: 55, accuracy: 70, id: 'steel_impact', cost: 175, unlocked: false },
    { name: 'Espada de Fuego', damageMin: 35, damageMax: 50, accuracy: 80, id: 'fire_sword', cost: 200, unlocked: false },
    { name: 'Golpe Relámpago', damageMin: 40, damageMax: 55, accuracy: 75, id: 'lightning_strike', cost: 225, unlocked: false },
    { name: 'Corte de Sombras', damageMin: 45, damageMax: 60, accuracy: 70, id: 'shadow_cut', cost: 250, unlocked: false },
    { name: 'Furia del Guerrero', damageMin: 50, damageMax: 65, accuracy: 65, id: 'warrior_fury', cost: 275, unlocked: false },
    { name: 'Corte Divino', damageMin: 55, damageMax: 70, accuracy: 60, id: 'divine_slash', cost: 300, unlocked: false },
    { name: 'Tormenta de Acero', damageMin: 60, damageMax: 75, accuracy: 55, id: 'steel_storm', cost: 325, unlocked: false },
    { name: 'Golpe Final', damageMin: 65, damageMax: 80, accuracy: 50, id: 'final_strike', cost: 350, unlocked: false },
    { name: 'Espada Legendaria', damageMin: 70, damageMax: 85, accuracy: 45, id: 'legendary_sword', cost: 375, unlocked: false },
  ],
  mage: [
    { name: 'Hechizo de Fuego', damageMin: 40, damageMax: 50, accuracy: 75, id: 'fire_spell', unlocked: true },
    { name: 'Bola de Hielo', damageMin: 35, damageMax: 45, accuracy: 80, id: 'ice_ball', cost: 50, unlocked: false },
    { name: 'Rayo Eléctrico', damageMin: 45, damageMax: 55, accuracy: 70, id: 'lightning_bolt', cost: 75, unlocked: false },
    { name: 'Explosión Arcana', damageMin: 40, damageMax: 60, accuracy: 65, id: 'arcane_explosion', cost: 100, unlocked: false },
    { name: 'Llamas Infernales', damageMin: 50, damageMax: 65, accuracy: 60, id: 'inferno_flames', cost: 125, unlocked: false },
    { name: 'Tormenta de Hielo', damageMin: 45, damageMax: 60, accuracy: 65, id: 'ice_storm', cost: 150, unlocked: false },
    { name: 'Bola de Fuego', damageMin: 55, damageMax: 70, accuracy: 55, id: 'fireball', cost: 175, unlocked: false },
    { name: 'Rayo de Oscuridad', damageMin: 60, damageMax: 75, accuracy: 50, id: 'darkness_ray', cost: 200, unlocked: false },
    { name: 'Explosión Solar', damageMin: 65, damageMax: 80, accuracy: 45, id: 'solar_explosion', cost: 225, unlocked: false },
    { name: 'Meteorito', damageMin: 70, damageMax: 85, accuracy: 40, id: 'meteor', cost: 250, unlocked: false },
    { name: 'Tsunami Arcano', damageMin: 75, damageMax: 90, accuracy: 35, id: 'arcane_tsunami', cost: 275, unlocked: false },
    { name: 'Tormenta de Fuego', damageMin: 80, damageMax: 95, accuracy: 30, id: 'fire_storm', cost: 300, unlocked: false },
    { name: 'Rayo Cósmico', damageMin: 85, damageMax: 100, accuracy: 25, id: 'cosmic_ray', cost: 325, unlocked: false },
    { name: 'Explosión Elemental', damageMin: 90, damageMax: 105, accuracy: 20, id: 'elemental_explosion', cost: 350, unlocked: false },
    { name: 'Hechizo Supremo', damageMin: 95, damageMax: 110, accuracy: 15, id: 'supreme_spell', cost: 375, unlocked: false },
  ],
  tank: [
    { name: 'Golpe de Daga', damageMin: 15, damageMax: 25, accuracy: 95, id: 'dagger_strike', unlocked: true },
    { name: 'Doble Daga', damageMin: 20, damageMax: 30, accuracy: 90, id: 'double_dagger', cost: 50, unlocked: false },
    { name: 'Golpe Sorpresa', damageMin: 25, damageMax: 35, accuracy: 85, id: 'surprise_strike', cost: 75, unlocked: false },
    { name: 'Corte Rápido', damageMin: 30, damageMax: 40, accuracy: 80, id: 'quick_cut', cost: 100, unlocked: false },
    { name: 'Daga Envenenada', damageMin: 35, damageMax: 45, accuracy: 75, id: 'poison_dagger', cost: 125, unlocked: false },
    { name: 'Golpe Crítico', damageMin: 40, damageMax: 55, accuracy: 70, id: 'critical_strike', cost: 150, unlocked: false },
    { name: 'Combo de Daga', damageMin: 45, damageMax: 60, accuracy: 65, id: 'dagger_combo', cost: 175, unlocked: false },
    { name: 'Sombra Mortal', damageMin: 50, damageMax: 65, accuracy: 60, id: 'deadly_shadow', cost: 200, unlocked: false },
    { name: 'Golpe Fantasma', damageMin: 55, damageMax: 70, accuracy: 55, id: 'ghost_strike', cost: 225, unlocked: false },
    { name: 'Asesinato', damageMin: 60, damageMax: 75, accuracy: 50, id: 'assassination', cost: 250, unlocked: false },
    { name: 'Tormenta de Dagas', damageMin: 65, damageMax: 80, accuracy: 45, id: 'dagger_storm', cost: 275, unlocked: false },
    { name: 'Corte de la Muerte', damageMin: 70, damageMax: 85, accuracy: 40, id: 'death_cut', cost: 300, unlocked: false },
    { name: 'Ultimato', damageMin: 75, damageMax: 90, accuracy: 35, id: 'ultimatum', cost: 325, unlocked: false },
    { name: 'Daga Fantasma', damageMin: 80, damageMax: 95, accuracy: 30, id: 'ghost_dagger', cost: 350, unlocked: false },
    { name: 'Maestro de Daga', damageMin: 85, damageMax: 100, accuracy: 25, id: 'dagger_master', cost: 375, unlocked: false },
  ],
};

export type CombatPhase = 'EXPLORE' | 'COMBAT' | 'VICTORY' | 'DEFEAT';

export interface CombatState {
  phase: CombatPhase;
  currentTurnPlayerId: string | null;
  selectedAttack: string | null;
  combatLog: string[];
}
