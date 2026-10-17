import type { MapData } from '../shared/mapGenerator';
import { isWalkable } from '../shared/mapGenerator';
import type { BossState, CombatLogEntry, GameState, PlayerState } from '../shared/types';
import {
  TOTAL_LEVELS,
  bossGoldReward,
  getAttack,
  getBossDef,
  getCharacter,
  type AttackDef,
  type BossMoveDef,
} from '../shared/battleData';

export type { PlayerState } from '../shared/types';
export type Boss = BossState;
export type Rng = () => number;

export type CombatAction = { type: 'attack'; attackId: string } | { type: 'defend' };
export type ActionResult = { ok: true } | { ok: false; error: string };

export const ENERGY_REGEN_PER_ROUND = 12;
export const DEFEND_ENERGY_BONUS = 15;
export const DEFEND_DAMAGE_FACTOR = 0.5;
export const CRIT_MULTIPLIER = 1.5;
const BOSS_HP_PER_EXTRA_PLAYER = 0.75;
const BOSS_ATTACK_PER_EXTRA_PLAYER = 0.15;
const DAMAGE_GROWTH_PER_LEVEL = 0.1;
const HEAL_GROWTH_PER_LEVEL = 0.08;
const MAX_LOG_ENTRIES = 14;

export function validateMovement(player: PlayerState, targetX: number, targetY: number, map: MapData): boolean {
  const mapHeight = map.length;
  const mapWidth = map[0]?.length ?? 0;

  if (targetX < 0 || targetX >= mapWidth || targetY < 0 || targetY >= mapHeight) {
    return false;
  }

  const dx = Math.abs(targetX - player.x);
  const dy = Math.abs(targetY - player.y);

  if (dx + dy !== 1) {
    return false;
  }

  const tile = map[targetY]?.[targetX];
  if (tile === undefined || !isWalkable(tile as 0 | 1 | 2 | 3)) {
    return false;
  }

  player.x = targetX;
  player.y = targetY;
  return true;
}

export function createPlayerState(id: string, name: string, characterId: string | null | undefined): PlayerState {
  const character = getCharacter(characterId);
  return {
    id,
    name,
    characterId: character.id,
    x: 1,
    y: 1,
    hp: character.maxHp,
    maxHp: character.maxHp,
    energy: character.maxEnergy,
    maxEnergy: character.maxEnergy,
    level: 1,
    exp: 0,
    gold: 0,
    inventory: [],
    attacks: character.attacks.filter((a) => a.price === 0).map((a) => a.id),
    shield: 0,
    defending: false,
  };
}

export function createGameState(players: Array<{ id: string; name: string; characterId?: string | undefined }>): GameState {
  const playerStates: Record<string, PlayerState> = {};
  for (const p of players) {
    playerStates[p.id] = createPlayerState(p.id, p.name, p.characterId);
  }
  return {
    floor: 1,
    players: playerStates,
    currentTurnPlayerId: null,
    phase: 'EXPLORE',
    boss: null,
    combatLog: [],
    turn: 0,
    bossesDefeated: 0,
    shopReady: [],
  };
}

export function calculateBossStats(playerCount: number, level: number = 1): BossState {
  const def = getBossDef(level);
  const extraPlayers = Math.max(1, playerCount) - 1;
  const hp = Math.round(def.hp * (1 + BOSS_HP_PER_EXTRA_PLAYER * extraPlayers));
  const attack = Math.round(def.attack * (1 + BOSS_ATTACK_PER_EXTRA_PLAYER * extraPlayers));
  return {
    level: def.level,
    name: def.name,
    title: def.title,
    hp,
    maxHp: hp,
    attack,
    stunned: false,
  };
}

function addLog(state: GameState, text: string, kind: CombatLogEntry['kind']): void {
  const lastId = state.combatLog[state.combatLog.length - 1]?.id ?? 0;
  state.combatLog.push({ id: lastId + 1, text, kind });
  if (state.combatLog.length > MAX_LOG_ENTRIES) {
    state.combatLog.splice(0, state.combatLog.length - MAX_LOG_ENTRIES);
  }
}

export function alivePlayerIds(state: GameState): string[] {
  return Object.values(state.players)
    .filter((p) => p.hp > 0)
    .map((p) => p.id);
}

function variance(rng: Rng): number {
  return 0.9 + rng() * 0.2;
}

export function startCombat(state: GameState): void {
  const playerIds = Object.keys(state.players);
  state.boss = calculateBossStats(playerIds.length, state.floor);
  state.phase = 'COMBAT';
  state.turn = 1;
  state.combatLog = [];
  state.shopReady = [];
  for (const player of Object.values(state.players)) {
    player.energy = player.maxEnergy;
    player.shield = 0;
    player.defending = false;
  }
  state.currentTurnPlayerId = alivePlayerIds(state)[0] ?? null;
  addLog(state, `¡${state.boss.name} aparece! (${state.boss.title})`, 'info');
}

