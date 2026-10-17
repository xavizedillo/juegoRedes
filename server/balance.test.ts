import { describe, it, expect } from 'vitest';
import {
  advanceToNextFloor,
  buyAttack,
  createGameState,
  estimateAttackDamage,
  estimateAttackHeal,
  performCombatAction,
  startCombat,
  type CombatAction,
  type Rng,
} from './gameLogic';
import { CHARACTERS, TOTAL_LEVELS, getAttack, getCharacter } from '../shared/battleData';
import type { GameState, PlayerState } from '../shared/types';

function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Strategy = 'smart' | 'basic';

function chooseAction(state: GameState, player: PlayerState, strategy: Strategy): CombatAction {
  const owned = player.attacks.map((id) => getAttack(player.characterId, id)!);
  if (strategy === 'basic') return { type: 'attack', attackId: owned[0]!.id };

  const affordable = owned.filter((a) => a.cost <= player.energy);
  const party = Object.values(state.players).filter((p) => p.hp > 0);
  const lowest = party.reduce((min, p) => (p.hp / p.maxHp < min.hp / min.maxHp ? p : min), player);

  if (lowest.hp / lowest.maxHp < 0.4) {
    const healers = affordable
      .filter((a) => (a.heal ?? 0) > 0 && (a.party || lowest.id === player.id))
      .sort((x, y) => estimateAttackHeal(player, y) - estimateAttackHeal(player, x));
    if (healers[0]) return { type: 'attack', attackId: healers[0].id };
    const drains = affordable.filter((a) => (a.drain ?? 0) > 0 && lowest.id === player.id);
    if (drains[0]) return { type: 'attack', attackId: drains[0].id };
  }

  const best = affordable
    .filter((a) => a.damage > 0)
    .sort((x, y) => estimateAttackDamage(player, y) - estimateAttackDamage(player, x))[0]!;
  return { type: 'attack', attackId: best.id };
}

function shop(state: GameState, strategy: Strategy): void {
  if (strategy === 'basic') return;
  for (const player of Object.values(state.players)) {
    const attacks = [...getCharacter(player.characterId).attacks].reverse();
    let bought = true;
    while (bought) {
      bought = false;
      for (const attack of attacks) {
        if (buyAttack(state, player.id, attack.id).ok) {
          bought = true;
          break;
        }
      }
    }
  }
}

function playRun(characterIds: string[], strategy: Strategy, seed: number): { won: boolean; floor: number } {
  const rng = seededRng(seed);
  const state = createGameState(characterIds.map((c, i) => ({ id: `p${i}`, name: `P${i}`, characterId: c })));
  for (;;) {
    startCombat(state);
    let guard = 0;
    while (state.phase === 'COMBAT' && guard++ < 500) {
      const player = state.players[state.currentTurnPlayerId!]!;
      performCombatAction(state, player.id, chooseAction(state, player, strategy), rng);
    }
    if (state.phase === 'VICTORY') return { won: true, floor: state.floor };
    if (state.phase !== 'SHOP') return { won: false, floor: state.floor };
    shop(state, strategy);
    advanceToNextFloor(state);
  }
}

function winRate(characterIds: string[], strategy: Strategy, runs = 200): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    if (playRun(characterIds, strategy, seed * 7919).won) wins++;
  }
  return wins / runs;
}

describe('Balance de los 10 niveles', () => {
  for (const character of CHARACTERS) {
    it(`${character.name} en solitario puede ganar los ${TOTAL_LEVELS} niveles comprando ataques`, () => {
      expect(winRate([character.id], 'smart')).toBeGreaterThanOrEqual(0.9);
    });

    it(`${character.name} sin comprar ataques no gana fácilmente`, () => {
      expect(winRate([character.id], 'basic', 100)).toBeLessThan(0.5);
    });
  }

  it('un equipo de 3 jugadores también puede ganar', () => {
    expect(winRate(['guerrero', 'mago', 'sanadora'], 'smart')).toBeGreaterThanOrEqual(0.9);
    expect(winRate(['arquera', 'arquera', 'mago'], 'smart')).toBeGreaterThanOrEqual(0.9);
  });
});
