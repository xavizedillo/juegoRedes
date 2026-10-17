'use client';

import { useEffect, useRef, useState } from 'react';
import { generateMap, TILE, isWalkable, type MapData } from '../../shared/mapGenerator';

const TILE_SIZE = 30;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;

const COLORS = {
  [TILE.FLOOR]: '#2a2a4a',
  [TILE.WALL]: '#4a4a6a',
  [TILE.ENTRANCE]: '#00ff88',
  [TILE.EXIT]: '#ff4444',
  PLAYER: '#ffff00',
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [map, setMap] = useState<MapData>([]);
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [isMobile, setIsMobile] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    const newMap = generateMap(MAP_WIDTH, MAP_HEIGHT);
    setMap(newMap);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (newMap[y][x] === TILE.ENTRANCE) {
          setPlayer({ x, y });
          break;
        }
      }
    }

    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          ctx.fillStyle = COLORS[map[y][x] as keyof typeof COLORS];
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#1a1a3a';
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }

      ctx.fillStyle = COLORS.PLAYER;
      ctx.beginPath();
      ctx.arc(
        player.x * TILE_SIZE + TILE_SIZE / 2,
        player.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [map, player]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dy = -1;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dy = 1;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dx = -1;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dx = 1;
          break;
        default:
          return;
      }

      const newX = player.x + dx;
      const newY = player.y + dy;

      if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT && isWalkable(map[newY][newX])) {
        setPlayer({ x: newX, y: newY });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [map, player]);

  const handleTouchMove = (direction: string) => {
    let dx = 0;
    let dy = 0;

    switch (direction) {
      case 'up':
        dy = -1;
        break;
      case 'down':
        dy = 1;
        break;
      case 'left':
        dx = -1;
        break;
      case 'right':
        dx = 1;
        break;
      default:
        return;
    }

    const newX = player.x + dx;
    const newY = player.y + dy;

    if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT && isWalkable(map[newY][newX])) {
      setPlayer({ x: newX, y: newY });
    }
  };

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#1a1a2e',
      margin: 0,
      padding: 0,
    }}>
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH * TILE_SIZE}
        height={MAP_HEIGHT * TILE_SIZE}
        style={{
          border: '2px solid #4a4a6a',
          background: '#0f0f1a',
        }}
      />
      {isMobile && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 60px)',
          gridTemplateRows: 'repeat(3, 60px)',
          gap: '5px',
          marginTop: '20px',
        }}>
          <div />
          <button
            onTouchStart={() => handleTouchMove('up')}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '24px',
              background: '#4a4a6a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ↑
          </button>
          <div />
          <button
            onTouchStart={() => handleTouchMove('left')}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '24px',
              background: '#4a4a6a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ←
          </button>
          <div />
          <button
            onTouchStart={() => handleTouchMove('right')}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '24px',
              background: '#4a4a6a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            →
          </button>
          <div />
          <button
            onTouchStart={() => handleTouchMove('down')}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '24px',
              background: '#4a4a6a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ↓
          </button>
          <div />
        </div>
      )}
    </main>
  );
}