export function estimateAttackDamage(player: PlayerState, attack: AttackDef): number {
  const character = getCharacter(player.characterId);
  const levelMultiplier = 1 + DAMAGE_GROWTH_PER_LEVEL * (player.level - 1);
  return Math.round(attack.damage * character.power * levelMultiplier) * (attack.hits ?? 1);
}

export function estimateAttackHeal(player: PlayerState, attack: AttackDef): number {
  return Math.round((attack.heal ?? 0) * (1 + HEAL_GROWTH_PER_LEVEL * (player.level - 1)));
}

function applyAttack(state: GameState, player: PlayerState, attack: AttackDef, rng: Rng): void {
  const boss = state.boss!;
  const character = getCharacter(player.characterId);
  const levelMultiplier = 1 + DAMAGE_GROWTH_PER_LEVEL * (player.level - 1);
  player.energy -= attack.cost;

  const parts: string[] = [];
  let totalDamage = 0;
  let crits = 0;
  if (attack.damage > 0) {
    const hits = attack.hits ?? 1;
    for (let i = 0; i < hits; i++) {
      let damage = attack.damage * character.power * levelMultiplier * variance(rng);
      if (rng() < character.critChance + (attack.critChance ?? 0)) {
        damage *= CRIT_MULTIPLIER;
        crits++;
      }
      totalDamage += Math.max(1, Math.round(damage));
    }
    boss.hp = Math.max(0, boss.hp - totalDamage);
    parts.push(`causa ${totalDamage} de daño${crits > 0 ? ` (${crits > 1 ? `${crits} críticos` : '¡crítico!'})` : ''}`);
  }

  if (attack.drain && totalDamage > 0) {
    const healed = Math.round(totalDamage * attack.drain);
    player.hp = Math.min(player.maxHp, player.hp + healed);
    parts.push(`roba ${healed} PV`);
  }

  const supportTargets = attack.party
    ? Object.values(state.players).filter((p) => p.hp > 0)
    : [player];

  if (attack.heal) {
    const heal = estimateAttackHeal(player, attack);
    for (const target of supportTargets) {
      target.hp = Math.min(target.maxHp, target.hp + heal);
    }
    parts.push(`cura ${heal} PV${attack.party ? ' al equipo' : ''}`);
  }

  if (attack.shield) {
    for (const target of supportTargets) {
      target.shield = Math.max(target.shield, attack.shield);
    }
    parts.push(`escudo ${Math.round(attack.shield * 100)}%${attack.party ? ' al equipo' : ''}`);
  }

  if (attack.stunChance && boss.hp > 0 && rng() < attack.stunChance) {
    boss.stunned = true;
    parts.push('¡aturde al jefe!');
  }

  addLog(state, `${player.name} usa ${attack.name}: ${parts.join(', ')}.`, 'player');
}

function pickBossMove(moves: BossMoveDef[], rng: Rng): BossMoveDef {
  const totalWeight = moves.reduce((sum, m) => sum + m.weight, 0);
  let roll = rng() * totalWeight;
  for (const move of moves) {
    roll -= move.weight;
    if (roll < 0) return move;
  }
  return moves[moves.length - 1]!;
}

export function bossTurn(state: GameState, rng: Rng = Math.random): void {
  const boss = state.boss;
  if (!boss || boss.hp <= 0) return;

  if (boss.stunned) {
    boss.stunned = false;
    addLog(state, `${boss.name} está aturdido y pierde su turno.`, 'boss');
  } else {
    const alive = Object.values(state.players).filter((p) => p.hp > 0);
    const move = pickBossMove(getBossDef(boss.level).moves, rng);
    const targets = move.target === 'all'
      ? alive
      : [alive[Math.floor(rng() * alive.length)]!].filter(Boolean);

    const hitTexts: string[] = [];
    for (const target of targets) {
      const character = getCharacter(target.characterId);
      let damage = boss.attack * move.multiplier * variance(rng) * character.defense;
      if (target.defending) damage *= DEFEND_DAMAGE_FACTOR;
      damage *= 1 - target.shield;
      const finalDamage = Math.max(1, Math.round(damage));
      target.shield = 0;
      target.hp = Math.max(0, target.hp - finalDamage);
      hitTexts.push(`${target.name} -${finalDamage} PV${target.hp === 0 ? ' (¡cae!)' : ''}`);
    }
    addLog(state, `${boss.name} usa ${move.name}: ${hitTexts.join(', ')}.`, 'boss');
  }

  for (const player of Object.values(state.players)) {
    player.defending = false;
  }
}

function handleBossDefeated(state: GameState): void {
  const boss = state.boss!;
  const reward = bossGoldReward(boss.level);
  state.bossesDefeated++;
  addLog(state, `¡${boss.name} ha sido derrotado! +${reward} de oro.`, 'info');

  for (const player of Object.values(state.players)) {
    const character = getCharacter(player.characterId);
    player.gold += reward;
    player.level++;
    player.exp += boss.level * 100;
    player.maxHp += character.hpGrowth;
    player.hp = player.maxHp;
    player.maxEnergy += character.energyGrowth;
    player.energy = player.maxEnergy;
    player.shield = 0;
    player.defending = false;
  }

  state.currentTurnPlayerId = null;
  state.shopReady = [];
  state.phase = state.floor >= TOTAL_LEVELS ? 'VICTORY' : 'SHOP';
}

