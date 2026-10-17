'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, PlayerState } from '../../shared/types';
import {
  TOTAL_LEVELS,
  bossImagePath,
  characterImagePath,
  getAttack,
  getCharacter,
  scenarioImagePath,
  type AttackDef,
} from '../../shared/battleData';
import AssetImage from './AssetImage';
import Bar from './Bar';
import { CharacterFallback } from './CharacterSelect';

interface BattleScreenProps {
  gameState: GameState;
  myId: string;
  onAttack: (attackId: string) => void;
  onDefend: () => void;
}

export function attackSummary(attack: AttackDef): string {
  const parts: string[] = [];
  if (attack.damage > 0) parts.push(`Daño ${attack.damage}${attack.hits ? ` x${attack.hits}` : ''}`);
  if (attack.heal) parts.push(`Cura ${attack.heal}${attack.party ? ' (equipo)' : ''}`);
  if (attack.shield) parts.push(`Escudo ${Math.round(attack.shield * 100)}%`);
  if (attack.drain) parts.push(`Robo ${Math.round(attack.drain * 100)}%`);
  if (attack.stunChance) parts.push(`Aturdir ${Math.round(attack.stunChance * 100)}%`);
  if (attack.critChance) parts.push(`Crít +${Math.round(attack.critChance * 100)}%`);
  return parts.join(' · ');
}

function useHitFlash(value: number | undefined): boolean {
  const previous = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (value !== undefined && previous.current !== undefined && value < previous.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 400);
      previous.current = value;
      return () => clearTimeout(timer);
    }
    previous.current = value;
    return undefined;
  }, [value]);
  return flash;
}

