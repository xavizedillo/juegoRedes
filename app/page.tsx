'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Lobby, Boss, CharacterClass } from '../shared/types';
import { CHARACTER_CLASSES, ATTACKS } from '../shared/types';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [error, setError] = useState('');
  const [boss, setBoss] = useState<Boss | null>(null);
  const animationRef = useRef<number>(0);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStatus, setGameStatus] = useState<'VICTORY' | 'GAME_OVER' | 'PLAYING'>('PLAYING');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterClass>('warrior');
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [selectedAttack, setSelectedAttack] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.io');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor Socket.io');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
    });

    newSocket.on('lobby_created', (data: { lobbyId: string; lobby: Lobby }) => {
      console.log('🏰 Sala creada:', data);
      setLobby(data.lobby);
      setView('lobby');
    });

    newSocket.on('lobby_updated', (updatedLobby: Lobby) => {
      console.log('🔄 Sala actualizada:', updatedLobby);
      setLobby(updatedLobby);
    });

    newSocket.on('game_started', (data: { lobby: Lobby; boss: Boss }) => {
      setLobby(data.lobby);
      setBoss(data.boss);
      setView('game');
      setGameStartTime(Date.now());
      setIsGameOver(false);
      setGameStatus('PLAYING');
    });

    newSocket.on('game_state_update', (data: { gameState: any; boss?: Boss; combatLog?: string }) => {
      if (lobby) {
        setLobby({ ...lobby, gameState: data.gameState });
      }
      if (data.boss) {
        setBoss(data.boss);
      }
      if (data.combatLog) {
        setCombatLog(prev => [...prev, data.combatLog!].slice(-5));
      }
    });

    newSocket.on('game_completed', async (data: { winner: string; gameState: any }) => {
      setIsGameOver(true);
      const playtimeMinutes = Math.floor((Date.now() - gameStartTime) / 60000);
      const status = data.winner === socket?.id ? 'VICTORY' : 'GAME_OVER';

      setGameStatus(status);

      const telemetryData = {
        playerId: socket?.id || 'unknown',
        partySize: lobby?.players.length || 1,
        floorReached: data.gameState.floor || 1,
        bossesDefeated: 0,
        goldCollected: 0,
        status: status,
        playtimeMinutes: playtimeMinutes,
        inventory: data.gameState.players[socket?.id ?? '']?.inventory || {},
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
    const canvas = canvasRef.current;
    if (!canvas || view !== 'game') return;

    const ctx = (canvas as HTMLCanvasElement).getContext('2d');
    if (!ctx) return;

    const scenarioImage = new Image();
    const bossImage = new Image();
    const currentFloor = lobby?.gameState?.floor || 1;

    scenarioImage.src = `/esc${currentFloor}.png`;
    bossImage.src = `/boss${currentFloor}.png`;

    const render = () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (scenarioImage.complete) {
        ctx.drawImage(scenarioImage, 0, 0, canvas.width, canvas.height);
      }

      if (boss) {
        const bossX = 150;
        const bossY = 250;
        const bossSize = 120;

        if (bossImage.complete) {
          ctx.drawImage(bossImage, bossX, bossY, bossSize, bossSize);
        } else {
          ctx.fillStyle = '#8b0000';
          ctx.fillRect(bossX, bossY, bossSize, bossSize);
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Courier New, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(boss.name || 'Boss', bossX + bossSize / 2, bossY - 15);

        const bossHpPercent = boss.hp / boss.maxHp;
        const hpBarWidth = 140;
        const hpBarHeight = 20;
        const hpBarX = bossX + bossSize / 2 - hpBarWidth / 2;
        const hpBarY = bossY - 40;

        ctx.fillStyle = '#333';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        ctx.fillStyle = bossHpPercent > 0.5 ? '#00ff00' : bossHpPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * bossHpPercent, hpBarHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Courier New, monospace';
        ctx.fillText(`${boss.hp}/${boss.maxHp}`, bossX + bossSize / 2, hpBarY - 5);
      }

      if (lobby?.gameState?.players) {
        const heroBaseX = 500;
        const heroY = 280;
        const heroSize = 80;
        const heroSpacing = 100;

        Object.values(lobby.gameState.players).forEach((p: any, index: number) => {
          const heroX = heroBaseX + index * heroSpacing;
          const characterClass = (p.characterClass || 'warrior') as CharacterClass;
          const characterImage = characterClass === 'warrior' ? '/per2.png' : characterClass === 'mage' ? '/per3.png' : '/per1.png';
          const img = new Image();
          img.src = characterImage;

          if (img.complete) {
            ctx.drawImage(img, heroX, heroY, heroSize, heroSize);
          } else {
            const stats = CHARACTER_CLASSES[characterClass];
            ctx.fillStyle = stats.color;
            ctx.fillRect(heroX, heroY, heroSize, heroSize);
          }

          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 3;
          ctx.strokeRect(heroX, heroY, heroSize, heroSize);

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px Courier New, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(p.characterClass || 'warrior', heroX + heroSize / 2, heroY - 10);

          const playerHpPercent = p.hp / p.maxHp;
          const hpBarWidth = 80;
          const hpBarHeight = 15;
          const hpBarX = heroX + heroSize / 2 - hpBarWidth / 2;
          const hpBarY = heroY - 30;

          ctx.fillStyle = '#333';
          ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

          ctx.fillStyle = playerHpPercent > 0.5 ? '#00ff00' : playerHpPercent > 0.25 ? '#ffff00' : '#ff0000';
          ctx.fillRect(hpBarX, hpBarY, hpBarWidth * playerHpPercent, hpBarHeight);

          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px Courier New, monospace';
          ctx.fillText(`${p.hp}/${p.maxHp}`, heroX + heroSize / 2, hpBarY - 5);
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
  }, [view, boss, lobby]);
        ctx.fillRect(minionX, minionY, minionSize, minionSize);
        ctx.fillStyle = '#6a6a00';
        ctx.fillRect(minionX + 5, minionY + 5, minionSize - 10, minionSize - 10);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('Orco', minionX + minionSize / 2, minionY - 5);
      }

      if (lobby?.gameState?.players) {
        const heroBaseX = 500;
        const heroY = 280;
        const heroSize = 60;
        const heroSpacing = 100;

        Object.values(lobby.gameState.players).forEach((p: any, index: number) => {
          const heroX = heroBaseX + index * heroSpacing;
          const characterClass = (p.characterClass || 'warrior') as CharacterClass;
          const stats = CHARACTER_CLASSES[characterClass];

          ctx.fillStyle = stats.color;
          ctx.fillRect(heroX, heroY, heroSize, heroSize);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(heroX, heroY, heroSize, heroSize);

          if (characterClass === 'warrior') {
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(heroX + 15, heroY + 10, 30, 5);
            ctx.fillRect(heroX + 20, heroY + 15, 5, 25);
          } else if (characterClass === 'mage') {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(heroX + 25, heroY + 15, 8, 35);
            ctx.fillStyle = '#9b59b6';
            ctx.fillRect(heroX + 20, heroY + 20, 18, 18);
          } else if (characterClass === 'tank') {
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(heroX + 10, heroY + 25, 15, 8);
            ctx.fillRect(heroX + 35, heroY + 25, 15, 8);
          }

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(stats.name, heroX + heroSize / 2, heroY - 10);

          const playerHpPercent = p.hp / p.maxHp;
          const hpBarWidth = 80;
          const hpBarHeight = 15;
          const hpBarX = heroX + heroSize / 2 - hpBarWidth / 2;
          const hpBarY = heroY - 35;

          ctx.fillStyle = '#333';
          ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

          ctx.fillStyle = playerHpPercent > 0.5 ? '#00ff00' : playerHpPercent > 0.25 ? '#ffff00' : '#ff0000';
          ctx.fillRect(hpBarX, hpBarY, hpBarWidth * playerHpPercent, hpBarHeight);

          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px Arial';
          ctx.fillText(`${p.hp}/${p.maxHp}`, heroX + heroSize / 2, hpBarY - 5);
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
  }, [view, boss, lobby]);



  const handleCreateLobby = () => {
    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    socket?.emit('create_lobby', { playerName, characterClass: selectedCharacter });
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
    socket?.emit('join_lobby', { lobbyId: cleanCode, playerName: cleanName, characterClass: selectedCharacter });
  };

  const handleAttack = (attackId: string) => {
    if (lobby) {
      setSelectedAttack(attackId);
      socket?.emit('combat_action', { lobbyId: lobby.id, attackId });
    }
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



  if (view === 'menu') {
    return (
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundImage: 'url(/portada.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        margin: 0,
        padding: 0,
        color: '#fff',
        fontFamily: 'Courier New, monospace',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 0,
        }}></div>
        <div style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(30, 20, 10, 0.95)',
          padding: '40px 50px',
          border: '4px solid #8b4513',
          textAlign: 'center',
          boxShadow: '0 0 40px rgba(139, 69, 19, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          maxWidth: '450px',
          width: '100%',
          imageRendering: 'pixelated',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #c9a227, #ffd700, #c9a227)',
            marginBottom: '30px',
            boxShadow: '0 0 10px #ffd700',
          }}></div>

          <img
            src="/logotipo.png"
            alt="XJS DUNGEON"
            style={{
              width: '100%',
              maxWidth: '350px',
              marginBottom: '20px',
              imageRendering: 'pixelated',
            }}
          />

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#deb887',
              textAlign: 'left',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Tu Nombre
            </label>
            <input
              type="text"
              placeholder="Ingresa tu nombre..."
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '3px solid #8b4513',
                background: 'rgba(20, 10, 5, 0.9)',
                color: '#ffd700',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                fontFamily: 'Courier New, monospace',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffd700';
                e.target.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#8b4513';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#deb887',
              textAlign: 'left',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Clase de Personaje
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {Object.entries(CHARACTER_CLASSES).map(([key, stats]) => {
                const characterImage = key === 'warrior' ? '/per2.png' : key === 'mage' ? '/per3.png' : '/per1.png';
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCharacter(key as CharacterClass)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      background: selectedCharacter === key
                        ? 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)'
                        : 'linear-gradient(180deg, #2a1a0a 0%, #1a0a00 100%)',
                      color: selectedCharacter === key ? '#000' : '#deb887',
                      border: selectedCharacter === key
                        ? '3px solid #ffd700'
                        : '3px solid #8b4513',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'Courier New, monospace',
                      textTransform: 'uppercase',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCharacter !== key) {
                        e.currentTarget.style.borderColor = '#ffd700';
                        e.currentTarget.style.background = 'linear-gradient(180deg, #3a2a1a 0%, #2a1a0a 100%)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCharacter !== key) {
                        e.currentTarget.style.borderColor = '#8b4513';
                        e.currentTarget.style.background = 'linear-gradient(180deg, #2a1a0a 0%, #1a0a00 100%)';
                      }
                    }}
                  >
                    <img
                      src={characterImage}
                      alt={stats.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        border: '2px solid #000',
                        boxShadow: '2px 2px 0 #000',
                        imageRendering: 'pixelated',
                      }}
                    />
                    <span>{stats.name}</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>
                      HP:{stats.hp} ATK:{stats.attack}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#deb887',
              textAlign: 'left',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Código de Sala <span style={{ fontSize: '11px', color: '#8b4513' }}>(opcional)</span>
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
                padding: '12px 14px',
                border: '3px solid #8b4513',
                background: 'rgba(20, 10, 5, 0.9)',
                color: '#ffd700',
                fontSize: '16px',
                textTransform: 'uppercase',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                fontFamily: 'Courier New, monospace',
                letterSpacing: '3px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffd700';
                e.target.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#8b4513';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleCreateLobby}
              style={{
                padding: '14px 20px',
                background: 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)',
                color: '#000',
                border: '3px solid #ffd700',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                fontFamily: 'Courier New, monospace',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                boxShadow: '0 4px 0 #5a2d0a',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 0 #5a2d0a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 0 #5a2d0a';
              }}
            >
              Crear Nueva Sala
            </button>
            <button
              onClick={handleJoinLobby}
              style={{
                padding: '14px 20px',
                background: 'linear-gradient(180deg, #8b4513 0%, #5a2d0a 100%)',
                color: '#ffd700',
                border: '3px solid #c9a227',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                fontFamily: 'Courier New, monospace',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                boxShadow: '0 4px 0 #3a1d05',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 0 #3a1d05';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 0 #3a1d05';
              }}
            >
              Unirse a Sala
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: '20px',
              padding: '12px 16px',
              background: 'rgba(139, 0, 0, 0.3)',
              border: '2px solid #ff4444',
              color: '#ff6666',
              fontSize: '14px',
              fontFamily: 'Courier New, monospace',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}>
              {error}
            </div>
          )}

          <div style={{
            marginTop: '25px',
            fontSize: '12px',
            color: '#8b4513',
            fontFamily: 'Courier New, monospace',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {socket?.connected ? (
              <span style={{ color: '#00ff00' }}>● Conectado al servidor</span>
            ) : (
              <span style={{ color: '#ff4444' }}>● Desconectado del servidor</span>
            )}
          </div>

          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #c9a227, #ffd700, #c9a227)',
            marginTop: '30px',
            boxShadow: '0 0 10px #ffd700',
          }}></div>
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
        height: '100vh',
        backgroundImage: 'url(/portada.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        margin: 0,
        padding: 0,
        color: '#fff',
        fontFamily: 'Courier New, monospace',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 0,
        }}></div>
        <div style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(30, 20, 10, 0.95)',
          padding: '40px 50px',
          border: '4px solid #8b4513',
          textAlign: 'center',
          boxShadow: '0 0 40px rgba(139, 69, 19, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          maxWidth: '450px',
          width: '100%',
          imageRendering: 'pixelated',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #c9a227, #ffd700, #c9a227)',
            marginBottom: '30px',
            boxShadow: '0 0 10px #ffd700',
          }}></div>

          <h1 style={{
            marginBottom: '10px',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#ffd700',
            textShadow: '3px 3px 0 #8b4513, -1px -1px 0 #8b4513, 1px -1px 0 #8b4513, -1px 1px 0 #8b4513',
            letterSpacing: '2px',
            fontFamily: 'Courier New, monospace',
          }}>
            SALA: {lobby.id}
          </h1>
          <p style={{
            marginBottom: '30px',
            fontSize: '14px',
            color: '#cd853f',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            fontWeight: 'bold',
          }}>
            Comparte este código con tus amigos
          </p>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              marginBottom: '15px',
              fontSize: '18px',
              color: '#deb887',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 'bold',
            }}>
              Jugadores ({lobby.players.length}/3)
            </h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {lobby.players.map((player) => (
                <li key={player.id} style={{
                  marginBottom: '12px',
                  padding: '15px',
                  background: 'rgba(42, 20, 10, 0.8)',
                  border: '2px solid #8b4513',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '16px', textTransform: 'uppercase' }}>
                    {player.name}
                    {player.id === lobby.hostId && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        background: 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)',
                        color: '#000',
                        padding: '3px 8px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}>
                        ANFITRIÓN
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: player.isReady ? '#00ff00' : '#cd853f',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
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
              style={{
                padding: '14px 20px',
                background: lobby.players.find(p => p.id === socket?.id)?.isReady
                  ? 'linear-gradient(180deg, #8b4513 0%, #5a2d0a 100%)'
                  : 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)',
                color: lobby.players.find(p => p.id === socket?.id)?.isReady ? '#ffd700' : '#000',
                border: '3px solid #ffd700',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                fontFamily: 'Courier New, monospace',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                boxShadow: '0 4px 0 #5a2d0a',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 0 #5a2d0a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 0 #5a2d0a';
              }}
            >
              {lobby.players.find(p => p.id === socket?.id)?.isReady ? 'Cancelar' : 'Estoy Listo'}
            </button>
            {lobby.hostId === socket?.id && (
              <button
                onClick={handleStartGame}
                disabled={!lobby.players.every(p => p.isReady)}
                style={{
                  padding: '14px 20px',
                  background: lobby.players.every(p => p.isReady)
                    ? 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)'
                    : 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
                  color: lobby.players.every(p => p.isReady) ? '#000' : '#666',
                  border: '3px solid #ffd700',
                  cursor: lobby.players.every(p => p.isReady) ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Courier New, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  boxShadow: '0 4px 0 #5a2d0a',
                  opacity: lobby.players.every(p => p.isReady) ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (lobby.players.every(p => p.isReady)) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 0 #5a2d0a';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 0 #5a2d0a';
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
              background: 'rgba(139, 0, 0, 0.3)',
              border: '2px solid #ff4444',
              color: '#ff6666',
              fontSize: '14px',
              fontFamily: 'Courier New, monospace',
              textTransform: 'uppercase',
              fontWeight: 'bold',
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
              color: '#cd853f',
              border: '2px solid #8b4513',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              fontFamily: 'Courier New, monospace',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffd700';
              e.currentTarget.style.borderColor = '#ffd700';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#cd853f';
              e.currentTarget.style.borderColor = '#8b4513';
            }}
          >
            Volver al menú
          </button>

          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #c9a227, #ffd700, #c9a227)',
            marginTop: '30px',
            boxShadow: '0 0 10px #ffd700',
          }}></div>
        </div>
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
      backgroundImage: 'url(/portada.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      margin: 0,
      padding: 0,
      fontFamily: 'Courier New, monospace',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 0,
      }}></div>
      <div style={{
        position: 'relative',
        zIndex: 1,
        background: 'rgba(30, 20, 10, 0.95)',
        padding: '15px 40px',
        border: '3px solid #8b4513',
        marginBottom: '20px',
        display: 'flex',
        gap: '40px',
        color: '#fff',
        fontSize: '16px',
        boxShadow: '0 0 30px rgba(139, 69, 19, 0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            background: '#ff6b6b',
            borderRadius: '50%',
          }}></div>
          <span style={{ color: '#ffd700' }}><strong>HP:</strong> {lobby?.gameState?.players[socket?.id ?? '']?.hp || 100} / {lobby?.gameState?.players[socket?.id ?? '']?.maxHp || 100}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ffd700' }}><strong>Nivel:</strong> {lobby?.gameState?.floor || 1}/10</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ffd700' }}><strong>Oro:</strong> {lobby?.gameState?.players[socket?.id ?? '']?.gold || 0}</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        style={{
          border: '4px solid #8b4513',
          borderRadius: '10px',
          background: '#0f0f1a',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          imageRendering: 'pixelated',
        }}
      />

      <div style={{
        marginTop: '20px',
        background: 'rgba(30, 20, 10, 0.95)',
        padding: '25px 30px',
        border: '4px solid #8b4513',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        maxWidth: '800px',
        width: '100%',
        position: 'relative',
      }}>
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: 'rgba(20, 10, 5, 0.8)',
          border: '2px solid #8b4513',
          minHeight: '50px',
          color: '#ffd700',
          fontSize: '14px',
          fontFamily: 'Courier New, monospace',
          textTransform: 'uppercase',
        }}>
          {combatLog.length > 0 ? combatLog[combatLog.length - 1] : '¡El Boss te desafía! Elige tu acción.'}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
        }}>
          <button
            onClick={() => setSelectedAttack(null)}
            style={{
              padding: '18px',
              background: selectedAttack === null
                ? 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)'
                : 'linear-gradient(180deg, #2a1a0a 0%, #1a0a00 100%)',
              color: selectedAttack === null ? '#000' : '#deb887',
              border: selectedAttack === null
                ? '3px solid #ffd700'
                : '3px solid #8b4513',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              fontFamily: 'Courier New, monospace',
              textTransform: 'uppercase',
              boxShadow: '0 4px 0 #5a2d0a',
            }}
            onMouseEnter={(e) => {
              if (selectedAttack !== null) {
                e.currentTarget.style.borderColor = '#ffd700';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedAttack !== null) {
                e.currentTarget.style.borderColor = '#8b4513';
              }
            }}
          >
            ATACAR
          </button>
          <button
            onClick={() => setSelectedAttack('shop')}
            style={{
              padding: '18px',
              background: selectedAttack === 'shop'
                ? 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)'
                : 'linear-gradient(180deg, #2a1a0a 0%, #1a0a00 100%)',
              color: selectedAttack === 'shop' ? '#000' : '#deb887',
              border: selectedAttack === 'shop'
                ? '3px solid #ffd700'
                : '3px solid #8b4513',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              fontFamily: 'Courier New, monospace',
              textTransform: 'uppercase',
              boxShadow: '0 4px 0 #5a2d0a',
            }}
            onMouseEnter={(e) => {
              if (selectedAttack !== 'shop') {
                e.currentTarget.style.borderColor = '#ffd700';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedAttack !== 'shop') {
                e.currentTarget.style.borderColor = '#8b4513';
              }
            }}
          >
            TIENDA
          </button>
          <button
            disabled
            style={{
              padding: '18px',
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
              color: '#666',
              border: '3px solid #3a3a3a',
              cursor: 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'Courier New, monospace',
              textTransform: 'uppercase',
            }}
          >
            OBJETO
          </button>
          <button
            disabled
            style={{
              padding: '18px',
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
              color: '#666',
              border: '3px solid #3a3a3a',
              cursor: 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'Courier New, monospace',
              textTransform: 'uppercase',
            }}
          >
            HUIR
          </button>
        </div>

        {selectedAttack === null && (
          <div style={{
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
          }}>
            {(() => {
              const playerClass = lobby?.gameState?.players[socket?.id ?? '']?.characterClass || 'warrior';
              const playerInventory = lobby?.gameState?.players[socket?.id ?? '']?.inventory || [];
              const attacks = ATTACKS[playerClass as keyof typeof ATTACKS] || ATTACKS.warrior;
              return attacks.filter(a => a.unlocked || playerInventory.includes(a.id)).map((attack) => (
                <button
                  key={attack.id}
                  onClick={() => handleAttack(attack.id)}
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(180deg, #2a1a0a 0%, #1a0a00 100%)',
                    color: '#deb887',
                    border: '3px solid #8b4513',
                    cursor: 'pointer',
                    fontSize: '11px',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    fontFamily: 'Courier New, monospace',
                    textTransform: 'uppercase',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ffd700';
                    e.currentTarget.style.background = 'linear-gradient(180deg, #3a2a1a 0%, #2a1a0a 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#8b4513';
                    e.currentTarget.style.background = 'linear-gradient(180deg, #2a1a0a 0%, #1a0a00 100%)';
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#ffd700' }}>{attack.name}</div>
                  <div style={{ opacity: 0.9 }}>Daño: {attack.damageMin}-{attack.damageMax}</div>
                  <div style={{ opacity: 0.9 }}>Precisión: {attack.accuracy}%</div>
                </button>
              ));
            })()}
          </div>
        )}

        {selectedAttack === 'shop' && (
          <div style={{
            marginTop: '20px',
            maxHeight: '300px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}>
            {(() => {
              const playerClass = lobby?.gameState?.players[socket?.id ?? '']?.characterClass || 'warrior';
              const playerGold = lobby?.gameState?.players[socket?.id ?? '']?.gold || 0;
              const playerInventory = lobby?.gameState?.players[socket?.id ?? '']?.inventory || [];
              const attacks = ATTACKS[playerClass as keyof typeof ATTACKS] || ATTACKS.warrior;
              return attacks.filter(a => !a.unlocked && !playerInventory.includes(a.id)).map((attack) => (
                <button
                  key={attack.id}
                  disabled={playerGold < (attack.cost || 0)}
                  onClick={() => {
                    if (playerGold >= (attack.cost || 0)) {
                      socket?.emit('buy_attack', { lobbyId: lobby?.id, attackId: attack.id });
                    }
                  }}
                  style={{
                    padding: '12px',
                    background: playerGold >= (attack.cost || 0)
                      ? 'linear-gradient(180deg, #2a1a0a 0%, #1a0a00 100%)'
                      : 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
                    color: playerGold >= (attack.cost || 0) ? '#deb887' : '#666',
                    border: playerGold >= (attack.cost || 0)
                      ? '3px solid #8b4513'
                      : '3px solid #3a3a3a',
                    cursor: playerGold >= (attack.cost || 0) ? 'pointer' : 'not-allowed',
                    fontSize: '11px',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    fontFamily: 'Courier New, monospace',
                    textTransform: 'uppercase',
                    opacity: playerGold >= (attack.cost || 0) ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (playerGold >= (attack.cost || 0)) {
                      e.currentTarget.style.borderColor = '#ffd700';
                      e.currentTarget.style.background = 'linear-gradient(180deg, #3a2a1a 0%, #2a1a0a 100%)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (playerGold >= (attack.cost || 0)) {
                      e.currentTarget.style.borderColor = '#8b4513';
                      e.currentTarget.style.background = 'linear-gradient(180deg, #2a1a0a 0%, #1a0a00 100%)';
                    }
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#ffd700' }}>{attack.name}</div>
                  <div style={{ opacity: 0.9 }}>Daño: {attack.damageMin}-{attack.damageMax}</div>
                  <div style={{ opacity: 0.9 }}>Precisión: {attack.accuracy}%</div>
                  <div style={{ fontWeight: 'bold', color: '#ffd700', marginTop: '4px' }}>
                    Costo: {attack.cost} oro
                  </div>
                </button>
              ));
            })()}
          </div>
        )}
              border: '3px solid #4a4a6a',
              borderRadius: '5px',
              cursor: 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          >
            [HABILIDAD]
          </button>
          <button
            disabled
            style={{
              padding: '18px',
              background: 'linear-gradient(135deg, #3a3a5a 0%, #2a2a4a 100%)',
              color: '#666',
              border: '3px solid #4a4a6a',
              borderRadius: '5px',
              cursor: 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          >
            [OBJETO]
          </button>
          <button
            disabled
            style={{
              padding: '18px',
              background: 'linear-gradient(135deg, #3a3a5a 0%, #2a2a4a 100%)',
              color: '#666',
              border: '3px solid #4a4a6a',
              borderRadius: '5px',
              cursor: 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          >
            HUIR
          </button>
        </div>
      </div>
      {isGameOver && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(26, 26, 46, 0.98)',
          padding: '50px 60px',
          borderRadius: '20px',
          textAlign: 'center',
          color: '#fff',
          border: '2px solid rgba(100, 100, 150, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            background: gameStatus === 'VICTORY'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
            borderRadius: '20px',
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
            color: gameStatus === 'VICTORY' ? '#667eea' : '#ff6b6b',
            marginBottom: '20px',
            fontSize: '36px',
            fontWeight: 'bold',
          }}>
            {gameStatus === 'VICTORY' ? 'VICTORIA' : 'GAME OVER'}
          </h2>
          <div style={{
            marginBottom: '30px',
            fontSize: '18px',
            color: '#b0b0d0',
            lineHeight: '1.8',
          }}>
            <div>Mazmorra: <strong>Hierro</strong></div>
          </div>
          <button
            onClick={() => setView('menu')}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            Volver al Menú
          </button>
        </div>
      )}
    </main>
  );
}
