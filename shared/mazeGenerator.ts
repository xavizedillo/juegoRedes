import type { MapData, MazeItem } from './types';
import { TILE } from './mapGenerator';

export interface MazeConfig {
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
  items: Array<{ type: 'chest' | 'roulette'; x: number; y: number }>;
}

export function getMazeImagePath(level: number): string {
  // aer1.jpg, aer2.jpg, aer3.jpg, etc.
  return `/updateesce/aer${level}.jpg`;
}

export function getMazeBackgroundPath(level: number): string {
  // Return the maze image to be used as background
  return `/updateesce/aer${level}.jpg`;
}

export function getCharacterAerialImagePath(characterId: string): string {
  const characterMap: Record<string, string> = {
    'warrior': '/peraerea/peraerea2.png',
    'mage': '/peraerea/peraerea3.png',
    'tank': '/peraerea/peraerea1.png',
  };
  return characterMap[characterId] || '/peraerea/peraerea1.png';
}

// Pre-defined maze configurations for each level
// These will need to be adjusted based on the actual maze images
const MAZE_CONFIGS: MazeConfig[] = [
  // Level 1
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 5, y: 5 },
      { type: 'roulette', x: 15, y: 10 },
    ],
  },
  // Level 2
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 10, y: 8 },
      { type: 'roulette', x: 5, y: 15 },
    ],
  },
  // Level 3
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 12, y: 5 },
      { type: 'roulette', x: 8, y: 12 },
    ],
  },
  // Level 4
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 6, y: 14 },
      { type: 'roulette', x: 14, y: 6 },
    ],
  },
  // Level 5
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 9, y: 9 },
      { type: 'roulette', x: 3, y: 10 },
    ],
  },
  // Level 6
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 15, y: 5 },
      { type: 'roulette', x: 7, y: 15 },
    ],
  },
  // Level 7
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 4, y: 12 },
      { type: 'roulette', x: 16, y: 12 },
    ],
  },
  // Level 8
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 11, y: 4 },
      { type: 'roulette', x: 6, y: 16 },
    ],
  },
  // Level 9
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 13, y: 15 },
      { type: 'roulette', x: 4, y: 7 },
    ],
  },
  // Level 10
  {
    entrance: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    items: [
      { type: 'chest', x: 8, y: 6 },
      { type: 'roulette', x: 12, y: 14 },
    ],
  },
];

export function getMazeConfig(level: number): MazeConfig {
  const index = Math.min(Math.max(1, level) - 1, MAZE_CONFIGS.length - 1);
  return MAZE_CONFIGS[index]!;
}

export function generateMazeItems(config: MazeConfig): MazeItem[] {
  return config.items.map((item, index) => ({
    id: `item_${index}`,
    type: item.type,
    x: item.x,
    y: item.y,
    collected: false,
  }));
}

// This function will be called on the client to analyze the maze image
// and generate a collision map based on wall colors
export async function analyzeMazeImage(imagePath: string): Promise<MapData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Set canvas size to match maze dimensions (20x20 tiles)
      const TILE_SIZE = 30;
      const MAP_WIDTH = 20;
      const MAP_HEIGHT = 20;
      
      canvas.width = MAP_WIDTH * TILE_SIZE;
      canvas.height = MAP_HEIGHT * TILE_SIZE;
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Analyze each tile
      const map: MapData = [];
      for (let y = 0; y < MAP_HEIGHT; y++) {
        map[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
          // Get center pixel of the tile
          const pixelX = x * TILE_SIZE + TILE_SIZE / 2;
          const pixelY = y * TILE_SIZE + TILE_SIZE / 2;
          
          const imageData = ctx.getImageData(pixelX, pixelY, 1, 1);
          const [r, g, b] = imageData.data;
          
          // Determine if this is a wall based on color
          // Walls are typically darker colors - adjust threshold for new images
          const brightness = ((r ?? 0) + (g ?? 0) + (b ?? 0)) / 3;
          
          // Check if it's a dark gray/brown wall (walls in new images)
          // Also check for very dark colors
          const isDark = brightness < 100;
          const isGrayWall = Math.abs((r ?? 0) - (g ?? 0)) < 30 && Math.abs((g ?? 0) - (b ?? 0)) < 30 && brightness < 150;
          
          if (isDark || isGrayWall) {
            map[y]![x] = TILE.WALL;
          } else {
            map[y]![x] = TILE.FLOOR;
          }
        }
      }
      
      resolve(map);
    };
    
    img.onerror = () => reject(new Error('Failed to load maze image'));
    img.src = imagePath;
  });
}

// Fallback: generate a simple maze with walls
export function generateFallbackMaze(config: MazeConfig): MapData {
  const map: MapData = [];
  const MAP_WIDTH = 20;
  const MAP_HEIGHT = 20;
  
  for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Create border walls
      if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
        map[y]![x] = TILE.WALL;
      } else {
        // Random walls with 25% chance
        map[y]![x] = Math.random() < 0.25 ? TILE.WALL : TILE.FLOOR;
      }
    }
  }
  
  // Set entrance and exit
  map[config.entrance.y]![config.entrance.x] = TILE.ENTRANCE;
  map[config.exit.y]![config.exit.x] = TILE.EXIT;
  
  // Ensure path from entrance to exit
  ensurePath(map, config.entrance, config.exit, MAP_WIDTH, MAP_HEIGHT);
  
  // Clear area around entrance
  ensureAreaAroundEntrance(map, config.entrance, MAP_WIDTH, MAP_HEIGHT);
  
  return map;
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
