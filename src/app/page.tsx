'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { generateMap, TILE, isWalkable, type MapData } from '../../shared/mapGenerator';
import type { Lobby, Boss } from '../../shared/types';

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [map, setMap] = useState<MapData>([]);
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [isMobile, setIsMobile] = useState(false);
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [error, setError] = useState('');
  const [boss, setBoss] = useState<Boss | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('lobby_created', (data: { lobbyId: string; lobby: Lobby }) => {
      setLobby(data.lobby);
      setView('lobby');
    });

    newSocket.on('lobby_updated', (updatedLobby: Lobby) => {
      setLobby(updatedLobby);
    });

    newSocket.on('game_started', (data: { lobby: Lobby; map: MapData; boss: Boss }) => {
      setLobby(data.lobby);
      setMap(data.map);
      setBoss(data.boss);
      setView('game');
    });

    newSocket.on('game_state_update', (data: { gameState: any; boss?: Boss }) => {
      if (lobby) {
        setLobby({ ...lobby, gameState: data.gameState });
      }
      if (data.boss) {
        setBoss(data.boss);
      }
      if (data.gameState?.players[socket?.id ?? '']) {
        setPlayer({
          x: data.gameState.players[socket?.id ?? ''].x,
          y: data.gameState.players[socket?.id ?? ''].y,
        });
      }
    });

    newSocket.on('error', (err: { message: string }) => {
      setError(err.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (view === 'game') {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }
  }, [view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || view !== 'game') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          ctx.fillStyle = COLORS[map[y]![x]! as keyof typeof COLORS];
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#1a1a3a';
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }

      if (lobby?.gameState?.players) {
        Object.values(lobby.gameState.players).forEach((p: any) => {
          ctx.fillStyle = p.id === socket?.id ? COLORS.PLAYER : '#ff8800';
          ctx.beginPath();
          ctx.arc(
            p.x * TILE_SIZE + TILE_SIZE / 2,
            p.y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE / 3,
            0,
            Math.PI * 2
          );
          ctx.fill();
        });
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [map, player, view]);

  useEffect(() => {
    if (view !== 'game') return;

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

      if (lobby) {
        socket?.emit('player_move', { lobbyId: lobby.id, targetX: newX, targetY: newY });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [map, player, view, lobby, socket]);

  const handleCreateLobby = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    socket?.emit('create_lobby', { playerName });
  };

  const handleJoinLobby = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!lobbyCode.trim()) {
      setError('Please enter a lobby code');
      return;
    }
    socket?.emit('join_lobby', { lobbyId: lobbyCode, playerName });
  };

  const handlePlayerReady = () => {
    if (lobby) {
      socket?.emit('player_ready', { lobbyId: lobby.id });
    }
  };

  const handleStartGame = () => {
    if (lobby) {
      socket?.emit('start_game', { lobbyId: lobby.id });
    }
  };

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

    if (lobby) {
      socket?.emit('player_move', { lobbyId: lobby.id, targetX: newX, targetY: newY });
    }
  };

  if (view === 'menu') {
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
        color: '#fff',
      }}>
        <h1 style={{ marginBottom: '30px' }}>RogueWeb: Echoes of the Grid</h1>
        <input
          type="text"
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '5px',
            border: 'none',
            fontSize: '16px',
          }}
        />
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={handleCreateLobby}
            style={{
              padding: '10px 20px',
              background: '#4a4a6a',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Create Lobby
          </button>
          <button
            onClick={handleJoinLobby}
            style={{
              padding: '10px 20px',
              background: '#4a4a6a',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Join Lobby
          </button>
        </div>
        <input
          type="text"
          placeholder="Lobby Code"
          value={lobbyCode}
          onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
          style={{
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '5px',
            border: 'none',
            fontSize: '16px',
            textTransform: 'uppercase',
          }}
        />
        {error && <p style={{ color: '#ff4444' }}>{error}</p>}
      </main>
    );
  }

  if (view === 'lobby' && lobby) {
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
        color: '#fff',
      }}>
        <h1 style={{ marginBottom: '20px' }}>Lobby: {lobby.id}</h1>
        <div style={{ marginBottom: '30px' }}>
          <h2>Players ({lobby.players.length}/3)</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {lobby.players.map((player) => (
              <li key={player.id} style={{ marginBottom: '10px', padding: '10px', background: '#2a2a4a', borderRadius: '5px' }}>
                {player.name} {player.isReady ? '✓' : '○'} {player.id === lobby.hostId ? '(Host)' : ''}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={handlePlayerReady}
          style={{
            padding: '10px 20px',
            background: '#4a4a6a',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            marginBottom: '10px',
          }}
        >
          Toggle Ready
        </button>
        {lobby.hostId === socket?.id && (
          <button
            onClick={handleStartGame}
            style={{
              padding: '10px 20px',
              background: '#00ff88',
              color: '#000',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Start Game
          </button>
        )}
        {error && <p style={{ color: '#ff4444', marginTop: '20px' }}>{error}</p>}
      </main>
    );
  }

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
