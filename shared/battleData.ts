export const TOTAL_LEVELS = 10;
export const STARTING_ATTACKS = 1;

export interface AttackDef {
  id: string;
  name: string;
  description: string;
  damage: number;
  cost: number;
  price: number;
  hits?: number;
  heal?: number;
  shield?: number;
  drain?: number;
  stunChance?: number;
  critChance?: number;
  party?: boolean;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  description: string;
  color: string;
  maxHp: number;
  hpGrowth: number;
  maxEnergy: number;
  energyGrowth: number;
  power: number;
  defense: number;
  critChance: number;
  image: string;
  attacks: AttackDef[];
}

export interface BossMoveDef {
  name: string;
  multiplier: number;
  target: 'single' | 'all';
  weight: number;
}

export interface BossDef {
  level: number;
  name: string;
  title: string;
  hp: number;
  attack: number;
  moves: BossMoveDef[];
}

type AttackInput = Omit<AttackDef, 'price'> & { price?: number };

function buildAttacks(list: AttackInput[]): AttackDef[] {
  return list.map((attack, index) => ({
    ...attack,
    price: index < STARTING_ATTACKS ? 0 : (attack.price ?? 0),
  }));
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'warrior',
    name: 'Guerrero',
    title: 'Caballero de Acero',
    description: 'Mucha vida y defensa. Escudos y golpes pesados.',
    color: '#c9a227',
    image: '/per2.png',
    maxHp: 140,
    hpGrowth: 16,
    maxEnergy: 50,
    energyGrowth: 5,
    power: 1.1,
    defense: 0.85,
    critChance: 0.05,
    attacks: buildAttacks([
      { id: 'sword_thrust', name: 'Estocada con Espada', description: 'Estocada básica con la espada.', damage: 14, cost: 0 },
      { id: 'shield_bash', name: 'Golpe de Escudo', description: 'Golpea y reduce 30% el próximo daño.', damage: 12, cost: 6, shield: 0.3, price: 50 },
      { id: 'vertical_slash', name: 'Corte Vertical', description: 'Tajo potente de arriba abajo.', damage: 24, cost: 10, price: 75 },
      { id: 'whirlwind', name: 'Torbellino', description: 'Gira y golpea dos veces.', damage: 13, cost: 12, hits: 2, price: 100 },
      { id: 'heroic_strike', name: 'Golpe Heroico', description: 'Golpe que inspira: cura 20 PV.', damage: 26, cost: 12, heal: 20, price: 125 },
      { id: 'cross_slash', name: 'Corte Cruzado', description: 'Dos cortes con 15% extra de crítico.', damage: 17, cost: 14, hits: 2, critChance: 0.15, price: 150 },
      { id: 'steel_impact', name: 'Impacto de Acero', description: 'Golpe pesado con 30% de aturdir.', damage: 32, cost: 16, stunChance: 0.3, price: 175 },
      { id: 'fire_sword', name: 'Espada de Fuego', description: 'Hoja ardiente que roba el 30% del daño.', damage: 36, cost: 16, drain: 0.3, price: 200 },
      { id: 'lightning_strike', name: 'Golpe Relámpago', description: 'Golpe eléctrico con 30% de aturdir.', damage: 44, cost: 20, stunChance: 0.3, price: 225 },
      { id: 'shadow_cut', name: 'Corte de Sombras', description: 'Daña y reduce 50% el próximo daño.', damage: 40, cost: 18, shield: 0.5, price: 250 },
      { id: 'warrior_fury', name: 'Furia del Guerrero', description: 'Golpe brutal que cura 30 PV y reduce 40% el próximo daño.', damage: 40, cost: 22, heal: 30, shield: 0.4, price: 275 },
      { id: 'divine_slash', name: 'Corte Divino', description: 'Daña y cura 40 PV a todo el equipo.', damage: 50, cost: 26, heal: 40, party: true, price: 300 },
      { id: 'steel_storm', name: 'Tormenta de Acero', description: 'Tres cortes certeros.', damage: 24, cost: 28, hits: 3, price: 325 },
      { id: 'final_strike', name: 'Golpe Final', description: 'Golpe con 35% extra de crítico.', damage: 74, cost: 30, critChance: 0.35, price: 350 },
      { id: 'legendary_sword', name: 'Espada Legendaria', description: 'El ataque definitivo del guerrero.', damage: 100, cost: 38, price: 375 },
    ]),
  },
  {
    id: 'mage',
    name: 'Mago',
    title: 'Archimago Errante',
    description: 'Daño mágico enorme y mucha energía, pero poca vida.',
    color: '#9b59b6',
    image: '/per3.png',
    maxHp: 80,
    hpGrowth: 15,
    maxEnergy: 70,
    energyGrowth: 6,
    power: 1.2,
    defense: 0.85,
    critChance: 0.05,
    attacks: buildAttacks([
      { id: 'fire_spell', name: 'Hechizo de Fuego', description: 'Pequeña llama mágica.', damage: 14, cost: 0 },
      { id: 'ice_ball', name: 'Bola de Hielo', description: 'Esfera helada con 25% de aturdir.', damage: 18, cost: 8, stunChance: 0.25, price: 50 },
      { id: 'lightning_bolt', name: 'Rayo Eléctrico', description: 'Relámpago con 15% extra de crítico.', damage: 28, cost: 12, critChance: 0.15, price: 75 },
      { id: 'arcane_explosion', name: 'Explosión Arcana', description: 'Daña y reduce 50% el próximo daño.', damage: 18, cost: 12, shield: 0.5, price: 100 },
      { id: 'inferno_flames', name: 'Llamas Infernales', description: 'Dos llamaradas seguidas.', damage: 16, cost: 14, hits: 2, price: 125 },
      { id: 'ice_storm', name: 'Tormenta de Hielo', description: 'Dos ráfagas heladas, 30% de aturdir.', damage: 15, cost: 16, hits: 2, stunChance: 0.3, price: 150 },
      { id: 'fireball', name: 'Bola de Fuego', description: 'Una gran esfera ardiente.', damage: 42, cost: 20, price: 175 },
      { id: 'darkness_ray', name: 'Rayo de Oscuridad', description: 'Roba el 50% del daño causado.', damage: 34, cost: 18, drain: 0.5, price: 200 },
      { id: 'solar_explosion', name: 'Explosión Solar', description: 'Luz que daña y cura 30 PV a todo el equipo.', damage: 30, cost: 22, heal: 30, party: true, price: 225 },
      { id: 'meteor', name: 'Meteorito', description: 'Una roca ardiente con 30% de aturdir.', damage: 56, cost: 26, stunChance: 0.3, price: 250 },
      { id: 'arcane_tsunami', name: 'Tsunami Arcano', description: 'Tres olas de energía.', damage: 22, cost: 28, hits: 3, price: 275 },
      { id: 'fire_storm', name: 'Tormenta de Fuego', description: 'Daña y bloquea 60% del daño a todo el equipo.', damage: 46, cost: 28, shield: 0.6, party: true, price: 300 },
      { id: 'cosmic_ray', name: 'Rayo Cósmico', description: 'Rayo estelar que roba el 30% del daño.', damage: 72, cost: 32, drain: 0.3, price: 325 },
      { id: 'elemental_explosion', name: 'Explosión Elemental', description: 'Tres impactos con 20% extra de crítico.', damage: 30, cost: 36, hits: 3, critChance: 0.2, price: 350 },
      { id: 'supreme_spell', name: 'Hechizo Supremo', description: 'La magia definitiva.', damage: 115, cost: 46, price: 375 },
    ]),
  },
  {
    id: 'tank',
    name: 'Pícara',
    title: 'Sombra de las Dagas',
    description: 'Resistente y ágil: dagas múltiples, críticos y veneno.',
    color: '#e74c3c',
    image: '/per1.png',
    maxHp: 150,
    hpGrowth: 16,
    maxEnergy: 50,
    energyGrowth: 5,
    power: 1.1,
    defense: 0.88,
    critChance: 0.15,
    attacks: buildAttacks([
      { id: 'dagger_strike', name: 'Golpe de Daga', description: 'Puñalada rápida.', damage: 14, cost: 0 },
      { id: 'double_dagger', name: 'Doble Daga', description: 'Dos puñaladas a la vez.', damage: 9, cost: 8, hits: 2, price: 50 },
      { id: 'surprise_strike', name: 'Golpe Sorpresa', description: 'Ataque por la espalda con 30% de aturdir.', damage: 24, cost: 12, stunChance: 0.3, price: 75 },
      { id: 'quick_cut', name: 'Corte Rápido', description: 'Golpea y se aparta: reduce 50% el próximo daño.', damage: 18, cost: 10, shield: 0.5, price: 100 },
      { id: 'poison_dagger', name: 'Daga Envenenada', description: 'Roba el 50% del daño causado.', damage: 26, cost: 14, drain: 0.5, price: 125 },
      { id: 'critical_strike', name: 'Golpe Crítico', description: 'Apunta al punto débil: 35% extra de crítico.', damage: 32, cost: 16, critChance: 0.35, price: 150 },
      { id: 'dagger_combo', name: 'Combo de Daga', description: 'Cuatro puñaladas consecutivas.', damage: 11, cost: 20, hits: 4, price: 175 },
      { id: 'deadly_shadow', name: 'Sombra Mortal', description: 'Se oculta: cura 20 PV y bloquea 70% del próximo daño.', damage: 26, cost: 16, heal: 20, shield: 0.7, price: 200 },
      { id: 'ghost_strike', name: 'Golpe Fantasma', description: 'Golpe espectral con 35% de aturdir.', damage: 46, cost: 22, stunChance: 0.35, price: 225 },
      { id: 'assassination', name: 'Asesinato', description: 'Golpe letal con 40% extra de crítico.', damage: 54, cost: 26, critChance: 0.4, price: 250 },
      { id: 'dagger_storm', name: 'Tormenta de Dagas', description: 'Cinco dagas en un giro.', damage: 14, cost: 30, hits: 5, price: 275 },
      { id: 'death_cut', name: 'Corte de la Muerte', description: 'Roba el 40% del daño causado.', damage: 62, cost: 28, drain: 0.4, price: 300 },
      { id: 'ultimatum', name: 'Ultimato', description: 'Golpe con 30% extra de crítico.', damage: 80, cost: 32, critChance: 0.3, price: 325 },
      { id: 'ghost_dagger', name: 'Daga Fantasma', description: 'Cuatro dagas espectrales, 20% extra de crítico.', damage: 26, cost: 36, hits: 4, critChance: 0.2, price: 350 },
      { id: 'dagger_master', name: 'Maestro de Daga', description: 'La técnica definitiva de la pícara.', damage: 110, cost: 44, price: 375 },
    ]),
  },
];

