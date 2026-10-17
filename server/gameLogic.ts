import type { MapData } from '../shared/mapGenerator';
import { TILE, isWalkable } from '../shared/mapGenerator';

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  exp: number;
  gold: number;
  inventory: string[];
}

export interface Boss {
  hp: number;
  maxHp: number;
  attack: number;
}

export function validateMovement(player: PlayerState, targetX: number, targetY: number, map: MapData): boolean {
  const mapHeight = map.length;
  const mapWidth = map[0]?.length ?? 0;

  if (targetX < 0 || targetX >= mapWidth || targetY < 0 || targetY >= mapHeight) {
    return false;
  }

  const tile = map[targetY]?.[targetX];
  if (tile === undefined || !isWalkable(tile as 0 | 1 | 2 | 3)) {
    return false;
  }

  player.x = targetX;
  player.y = targetY;
  return true;
}

export function calculateBossStats(playerCount: number): Boss {
  const baseHp = 100;
  const baseAttack = 10;
  const scalingFactor = 1.5;

  const hp = Math.floor(baseHp * Math.pow(scalingFactor, playerCount - 1));
  const attack = Math.floor(baseAttack * Math.pow(scalingFactor, playerCount - 1));

  return {
    hp,
    maxHp: hp,
    attack,
  };
}

export function processCombatTurn(player: PlayerState, boss: Boss, action: 'attack' | 'defend'): { playerHp: number; bossHp: number } {
  if (action === 'attack') {
    const playerDamage = 10 + player.level * 2;
    boss.hp = Math.max(0, boss.hp - playerDamage);
  }

  const bossDamage = boss.attack;
  player.hp = Math.max(0, player.hp - bossDamage);

  return {
    playerHp: player.hp,
    bossHp: boss.hp,
  };
}
