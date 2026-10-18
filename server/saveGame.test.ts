import { describe, expect, it } from 'vitest';
import { createGameState, restoreGame, serializeGame, addPlayerToGame } from './gameLogic';
import { generateMap } from '../shared/mapGenerator';
import { SavedGamePayloadSchema } from '../shared/types';

function setup() {
  const state = createGameState([
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caro' },
  ]);
  state.players['a']!.x = 7;
  state.players['a']!.y = 9;
  state.players['a']!.gold = 42;
  const map = generateMap(20, 20);
  const lobbyPlayers = [
    { id: 'a', name: 'Ana', isReady: true, userId: 'user-aaaa' },
    { id: 'b', name: 'Beto', isReady: true, userId: 'user-bbbb' },
    { id: 'c', name: 'Caro', isReady: true },
  ];
  return { state, map, payload: serializeGame(state, map, lobbyPlayers) };
}

describe('guardar y reanudar partida', () => {
  it('serializa estado, mapa y miembros con userId y pasa la validación', () => {
    const { payload, map } = setup();
    expect(SavedGamePayloadSchema.safeParse(JSON.parse(JSON.stringify(payload))).success).toBe(true);
    expect(payload.map).toEqual(map);
    expect(payload.members.map((m) => m.userId)).toEqual(['user-aaaa', 'user-bbbb']);
  });

  it('restaura al jugador en su posición exacta con su nuevo socket y reserva a los demás', () => {
    const { payload } = setup();
    const restored = restoreGame(payload, 'user-aaaa', 'new-socket')!;
    expect(restored.player).toMatchObject({ id: 'new-socket', x: 7, y: 9, gold: 42 });
    expect(Object.keys(restored.state.players)).toEqual(['new-socket']);
    expect(restored.reserved.get('user-bbbb')).toMatchObject({ name: 'Beto' });
    expect(restored.map).toEqual(payload.map);

    const beto = addPlayerToGame(restored.state, 'socket-b', restored.reserved.get('user-bbbb')!);
    expect(beto.id).toBe('socket-b');
    expect(Object.keys(restored.state.players)).toHaveLength(2);
  });

  it('rechaza usuarios que no pertenecen a la partida y datos inválidos', () => {
    const { payload } = setup();
    expect(restoreGame(payload, 'user-zzzz', 'x')).toBeNull();
    expect(SavedGamePayloadSchema.safeParse({ version: 1, state: {}, map: [], members: [] }).success).toBe(false);
  });
});