function bossHp(level: number): number {
  const n = level - 1;
  return Math.round(100 + 62 * n + 5 * n * n);
}

function bossAttack(level: number): number {
  return Math.round(9 + 2.1 * (level - 1));
}

function bossMoves(basic: string, heavy: string, area: string): BossMoveDef[] {
  return [
    { name: basic, multiplier: 1, target: 'single', weight: 3 },
    { name: heavy, multiplier: 1.5, target: 'single', weight: 1 },
    { name: area, multiplier: 0.7, target: 'all', weight: 1 },
  ];
}

const BOSS_INFO: Array<{ name: string; title: string; moves: [string, string, string] }> = [
  { name: 'Minotauro Carcelero', title: 'Guardián de la Mazmorra', moves: ['Hachazo', 'Embestida de Cuernos', 'Pisotón'] },
  { name: 'Dragón de Hueso', title: 'Terror del Bosque Oscuro', moves: ['Zarpazo Óseo', 'Aliento Putrefacto', 'Huracán de Alas'] },
  { name: 'Señor de la Guerra Orco', title: 'Rey de la Caverna de Lava', moves: ['Mazazo', 'Golpe Brutal', 'Grito de Guerra'] },
  { name: 'Gólem de Cristal', title: 'Guardián del Palacio de Cristal', moves: ['Puño de Cristal', 'Aplastamiento', 'Lluvia de Esquirlas'] },
  { name: 'Araña Abisal', title: 'Reina del Pantano', moves: ['Mordida', 'Veneno Abisal', 'Telaraña'] },
  { name: 'Liche Supremo', title: 'Señor de las Montañas Heladas', moves: ['Toque Helado', 'Rayo Necrótico', 'Plaga'] },
  { name: 'Caballero de la Muerte', title: 'Profanador del Templo', moves: ['Espadazo', 'Carga Infernal', 'Lamento Oscuro'] },
  { name: 'Quimera', title: 'Bestia del Cementerio', moves: ['Mordisco Triple', 'Aliento de Fuego', 'Rugido'] },
  { name: 'Bestia de Hielo', title: 'Horror de las Profundidades', moves: ['Garra Helada', 'Mordida Glacial', 'Ventisca'] },
  { name: 'Archidemonio', title: 'Jefe Final', moves: ['Garra Infernal', 'Llamas del Abismo', 'Apocalipsis'] },
];

