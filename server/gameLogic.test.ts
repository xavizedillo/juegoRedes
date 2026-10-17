import { describe, it, expect } from 'vitest';
import { calculateBossStats, processCombatTurn, validateMovement } from './gameLogic';

describe('Game Logic', () => {
  describe('calculateBossStats', () => {
    it('debe asignar más vida a un jefe de 3 jugadores que a uno de 1 jugador', () => {
      const boss1Player = calculateBossStats(1);
      const boss3Players = calculateBossStats(3);

      expect(boss3Players.hp).toBeGreaterThan(boss1Player.hp);
      expect(boss3Players.maxHp).toBeGreaterThan(boss1Player.maxHp);
    });
  });

  describe('processCombatTurn', () => {
    it('debe reducir el HP del jefe y del jugador al ejecutar el cálculo de daño', () => {
      const player = {
        id: 'player1',
        x: 1,
        y: 1,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        gold: 0,
        inventory: [],
      };

      const boss = {
        hp: 100,
        maxHp: 100,
        attack: 10,
      };

      const result = processCombatTurn(player, boss, 'attack');

      expect(result.playerHp).toBeLessThan(100);
      expect(result.bossHp).toBeLessThan(100);
      expect(player.hp).toBe(90);
      expect(boss.hp).toBe(88);
    });
  });

  describe('validateMovement', () => {
    it('debe permitir movimiento a casilla transitable', () => {
      const player = {
        id: 'player1',
        x: 1,
        y: 1,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        gold: 0,
        inventory: [],
      };

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
      const player = {
        id: 'player1',
        x: 1,
        y: 1,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        gold: 0,
        inventory: [],
      };

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
