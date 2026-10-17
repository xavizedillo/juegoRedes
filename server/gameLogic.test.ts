import { describe, it, expect } from 'vitest';
import {
  buyAttack,
  calculateBossStats,
  createGameState,
  createPlayerState,
  performCombatAction,
  setShopReady,
  startCombat,
  advanceToNextFloor,
  removePlayerFromGame,
  validateMovement,
} from './gameLogic';
import { CHARACTERS, TOTAL_LEVELS, getCharacter } from '../shared/battleData';

const fixedRng = () => 0.5;

describe('Game Logic', () => {
  describe('calculateBossStats', () => {
    it('debe asignar más vida a un jefe de 3 jugadores que a uno de 1 jugador', () => {
      const boss1Player = calculateBossStats(1);
      const boss3Players = calculateBossStats(3);

      expect(boss3Players.hp).toBeGreaterThan(boss1Player.hp);
      expect(boss3Players.maxHp).toBeGreaterThan(boss1Player.maxHp);
    });

    it('cada nivel tiene un jefe distinto y más fuerte', () => {
      const names = new Set<string>();
      for (let level = 1; level <= TOTAL_LEVELS; level++) {
        const boss = calculateBossStats(1, level);
        names.add(boss.name);
        expect(boss.level).toBe(level);
        if (level > 1) {
          const previous = calculateBossStats(1, level - 1);
          expect(boss.maxHp).toBeGreaterThan(previous.maxHp);
          expect(boss.attack).toBeGreaterThanOrEqual(previous.attack);
        }
      }
      expect(names.size).toBe(TOTAL_LEVELS);
    });
  });

  describe('personajes', () => {
    it('cada personaje tiene 15 ataques únicos y empieza con 2 desbloqueados', () => {
      for (const character of CHARACTERS) {
        expect(character.attacks).toHaveLength(15);
        expect(new Set(character.attacks.map((a) => a.id)).size).toBe(15);
        const player = createPlayerState('p', 'P', character.id);
        expect(player.attacks).toHaveLength(1);
      }
    });
  });

  describe('combate por turnos', () => {
    it('los jugadores atacan en orden y luego ataca el jefe', () => {
      const state = createGameState([
        { id: 'a', name: 'A', characterId: 'warrior' },
        { id: 'b', name: 'B', characterId: 'mage' },
      ]);
      startCombat(state);
      const basicA = state.players['a']!.attacks[0]!;
      const basicB = state.players['b']!.attacks[0]!;

      expect(state.currentTurnPlayerId).toBe('a');
      expect(performCombatAction(state, 'b', { type: 'attack', attackId: basicB }, fixedRng).ok).toBe(false);

      const bossHpStart = state.boss!.hp;
      expect(performCombatAction(state, 'a', { type: 'attack', attackId: basicA }, fixedRng).ok).toBe(true);
      expect(state.boss!.hp).toBeLessThan(bossHpStart);
      expect(state.currentTurnPlayerId).toBe('b');

      const hpBefore = state.players['a']!.hp + state.players['b']!.hp;
      performCombatAction(state, 'b', { type: 'attack', attackId: basicB }, fixedRng);
      const hpAfter = state.players['a']!.hp + state.players['b']!.hp;
      expect(hpAfter).toBeLessThan(hpBefore);
      expect(state.currentTurnPlayerId).toBe('a');
      expect(state.turn).toBe(2);
    });

    it('no permite usar ataques bloqueados', () => {
      const state = createGameState([{ id: 'a', name: 'A', characterId: 'tank' }]);
      startCombat(state);
      const locked = getCharacter('tank').attacks[10]!.id;
      const result = performCombatAction(state, 'a', { type: 'attack', attackId: locked }, fixedRng);
      expect(result.ok).toBe(false);
    });

    it('defender reduce el daño recibido', () => {
      const attackState = createGameState([{ id: 'a', name: 'A', characterId: 'warrior' }]);
      const defendState = createGameState([{ id: 'a', name: 'A', characterId: 'warrior' }]);
      startCombat(attackState);
      startCombat(defendState);
      performCombatAction(attackState, 'a', { type: 'attack', attackId: 'sword_thrust' }, fixedRng);
      performCombatAction(defendState, 'a', { type: 'defend' }, fixedRng);
      const lostAttacking = attackState.players['a']!.maxHp - attackState.players['a']!.hp;
      const lostDefending = defendState.players['a']!.maxHp - defendState.players['a']!.hp;
      expect(lostDefending).toBeLessThan(lostAttacking);
    });

    it('al vencer al jefe se abre la tienda y se recibe oro', () => {
      const state = createGameState([{ id: 'a', name: 'A', characterId: 'mage' }]);
      startCombat(state);
      state.boss!.hp = 1;
      performCombatAction(state, 'a', { type: 'attack', attackId: 'fire_spell' }, fixedRng);
      expect(state.phase).toBe('SHOP');
      expect(state.players['a']!.gold).toBeGreaterThan(0);
      expect(state.players['a']!.level).toBe(2);
      expect(state.bossesDefeated).toBe(1);
    });

    it('vencer al jefe del nivel 10 da la victoria', () => {
      const state = createGameState([{ id: 'a', name: 'A', characterId: 'mage' }]);
      state.floor = TOTAL_LEVELS;
      startCombat(state);
      state.boss!.hp = 1;
      performCombatAction(state, 'a', { type: 'attack', attackId: 'fire_spell' }, fixedRng);
      expect(state.phase).toBe('VICTORY');
    });

    it('si todos caen es game over', () => {
      const state = createGameState([{ id: 'a', name: 'A', characterId: 'mage' }]);
      startCombat(state);
      state.players['a']!.hp = 1;
      performCombatAction(state, 'a', { type: 'attack', attackId: 'fire_spell' }, fixedRng);
      expect(state.phase).toBe('GAME_OVER');
    });

    it('si se desconecta el jugador en turno, pasa al siguiente', () => {
      const state = createGameState([
        { id: 'a', name: 'A', characterId: 'warrior' },
        { id: 'b', name: 'B', characterId: 'mage' },
      ]);
      startCombat(state);
      removePlayerFromGame(state, 'a', fixedRng);
      expect(state.currentTurnPlayerId).toBe('b');
    });
  });

  describe('tienda', () => {
    it('permite comprar ataques con oro y pasar al siguiente nivel', () => {
      const state = createGameState([{ id: 'a', name: 'A', characterId: 'tank' }]);
      state.phase = 'SHOP';
      const attack = getCharacter('tank').attacks[2]!;
      expect(buyAttack(state, 'a', attack.id).ok).toBe(false);
      state.players['a']!.gold = attack.price;
      expect(buyAttack(state, 'a', attack.id).ok).toBe(true);
      expect(state.players['a']!.gold).toBe(0);
      expect(state.players['a']!.attacks).toContain(attack.id);
      expect(buyAttack(state, 'a', attack.id).ok).toBe(false);
      expect(buyAttack(state, 'a', 'lightning_bolt').ok).toBe(false);

      expect(setShopReady(state, 'a')).toBe(true);
      advanceToNextFloor(state);
      expect(state.floor).toBe(2);
      expect(state.phase).toBe('EXPLORE');
    });
  });

  describe('validateMovement', () => {
    it('debe permitir movimiento a casilla transitable', () => {
      const player = createPlayerState('player1', 'P1', 'warrior');

      const map: number[][] = [
        [1, 1, 1],
        [1, 0, 0],
        [1, 0, 0],
      ];

      const result = validateMovement(player, 2, 1, map);

      expect(result).toBe(true);
      expect(player.x).toBe(2);
      expect(player.y).toBe(1);
    });

    it('debe rechazar movimiento a casilla no transitable', () => {
      const player = createPlayerState('player1', 'P1', 'warrior');

      const map: number[][] = [
        [1, 1, 1],
        [1, 0, 1],
        [1, 0, 0],
      ];

      const result = validateMovement(player, 2, 1, map);

      expect(result).toBe(false);
      expect(player.x).toBe(1);
      expect(player.y).toBe(1);
    });
  });
});