function PartyMember({ player, isTurn, isMe }: { player: PlayerState; isTurn: boolean; isMe: boolean }) {
  const character = getCharacter(player.characterId);
  const flash = useHitFlash(player.hp);
  const dead = player.hp <= 0;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '150px',
      opacity: dead ? 0.35 : 1,
      filter: dead ? 'grayscale(1)' : 'none',
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        width: '100%',
        padding: '6px 8px',
        background: 'rgba(20, 10, 5, 0.8)',
        borderRadius: '8px',
        border: `2px solid ${isTurn ? '#ffd700' : 'rgba(255,255,255,0.1)'}`,
        marginBottom: '6px',
        boxShadow: isTurn ? '0 0 14px rgba(255, 215, 0, 0.6)' : 'none',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: character.color, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {player.name}{isMe ? ' (tú)' : ''} · Nv {player.level}
        </div>
        <Bar value={player.hp} max={player.maxHp} color="linear-gradient(90deg, #ff6b6b, #ee5a5a)" label="PV" height={8} />
        <div style={{ height: '4px' }} />
        <Bar value={player.energy} max={player.maxEnergy} color="linear-gradient(90deg, #4facfe, #00f2fe)" label="EN" height={6} />
        <div style={{ fontSize: '10px', color: '#a0e0ff', minHeight: '13px', marginTop: '3px' }}>
          {player.shield > 0 ? `Escudo ${Math.round(player.shield * 100)}% ` : ''}
          {player.defending ? 'En guardia' : ''}
        </div>
      </div>
      <div className={flash ? 'rw-hit' : isTurn ? 'rw-idle' : undefined} style={{ width: '130px', height: '130px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <AssetImage
          src={characterImagePath(character.id)}
          alt={character.name}
          style={{ maxWidth: '130px', maxHeight: '130px', objectFit: 'contain', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))' }}
          fallback={<CharacterFallback color={character.color} name={character.name} size={100} />}
        />
      </div>
    </div>
  );
}

export default function BattleScreen({ gameState, myId, onAttack, onDefend }: BattleScreenProps) {
  const boss = gameState.boss;
  const me = gameState.players[myId];
  const bossFlash = useHitFlash(boss?.hp);
  const logRef = useRef<HTMLDivElement>(null);
  const isMyTurn = gameState.phase === 'COMBAT' && gameState.currentTurnPlayerId === myId && (me?.hp ?? 0) > 0;
  const currentTurnPlayer = gameState.currentTurnPlayerId ? gameState.players[gameState.currentTurnPlayerId] : undefined;
  const level = boss?.level ?? gameState.floor;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [gameState.combatLog]);

  const ownedAttacks = me ? me.attacks.map((id) => getAttack(me.characterId, id)).filter((a): a is AttackDef => !!a) : [];

  return (
    <div style={{ width: '960px', maxWidth: '100%', color: '#fff', fontFamily: 'Courier New, monospace' }}>
      <style>{`
        @keyframes rw-shake { 0%,100% { transform: translateX(0); filter: none; } 20% { transform: translateX(-10px); filter: brightness(2) saturate(0.3); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(4px); } }
        @keyframes rw-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .rw-hit { animation: rw-shake 0.4s ease; }
        .rw-idle { animation: rw-float 2.4s ease-in-out infinite; }
      `}</style>

      <div style={{
        position: 'relative',
        height: '440px',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '3px solid rgba(139, 69, 19, 0.4)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        background: 'linear-gradient(180deg, #16213e 0%, #0f3460 60%, #1a1a2e 100%)',
      }}>
        <AssetImage
          src={scenarioImagePath(level)}
          alt={`Escenario ${level}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          fallback={null}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.45) 100%)' }} />

        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 18px',
          background: 'rgba(20, 10, 5, 0.8)',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}>
          Nivel {level} / {TOTAL_LEVELS} · Turno {gameState.turn}
        </div>

        {boss && (
          <div style={{ position: 'absolute', top: '50px', right: '30px', width: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', padding: '8px 12px', background: 'rgba(20, 10, 5, 0.8)', borderRadius: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#ff8a8a' }}>{boss.name}</span>
                <span style={{ fontSize: '11px', color: '#deb887' }}>{boss.title}</span>
              </div>
              <Bar value={boss.hp} max={boss.maxHp} color="linear-gradient(90deg, #f5576c, #f093fb)" label="PV" height={12} />
              {boss.stunned && <div style={{ fontSize: '11px', color: '#ffd700', marginTop: '3px' }}>Aturdido</div>}
            </div>
            <div className={bossFlash ? 'rw-hit' : 'rw-idle'} style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: boss.hp <= 0 ? 0.2 : 1, transition: 'opacity 0.6s ease' }}>
              <AssetImage
                src={bossImagePath(boss.level)}
                alt={boss.name}
                style={{ maxWidth: '340px', maxHeight: '260px', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.7))' }}
                fallback={<CharacterFallback color="#f5576c" name={boss.name} size={200} />}
              />
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '16px', left: '24px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          {Object.values(gameState.players).map((p) => (
            <PartyMember key={p.id} player={p} isTurn={gameState.phase === 'COMBAT' && p.id === gameState.currentTurnPlayerId} isMe={p.id === myId} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '14px', marginTop: '14px' }}>
        <div style={{ background: 'rgba(30, 20, 10, 0.95)', borderRadius: '12px', padding: '12px', border: '2px solid rgba(139, 69, 19, 0.3)' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', color: isMyTurn ? '#ffd700' : '#deb887', fontWeight: 'bold' }}>
            {gameState.phase !== 'COMBAT'
              ? 'Combate terminado'
              : !me || me.hp <= 0
                ? 'Has caído. Tu equipo sigue luchando...'
                : isMyTurn
                  ? '¡Tu turno! Elige un ataque'
                  : `Turno de ${currentTurnPlayer?.name ?? '...'}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', maxHeight: '190px', overflowY: 'auto', paddingRight: '4px' }}>
            {ownedAttacks.map((attack) => {
              const affordable = (me?.energy ?? 0) >= attack.cost;
              const enabled = isMyTurn && affordable;
              return (
                <button
                  key={attack.id}
                  onClick={() => onAttack(attack.id)}
                  disabled={!enabled}
                  title={`${attack.description}\n${attackSummary(attack)}`}
                  style={{
                    padding: '7px 8px',
                    textAlign: 'left',
                    background: enabled ? 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)' : 'rgba(60, 40, 20, 0.6)',
                    color: enabled ? '#fff' : '#b08a5a',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: enabled ? 'pointer' : 'not-allowed',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{attack.name}</div>
                  <div style={{ fontSize: '10px', opacity: 0.85 }}>
                    {attack.cost > 0 ? `${attack.cost} EN` : 'Gratis'} · {attackSummary(attack)}
                  </div>
                </button>
              );
            })}
            <button
              onClick={onDefend}
              disabled={!isMyTurn}
              title="Reduce a la mitad el próximo daño y recupera energía"
              style={{
                padding: '7px 8px',
                textAlign: 'left',
                background: isMyTurn ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : 'rgba(60, 40, 20, 0.6)',
                color: isMyTurn ? '#0a0a1a' : '#b08a5a',
                border: 'none',
                borderRadius: '8px',
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>Defender</div>
              <div style={{ fontSize: '10px', opacity: 0.85 }}>-50% daño · +EN</div>
            </button>
          </div>
        </div>

        <div
          ref={logRef}
          style={{
            background: 'rgba(30, 20, 10, 0.95)',
            borderRadius: '12px',
            padding: '12px',
            border: '2px solid rgba(139, 69, 19, 0.3)',
            height: '226px',
            overflowY: 'auto',
            fontSize: '12px',
            lineHeight: 1.5,
            boxSizing: 'border-box',
          }}
        >
          {gameState.combatLog.map((entry) => (
            <div key={entry.id} style={{ color: entry.kind === 'boss' ? '#ff8a8a' : entry.kind === 'player' ? '#a0c4ff' : '#ffd700', marginBottom: '4px' }}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
