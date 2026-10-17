'use client';

import type { GameState } from '../../shared/types';
import { TOTAL_LEVELS, getBossDef, getCharacter } from '../../shared/battleData';
import { attackSummary } from './BattleScreen';

interface ShopScreenProps {
  gameState: GameState;
  myId: string;
  onBuy: (attackId: string) => void;
  onReady: () => void;
}

export default function ShopScreen({ gameState, myId, onBuy, onReady }: ShopScreenProps) {
  const me = gameState.players[myId];
  if (!me) return null;
  const character = getCharacter(me.characterId);
  const defeatedBoss = getBossDef(gameState.floor);
  const nextLevel = Math.min(TOTAL_LEVELS, gameState.floor + 1);
  const isReady = gameState.shopReady.includes(myId);
  const players = Object.values(gameState.players);

  return (
    <div style={{
      width: '960px',
      maxWidth: '100%',
      color: '#fff',
      fontFamily: 'Courier New, monospace',
      background: 'rgba(30, 20, 10, 0.97)',
      borderRadius: '16px',
      padding: '24px',
      border: '2px solid rgba(139, 69, 19, 0.3)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '26px', background: 'linear-gradient(90deg, #ffd700, #ffaa00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tienda de Ataques
          </h2>
          <div style={{ fontSize: '14px', color: '#deb887', marginTop: '4px' }}>
            ¡Derrotaste a {defeatedBoss.name}! Desbloquea nuevos ataques para {character.name} antes del nivel {nextLevel}.
          </div>
        </div>
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffd700' }}>{me.gold} oro</div>
          <div style={{ fontSize: '12px', color: '#deb887' }}>{me.attacks.length} / {character.attacks.length} ataques · Nv {me.level}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
        {character.attacks.map((attack, index) => {
          const owned = me.attacks.includes(attack.id);
          const affordable = me.gold >= attack.price;
          return (
            <div key={attack.id} style={{
              padding: '12px',
              borderRadius: '10px',
              background: owned ? 'rgba(67, 233, 123, 0.12)' : 'rgba(42, 26, 10, 0.85)',
              border: `1px solid ${owned ? 'rgba(67, 233, 123, 0.5)' : 'rgba(139, 69, 19, 0.25)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: character.color }}>{index + 1}. {attack.name}</span>
                <span style={{ fontSize: '11px', color: '#4facfe' }}>{attack.cost > 0 ? `${attack.cost} EN` : 'Gratis'}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#f0dcb4', flexGrow: 1 }}>{attack.description}</div>
              <div style={{ fontSize: '11px', color: '#b08a5a' }}>{attackSummary(attack)}</div>
              {owned ? (
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#43e97b', padding: '6px 0' }}>Desbloqueado</div>
              ) : (
                <button
                  onClick={() => onBuy(attack.id)}
                  disabled={!affordable}
                  style={{
                    padding: '7px 10px',
                    background: affordable ? 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)' : 'rgba(60, 40, 20, 0.6)',
                    color: affordable ? '#0a0a1a' : '#b08a5a',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: affordable ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    fontSize: '13px',
                  }}
                >
                  Comprar · {attack.price} oro
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', gap: '16px' }}>
        <div style={{ fontSize: '13px', color: '#deb887' }}>
          {players.map((p) => (
            <span key={p.id} style={{ marginRight: '14px' }}>
              {p.name}: <strong style={{ color: gameState.shopReady.includes(p.id) ? '#43e97b' : '#b08a5a' }}>
                {gameState.shopReady.includes(p.id) ? 'LISTO' : 'comprando'}
              </strong>
            </span>
          ))}
        </div>
        <button
          onClick={onReady}
          style={{
            padding: '14px 26px',
            background: isReady
              ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)'
              : 'linear-gradient(180deg, #c9a227 0%, #8b4513 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          {isReady ? 'Cancelar' : `Continuar al nivel ${nextLevel}`}
        </button>
      </div>
    </div>
  );
}
