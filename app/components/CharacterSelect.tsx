'use client';

import { CHARACTERS, characterImagePath } from '../../shared/battleData';
import AssetImage from './AssetImage';

interface CharacterSelectProps {
  selectedId: string | undefined;
  onSelect: (characterId: string) => void;
  disabled?: boolean;
}

export default function CharacterSelect({ selectedId, onSelect, disabled = false }: CharacterSelectProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {CHARACTERS.map((character) => {
        const selected = character.id === selectedId;
        return (
          <button
            key={character.id}
            onClick={() => onSelect(character.id)}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              textAlign: 'left',
              background: selected ? 'rgba(201, 162, 39, 0.25)' : 'rgba(42, 26, 10, 0.85)',
              border: `2px solid ${selected ? character.color : 'rgba(139, 69, 19, 0.2)'}`,
              borderRadius: '12px',
              color: '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled && !selected ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ width: '64px', height: '64px', flexShrink: 0 }}>
              <AssetImage
                src={characterImagePath(character.id)}
                alt={character.name}
                style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                fallback={<CharacterFallback color={character.color} name={character.name} size={64} />}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', color: character.color }}>{character.name}</div>
              <div style={{ fontSize: '11px', color: '#deb887', marginBottom: '4px' }}>{character.title}</div>
              <div style={{ fontSize: '11px', color: '#f0dcb4' }}>{character.description}</div>
              <div style={{ fontSize: '11px', color: '#b08a5a', marginTop: '4px' }}>
                PV {character.maxHp} · EN {character.maxEnergy}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function CharacterFallback({ color, name, size }: { color: string; name: string; size: number }) {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: `radial-gradient(circle at 35% 30%, #ffffff55, ${color} 60%, #00000088)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${Math.round(size * 0.45)}px`,
      fontWeight: 'bold',
      color: '#0a0a1a',
      boxShadow: `0 0 ${Math.round(size / 4)}px ${color}88`,
    }}>
      {name.charAt(0)}
    </div>
  );
}
