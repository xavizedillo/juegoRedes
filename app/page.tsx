'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { TILE, type MapData } from '../shared/mapGenerator';
import type { Lobby, GameState } from '../shared/types';
import { CHARACTERS, TOTAL_LEVELS, getCharacter } from '../shared/battleData';
import CharacterSelect from './components/CharacterSelect';
import BattleScreen from './components/BattleScreen';
import ShopScreen from './components/ShopScreen';
import { MusicToggle, useMusic } from './components/useMusic';
import { musicTrack } from '../shared/musicData';

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
  const [connected, setConnected] = useState(false);
  const [menuCharacter, setMenuCharacter] = useState<string>(CHARACTERS[0]!.id);
  const animationRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const lobbyRef = useRef<Lobby | null>(null);
  const [goldCollected, setGoldCollected] = useState(0);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStatus, setGameStatus] = useState<'VICTORY' | 'GAME_OVER' | 'PLAYING'>('PLAYING');
  const music = useMusic(
    musicTrack(view, gameStatus !== 'PLAYING' ? gameStatus : lobby?.gameState?.phase, lobby?.gameState?.floor ?? 1)
  );

  useEffect(() => {
    lobbyRef.current = lobby;
  }, [lobby]);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('✅ Conectado al servidor Socket.io');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('❌ Desconectado del servidor Socket.io');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
    });

    newSocket.on('lobby_created', (data: { lobbyId: string; lobby: Lobby }) => {
      console.log('🏰 Sala creada:', data);
      lobbyRef.current = data.lobby;
      setLobby(data.lobby);
      setView('lobby');
    });

    newSocket.on('lobby_updated', (updatedLobby: Lobby) => {
      console.log('🔄 Sala actualizada:', updatedLobby);
      lobbyRef.current = updatedLobby;
      setLobby(updatedLobby);
    });

    const applyGameState = (gameState: GameState) => {
      setLobby((prev) => {
        if (!prev) return prev;
        const next = { ...prev, gameState };
        lobbyRef.current = next;
        return next;
      });
      const playerData = gameState.players[newSocket.id ?? ''];
      if (playerData) {
        setPlayer({ x: playerData.x, y: playerData.y });
        setGoldCollected(playerData.gold || 0);
      }
      setCurrentFloor(gameState.floor || 1);
    };

    newSocket.on('game_started', (data: { lobby: Lobby; map: MapData }) => {
      lobbyRef.current = data.lobby;
      setLobby(data.lobby);
      setMap(data.map);
      setView('game');
      gameStartTimeRef.current = Date.now();
      setGoldCollected(0);
      setCurrentFloor(1);
      setIsGameOver(false);
      setGameStatus('PLAYING');
    });

    newSocket.on('game_state_update', (data: { gameState: GameState }) => {
      applyGameState(data.gameState);
    });

    newSocket.on('floor_started', (data: { map: MapData; gameState: GameState }) => {
      setMap(data.map);
      applyGameState(data.gameState);
    });

    newSocket.on('game_completed', async (data: { status: 'VICTORY' | 'GAME_OVER'; gameState: GameState }) => {
      setIsGameOver(true);
      setGameStatus(data.status);
      const myId = newSocket.id ?? 'unknown';
      const me = data.gameState.players[myId];
      const playtimeMinutes = Math.floor((Date.now() - gameStartTimeRef.current) / 60000);

      const telemetryData = {
        playerId: myId,
        partySize: Object.keys(data.gameState.players).length || 1,
        floorReached: data.gameState.floor || 1,
        bossesDefeated: data.gameState.bossesDefeated,
        goldCollected: me?.gold ?? 0,
        status: data.status,
        playtimeMinutes: playtimeMinutes,
        inventory: { characterId: me?.characterId ?? null, attacks: me?.attacks ?? [] },
      };

      try {
        await fetch('/api/telemetry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(telemetryData),
        });
        console.log('Telemetry saved successfully');
      } catch (error) {
        console.error('Error saving telemetry:', error);
      }
    });

    newSocket.on('error', (err: { message: string }) => {
      console.error('❌ Error del servidor:', err);
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
    if (!ctx || map.length === 0) return;

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
        Object.values(lobby.gameState.players).forEach((p) => {
          ctx.fillStyle = getCharacter(p.characterId).color;
          ctx.beginPath();
          ctx.arc(
            p.x * TILE_SIZE + TILE_SIZE / 2,
            p.y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE / 3,
            0,
            Math.PI * 2
          );
          ctx.fill();
          if (p.id === socket?.id) {
            ctx.strokeStyle = COLORS.PLAYER;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 1;
          }
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
  }, [map, player, view, lobby]);

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

      e.preventDefault();

      const currentLobby = lobbyRef.current;
      if (currentLobby?.gameState?.phase !== 'EXPLORE') return;

      const currentPlayer = currentLobby.gameState.players[socket?.id ?? ''];
      if (!currentPlayer) return;

      const newX = currentPlayer.x + dx;
      const newY = currentPlayer.y + dy;

      socket?.emit('player_move', {
        lobbyId: currentLobby.id,
        targetX: newX,
        targetY: newY,
      });
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [view, socket]);

  const handleCreateLobby = () => {
    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    socket?.emit('create_lobby', { playerName, characterId: menuCharacter });
  };

  const handleJoinLobby = () => {
    const cleanName = playerName.trim();
    const cleanCode = lobbyCode.trim();

    if (!cleanName) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    if (!cleanCode) {
      setError('Por favor ingresa el código de sala');
      return;
    }

    console.log('Intentando unirse a sala:', { lobbyId: cleanCode, playerName: cleanName });
    socket?.emit('join_lobby', { lobbyId: cleanCode, playerName: cleanName, characterId: menuCharacter });
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

  const handleSelectCharacter = (characterId: string) => {
    if (lobby) {
      socket?.emit('select_character', { lobbyId: lobby.id, characterId });
    }
  };

  const handleAttack = (attackId: string) => {
    if (lobby) {
      socket?.emit('combat_action', { lobbyId: lobby.id, action: 'attack', attackId });
    }
  };

  const handleDefend = () => {
    if (lobby) {
      socket?.emit('combat_action', { lobbyId: lobby.id, action: 'defend' });
    }
  };

  const handleBuyAttack = (attackId: string) => {
    if (lobby) {
      socket?.emit('buy_attack', { lobbyId: lobby.id, attackId });
    }
  };

  const handleShopReady = () => {
    if (lobby) {
      socket?.emit('shop_ready', { lobbyId: lobby.id });
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

    const currentLobby = lobbyRef.current;
    if (currentLobby?.gameState?.phase !== 'EXPLORE') return;
    const currentPlayer = currentLobby.gameState.players[socket?.id ?? ''];
    if (!currentPlayer) return;

    const newX = currentPlayer.x + dx;
    const newY = currentPlayer.y + dy;

    socket?.emit('player_move', { lobbyId: currentLobby.id, targetX: newX, targetY: newY });
  };

  if (view === 'menu') {
    return (
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(/portada.png) center / cover no-repeat',
        margin: 0,
        padding: 0,
        color: '#fff',
        fontFamily: 'Courier New, monospace',
      }}>
        <MusicToggle muted={music.muted} onToggle={music.toggleMuted} />
        <div style={{
          background: 'rgba(30, 20, 10, 0.95)',
          padding: '50px 60px',
          borderRadius: '4px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(139, 69, 19, 0.3)',
          maxWidth: '520px',
          width: '100%',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logotipo.png"
            alt="RogueWeb"
            style={{ width: '100%', maxWidth: '350px', marginBottom: '20px', imageRendering: 'pixelated' }}
          />

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#deb887',
              textAlign: 'left',
            }}>
              Tu Nombre
            </label>
            <input
              type="text"
              placeholder="Ingresa tu nombre"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '2px solid rgba(139, 69, 19, 0.3)',
                background: 'rgba(20, 10, 5, 0.9)',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#c9a227';
                e.target.style.boxShadow = '0 0 15px rgba(201, 162, 39, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 69, 19, 0.3)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '25px', textAlign: 'left' }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#deb887', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Elige tu personaje
            </div>
            <CharacterSelect selectedId={menuCharacter} onSelect={setMenuCharacter} />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#deb887',
              textAlign: 'left',
            }}>
              Código de Sala <span style={{ fontSize: '12px', color: '#b08a5a' }}>(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="ABC123"
              value={lobbyCode}
              onChange={(e) => {
                setLobbyCode(e.target.value.toUpperCase());
                setError('');
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '2px solid rgba(139, 69, 19, 0.3)',
                background: 'rgba(20, 10, 5, 0.9)',
                color: '#fff',
                fontSize: '16px',
                textTransform: 'uppercase',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
                letterSpacing: '2px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8b4513';
                e.target.style.boxShadow = '0 0 15px rgba(139, 69, 19, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 69, 19, 0.3)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleCreateLobby}
              style={{
                padding: '16px 24px',
                background: 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(201, 162, 39, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 162, 39, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 162, 39, 0.3)';
              }}
            >
              Crear Nueva Sala
            </button>
            <button
              onClick={handleJoinLobby}
              style={{
                padding: '16px 24px',
                background: 'linear-gradient(180deg, #8b4513 0%, #5a2d0a 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(139, 69, 19, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 69, 19, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(139, 69, 19, 0.3)';
              }}
            >
              Unirse a Sala
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: '20px',
              padding: '12px 16px',
              background: 'rgba(255, 68, 68, 0.2)',
              border: '1px solid #ff4444',
              borderRadius: '8px',
              color: '#ff6666',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <div style={{
            marginTop: '25px',
            fontSize: '12px',
            color: '#606080',
          }}>
            {connected ? (
              <span style={{ color: '#c9a227' }}>● Conectado al servidor</span>
            ) : (
              <span style={{ color: '#ff4444' }}>● Desconectado del servidor</span>
            )}
          </div>
        </div>
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
        minHeight: '100vh',
        boxSizing: 'border-box',
        background: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(/portada.png) center / cover no-repeat',
        margin: 0,
        padding: '20px 0',
        color: '#fff',
        fontFamily: 'Courier New, monospace',
      }}>
        <MusicToggle muted={music.muted} onToggle={music.toggleMuted} />
        <div style={{
          background: 'rgba(30, 20, 10, 0.95)',
          padding: '40px 50px',
          borderRadius: '4px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(139, 69, 19, 0.3)',
          maxWidth: '720px',
          boxSizing: 'border-box',
          width: '100%',
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            margin: '0 auto 15px',
            background: 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)',
            borderRadius: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(201, 162, 39, 0.3)',
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              background: '#fff',
              borderRadius: '6px',
            }}></div>
          </div>
          <h1 style={{
            marginBottom: '10px',
            fontSize: '28px',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #c9a227, #ffd700, #c9a227)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Sala: {lobby.id}
          </h1>
          <p style={{
            marginBottom: '30px',
            fontSize: '14px',
            color: '#deb887',
          }}>
            Comparte este código con tus amigos
          </p>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              marginBottom: '15px',
              fontSize: '18px',
              color: '#deb887',
            }}>
              Elige tu personaje
            </h2>
            <CharacterSelect
              selectedId={lobby.players.find(p => p.id === socket?.id)?.characterId}
              onSelect={handleSelectCharacter}
              disabled={!!lobby.players.find(p => p.id === socket?.id)?.isReady}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              marginBottom: '15px',
              fontSize: '18px',
              color: '#deb887',
            }}>
              Jugadores ({lobby.players.length}/3)
            </h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {lobby.players.map((player) => (
                <li key={player.id} style={{
                  marginBottom: '12px',
                  padding: '15px',
                  background: 'rgba(42, 26, 10, 0.85)',
                  borderRadius: '10px',
                  border: '1px solid rgba(139, 69, 19, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '16px' }}>
                    {player.name}
                    {player.id === lobby.hostId && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
                        color: '#0a0a1a',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                      }}>
                        ANFITRIÓN
                      </span>
                    )}
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '13px',
                      color: player.characterId ? getCharacter(player.characterId).color : '#666',
                    }}>
                      {player.characterId ? getCharacter(player.characterId).name : 'sin personaje'}
                    </span>
                  </span>
                  <span style={{
                    fontSize: '14px',
                    color: player.isReady ? '#c9a227' : '#666',
                    fontWeight: 'bold',
                  }}>
                    {player.isReady ? 'LISTO' : 'ESPERANDO'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handlePlayerReady}
              disabled={!lobby.players.find(p => p.id === socket?.id)?.characterId}
              title={lobby.players.find(p => p.id === socket?.id)?.characterId ? undefined : 'Primero elige un personaje'}
              style={{
                opacity: lobby.players.find(p => p.id === socket?.id)?.characterId ? 1 : 0.5,
                padding: '14px 24px',
                background: lobby.players.find(p => p.id === socket?.id)?.isReady
                  ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)'
                  : 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(201, 162, 39, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 162, 39, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 162, 39, 0.3)';
              }}
            >
              {lobby.players.find(p => p.id === socket?.id)?.isReady ? 'Cancelar' : 'Estoy Listo'}
            </button>
            {lobby.hostId === socket?.id && (
              <button
                onClick={handleStartGame}
                disabled={!lobby.players.every(p => p.isReady)}
                style={{
                  padding: '14px 24px',
                  background: lobby.players.every(p => p.isReady)
                    ? 'linear-gradient(180deg, #8b4513 0%, #5a2d0a 100%)'
                    : 'linear-gradient(135deg, #666 0%, #444 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: lobby.players.every(p => p.isReady) ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(139, 69, 19, 0.3)',
                  opacity: lobby.players.every(p => p.isReady) ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (lobby.players.every(p => p.isReady)) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 69, 19, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(139, 69, 19, 0.3)';
                }}
              >
                Iniciar Partida
              </button>
            )}
          </div>

          {error && (
            <div style={{
              marginTop: '20px',
              padding: '12px 16px',
              background: 'rgba(255, 68, 68, 0.2)',
              border: '1px solid #ff4444',
              borderRadius: '8px',
              color: '#ff6666',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={() => setView('menu')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: 'transparent',
              color: '#b08a5a',
              border: '1px solid rgba(139, 69, 19, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#b08a5a';
              e.currentTarget.style.borderColor = 'rgba(139, 69, 19, 0.3)';
            }}
          >
            Volver al menú
          </button>
        </div>
      </main>
    );
  }

  const myId = socket?.id ?? '';
  const gameState = lobby?.gameState ?? null;
  const me = gameState?.players[myId];
  const showBattle = !!gameState?.boss && (gameState.phase === 'COMBAT' || gameState.phase === 'VICTORY' || gameState.phase === 'GAME_OVER');
  const showShop = gameState?.phase === 'SHOP';

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      boxSizing: 'border-box',
      background: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(/portada.png) center / cover no-repeat',
      margin: 0,
      padding: '20px 0',
      fontFamily: 'Courier New, monospace',
    }}>
      <MusicToggle muted={music.muted} onToggle={music.toggleMuted} />
      <div style={{
        background: 'rgba(30, 20, 10, 0.95)',
        padding: '15px 40px',
        borderRadius: '15px',
        marginBottom: '20px',
        display: 'flex',
        gap: '40px',
        color: '#fff',
        fontSize: '16px',
        border: '2px solid rgba(139, 69, 19, 0.3)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            background: '#ff6b6b',
            borderRadius: '50%',
          }}></div>
          <span><strong>Vida:</strong> {me?.hp ?? 0} / {me?.maxHp ?? 0}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            background: '#ffd700',
            borderRadius: '50%',
          }}></div>
          <span><strong>Oro:</strong> {goldCollected}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            background: '#c9a227',
            borderRadius: '4px',
          }}></div>
          <span><strong>Nivel:</strong> {currentFloor} / {TOTAL_LEVELS}</span>
        </div>
        {me && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: getCharacter(me.characterId).color }}>
            <strong>{getCharacter(me.characterId).name}</strong> Nv {me.level}
          </div>
        )}
        <div style={{ fontSize: '14px', color: '#b08a5a' }}>
          {showBattle ? 'Combate por turnos' : showShop ? 'Tienda' : 'WASD / Flechas · llega a la salida roja'}
        </div>
      </div>
      {gameState && showBattle ? (
        <BattleScreen gameState={gameState} myId={myId} onAttack={handleAttack} onDefend={handleDefend} />
      ) : gameState && showShop ? (
        <ShopScreen gameState={gameState} myId={myId} onBuy={handleBuyAttack} onReady={handleShopReady} />
      ) : (
        <canvas
          ref={canvasRef}
          width={MAP_WIDTH * TILE_SIZE}
          height={MAP_HEIGHT * TILE_SIZE}
          style={{
            border: '3px solid rgba(139, 69, 19, 0.3)',
            borderRadius: '10px',
            background: '#0f0f1a',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}
      {isGameOver && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(30, 20, 10, 0.98)',
          padding: '50px 60px',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#fff',
          border: '2px solid rgba(139, 69, 19, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: gameStatus === 'VICTORY'
              ? 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)'
              : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#fff',
              borderRadius: '8px',
            }}></div>
          </div>
          <h2 style={{
            color: gameStatus === 'VICTORY' ? '#c9a227' : '#ff6b6b',
            marginBottom: '20px',
            fontSize: '36px',
            fontWeight: 'bold',
          }}>
            {gameStatus === 'VICTORY' ? 'VICTORIA' : 'GAME OVER'}
          </h2>
          <div style={{
            marginBottom: '30px',
            fontSize: '18px',
            color: '#deb887',
            lineHeight: '1.8',
          }}>
            <div>Nivel alcanzado: <strong>{currentFloor} / {TOTAL_LEVELS}</strong></div>
            <div>Jefes derrotados: <strong>{gameState?.bossesDefeated ?? 0}</strong></div>
            <div>Oro recolectado: <strong>{goldCollected}</strong></div>
          </div>
          <button
            onClick={() => setView('menu')}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(201, 162, 39, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 162, 39, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 162, 39, 0.3)';
            }}
          >
            Volver al Menú
          </button>
        </div>
      )}
      {isMobile && !showBattle && !showShop && (
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