export const BOSSES: BossDef[] = BOSS_INFO.map((info, index) => ({
  level: index + 1,
  name: info.name,
  title: info.title,
  hp: bossHp(index + 1),
  attack: bossAttack(index + 1),
  moves: bossMoves(...info.moves),
}));

export function getCharacter(characterId: string | null | undefined): CharacterDef {
  return CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0]!;
}

export function isValidCharacter(characterId: string): boolean {
  return CHARACTERS.some((c) => c.id === characterId);
}

export function getAttack(characterId: string, attackId: string): AttackDef | undefined {
  return getCharacter(characterId).attacks.find((a) => a.id === attackId);
}

export function getBossDef(level: number): BossDef {
  const clamped = Math.min(Math.max(1, Math.floor(level)), BOSSES.length);
  return BOSSES[clamped - 1]!;
}

export function bossGoldReward(level: number): number {
  return 60 + level * 45;
}

export function scenarioImagePath(level: number): string {
  return `/esc${level}.png`;
}

export function bossImagePath(level: number): string {
  return level === TOTAL_LEVELS ? `/boss${level}final.png` : `/boss${level}.png`;
}

export function characterImagePath(characterId: string): string {
  return getCharacter(characterId).image;
}

export function characterAerialImagePath(characterId: string): string {
  const characterMap: Record<string, string> = {
    'warrior': '/peraerea/peraerea2.png',
    'mage': '/peraerea/peraerea3.png',
    'tank': '/peraerea/peraerea1.png',
  };
  return characterMap[characterId] || '/peraerea/peraerea1.png';
}
