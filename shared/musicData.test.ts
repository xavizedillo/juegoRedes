import { describe, expect, it } from 'vitest';
import { MUSIC, musicTrack } from './musicData';

describe('musicTrack', () => {
  it('usa la música del menú fuera de la partida', () => {
    expect(musicTrack('menu', null, 1)).toBe(MUSIC.menu);
    expect(musicTrack('lobby', null, 1)).toBe(MUSIC.menu);
  });

  it('cambia la música de exploración y combate según el nivel', () => {
    expect(musicTrack('game', 'EXPLORE', 1)).toBe(MUSIC.explore[0]);
    expect(musicTrack('game', 'EXPLORE', 2)).toBe(MUSIC.explore[1]);
    expect(musicTrack('game', 'EXPLORE', 5)).toBe(MUSIC.explore[0]);
    expect(musicTrack('game', 'COMBAT', 1)).toBe(MUSIC.battle[0]);
    expect(musicTrack('game', 'COMBAT', 2)).toBe(MUSIC.battle[1]);
  });

  it('usa temas especiales para jefe final, tienda y final de partida', () => {
    expect(musicTrack('game', 'COMBAT', 10)).toBe(MUSIC.finalBoss);
    expect(musicTrack('game', 'SHOP', 3)).toBe(MUSIC.shop);
    expect(musicTrack('game', 'VICTORY', 10)).toBe(MUSIC.ending);
    expect(musicTrack('game', 'GAME_OVER', 4)).toBe(MUSIC.ending);
  });
});
