import type { CharacterClass } from '../shared/types';
import { CHARACTER_CLASSES, ATTACKS } from '../shared/types';

export interface PlayerState {
  id: string;
  hp: number;
  maxHp: number;
  level: number;
  exp: number;
  gold: number;
  inventory: string[];
  characterClass: CharacterClass;
}

export interface Boss {
  hp: number;
  maxHp: number;
  attack: number;
}

export function calculateBossStats(playerCount: number, floor: number): Boss {
  const baseHp = 150;
  const baseAttack = 15;
  const scalingFactor = 1.5;

  const hp = Math.floor(baseHp * Math.pow(scalingFactor, playerCount - 1) * (1 + floor * 0.2));
  const attack = Math.floor(baseAttack * Math.pow(scalingFactor, playerCount - 1) * (1 + floor * 0.1));

  return {
    hp,
    maxHp: hp,
    attack,
  };
}

export function processCombatTurn(player: PlayerState, boss: Boss, attackId: string): { playerHp: number; bossHp: number; combatLog: string } {
  const characterClass = player.characterClass;
  const attacks = ATTACKS[characterClass];
  const attack = attacks.find(a => a.id === attackId);
  const characterStats = CHARACTER_CLASSES[characterClass];

  if (!attack) {
    return {
      playerHp: player.hp,
      bossHp: boss.hp,
      combatLog: 'Ataque inválido',
    };
  }

  const hitChance = Math.random() * 100;
  let damage = 0;
  let combatLog = '';

  if (hitChance <= attack.accuracy) {
    damage = Math.floor(Math.random() * (attack.damageMax - attack.damageMin + 1)) + attack.damageMin;
    damage += characterStats.attack;
    boss.hp = Math.max(0, boss.hp - damage);
    combatLog = `${characterStats.name} usó ${attack.name} e infligió ${damage} de daño al Boss.`;
  } else {
    combatLog = `${characterStats.name} falló el ataque ${attack.name}.`;
  }

  const bossDamage = Math.max(1, boss.attack - characterStats.defense);
  player.hp = Math.max(0, player.hp - bossDamage);

  return {
    playerHp: player.hp,
    bossHp: boss.hp,
    combatLog,
  };
}
