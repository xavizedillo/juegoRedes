export type TileType = 0 | 1 | 2 | 3;
export const TILE = {
  FLOOR: 0,
  WALL: 1,
  ENTRANCE: 2,
  EXIT: 3,
} as const;

export type MapData = number[][];

export function generateMap(width: number = 20, height: number = 20): MapData {
  const map: MapData = [];

  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        map[y]![x] = TILE.WALL;
      } else {
        map[y]![x] = Math.random() < 0.25 ? TILE.WALL : TILE.FLOOR;
      }
    }
  }

  const entrance = { x: 1, y: 1 };
  const exit = { x: width - 2, y: height - 2 };

  map[entrance.y]![entrance.x] = TILE.ENTRANCE;
  map[exit.y]![exit.x] = TILE.EXIT;

  ensurePath(map, entrance, exit, width, height);

  ensureAreaAroundEntrance(map, entrance, width, height);

  return map;
}

function ensureAreaAroundEntrance(map: MapData, entrance: { x: number; y: number }, width: number, height: number): void {
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  for (const dir of directions) {
    const nx = entrance.x + dir.dx;
    const ny = entrance.y + dir.dy;

    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      if (map[ny]![nx] === TILE.WALL) {
        map[ny]![nx] = TILE.FLOOR;
      }
    }
  }
}

function ensurePath(map: MapData, start: { x: number; y: number }, end: { x: number; y: number }, width: number, height: number): void {
  const visited = new Set<string>();
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [{ x: start.x, y: start.y, path: [start] }];
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { x, y, path } = current;

    if (x === end.x && y === end.y) {
      for (const point of path) {
        if (map[point.y]![point.x] === TILE.WALL) {
          map[point.y]![point.x] = TILE.FLOOR;
        }
      }
      return;
    }

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const key = `${nx},${ny}`;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
      }
    }
  }
}

export function isWalkable(tile: TileType): boolean {
  return tile === TILE.FLOOR || tile === TILE.ENTRANCE || tile === TILE.EXIT;
}

export function findPath(map: MapData, start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] | null {
  const width = map[0]!.length;
  const height = map.length;
  const visited = new Set<string>();
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [{ x: start.x, y: start.y, path: [start] }];
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { x, y, path } = current;

    if (x === end.x && y === end.y) {
      return path;
    }

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const key = `${nx},${ny}`;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited.has(key) && isWalkable(map[ny]![nx]! as TileType)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
      }
    }
  }

  return null;
}
