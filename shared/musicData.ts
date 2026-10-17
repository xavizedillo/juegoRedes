import { TOTAL_LEVELS } from './battleData';

export const MUSIC = {
  menu: '/musica/menu.ogg',
  shop: '/musica/tienda.ogg',
  finalBoss: '/musica/jefe-final.ogg',
  ending: '/musica/final.ogg',
  explore: ['/musica/explora-1.ogg', '/musica/explora-2.ogg', '/musica/explora-3.ogg', '/musica/explora-4.ogg'],
  battle: ['/musica/combate-1.ogg', '/musica/combate-2.ogg'],
} as const;

function pick(tracks: readonly string[], level: number): string {
  return tracks[(Math.max(1, level) - 1) % tracks.length]!;
}

export function musicTrack(
  view: 'menu' | 'lobby' | 'game',
  phase: string | null | undefined,
  level: number
): string {
  if (view !== 'game' || !phase) return MUSIC.menu;
  if (phase === 'VICTORY' || phase === 'GAME_OVER') return MUSIC.ending;
  if (phase === 'SHOP') return MUSIC.shop;
  if (phase === 'COMBAT') return level >= TOTAL_LEVELS ? MUSIC.finalBoss : pick(MUSIC.battle, level);
  return pick(MUSIC.explore, level);
}