function endRound(state: GameState, rng: Rng): void {
  bossTurn(state, rng);
  const alive = alivePlayerIds(state);
  if (alive.length === 0) {
    state.phase = 'GAME_OVER';
    state.currentTurnPlayerId = null;
    addLog(state, 'Todo el equipo ha caído...', 'info');
    return;
  }
  for (const id of alive) {
    const player = state.players[id]!;
    player.energy = Math.min(player.maxEnergy, player.energy + ENERGY_REGEN_PER_ROUND);
  }
  state.turn++;
  state.currentTurnPlayerId = alive[0]!;
}

function advanceTurn(state: GameState, fromPlayerId: string | null, rng: Rng): void {
  const order = Object.keys(state.players);
  const fromIndex = fromPlayerId === null ? -1 : order.indexOf(fromPlayerId);
  const next = order.slice(fromIndex + 1).find((id) => state.players[id]!.hp > 0);
  if (next) {
    state.currentTurnPlayerId = next;
  } else {
    endRound(state, rng);
  }
}

export function performCombatAction(
  state: GameState,
  playerId: string,
  action: CombatAction,
  rng: Rng = Math.random,
): ActionResult {
  if (state.phase !== 'COMBAT' || !state.boss) return { ok: false, error: 'No hay combate activo' };
  if (state.currentTurnPlayerId !== playerId) return { ok: false, error: 'No es tu turno' };
  const player = state.players[playerId];
  if (!player || player.hp <= 0) return { ok: false, error: 'Jugador no disponible' };

  if (action.type === 'attack') {
    const attack = getAttack(player.characterId, action.attackId);
    if (!attack || !player.attacks.includes(attack.id)) return { ok: false, error: 'Ataque no desbloqueado' };
    if (player.energy < attack.cost) return { ok: false, error: 'Energía insuficiente' };
    applyAttack(state, player, attack, rng);
  } else {
    player.defending = true;
    player.energy = Math.min(player.maxEnergy, player.energy + DEFEND_ENERGY_BONUS);
    addLog(state, `${player.name} se pone en guardia (+${DEFEND_ENERGY_BONUS} energía).`, 'player');
  }

  if (state.boss.hp <= 0) {
    handleBossDefeated(state);
    return { ok: true };
  }

  advanceTurn(state, playerId, rng);
  return { ok: true };
}

export function buyAttack(state: GameState, playerId: string, attackId: string): ActionResult {
  if (state.phase !== 'SHOP') return { ok: false, error: 'La tienda está cerrada' };
  const player = state.players[playerId];
  if (!player) return { ok: false, error: 'Jugador no encontrado' };
  const attack = getAttack(player.characterId, attackId);
  if (!attack) return { ok: false, error: 'Ataque no disponible para tu personaje' };
  if (player.attacks.includes(attack.id)) return { ok: false, error: 'Ya tienes este ataque' };
  if (player.gold < attack.price) return { ok: false, error: 'Oro insuficiente' };
  player.gold -= attack.price;
  player.attacks.push(attack.id);
  return { ok: true };
}

export function setShopReady(state: GameState, playerId: string): boolean {
  if (state.phase !== 'SHOP' || !state.players[playerId]) return false;
  if (state.shopReady.includes(playerId)) {
    state.shopReady = state.shopReady.filter((id) => id !== playerId);
  } else {
    state.shopReady.push(playerId);
  }
  return allShopReady(state);
}

export function allShopReady(state: GameState): boolean {
  const ids = Object.keys(state.players);
  return ids.length > 0 && ids.every((id) => state.shopReady.includes(id));
}

export function advanceToNextFloor(state: GameState): void {
  state.floor = Math.min(TOTAL_LEVELS, state.floor + 1);
  state.phase = 'EXPLORE';
  state.boss = null;
  state.combatLog = [];
  state.shopReady = [];
  state.turn = 0;
  state.currentTurnPlayerId = null;
  for (const player of Object.values(state.players)) {
    player.x = 1;
    player.y = 1;
  }
}

export function removePlayerFromGame(state: GameState, playerId: string, rng: Rng = Math.random): void {
  if (!state.players[playerId]) return;
  const order = Object.keys(state.players);
  const index = order.indexOf(playerId);
  const wasCurrent = state.currentTurnPlayerId === playerId;
  delete state.players[playerId];
  state.shopReady = state.shopReady.filter((id) => id !== playerId);

  if (state.phase === 'COMBAT' && wasCurrent && Object.keys(state.players).length > 0) {
    const previous = index > 0 ? order[index - 1]! : null;
    advanceTurn(state, previous !== null && state.players[previous] ? previous : null, rng);
  }
}
