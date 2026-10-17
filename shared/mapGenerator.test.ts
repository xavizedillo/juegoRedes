import { describe, it, expect } from 'vitest';
import { generateMap, TILE, findPath } from './mapGenerator';

describe('mapGenerator', () => {
  it('debe contener exactamente una entrada y una salida', () => {
    const map = generateMap(20, 20);
    let entrances = 0;
    let exits = 0;

    for (const row of map) {
      for (const tile of row) {
        if (tile === TILE.ENTRANCE) entrances++;
        if (tile === TILE.EXIT) exits++;
      }
    }

    expect(entrances).toBe(1);
    expect(exits).toBe(1);
  });

  it('debe existir al menos un camino válido entre la entrada y la salida', () => {
    const map = generateMap(20, 20);
    let entrance: { x: number; y: number } | null = null;
    let exit: { x: number; y: number } | null = null;

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[0]!.length; x++) {
        if (map[y]![x] === TILE.ENTRANCE) entrance = { x, y };
        if (map[y]![x] === TILE.EXIT) exit = { x, y };
      }
    }

    expect(entrance).not.toBeNull();
    expect(exit).not.toBeNull();

    const path = findPath(map, entrance!, exit!);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });
});
