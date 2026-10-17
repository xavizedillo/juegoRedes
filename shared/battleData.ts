export const TOTAL_LEVELS = 10;
export const STARTING_ATTACKS = 2;
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'] as const;

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

type AttackInput = Omit<AttackDef, 'id' | 'price'>;

export function attackPrice(index: number): number {
  return index < STARTING_ATTACKS ? 0 : 25 + index * 15;
}

function buildAttacks(characterId: string, list: AttackInput[]): AttackDef[] {
  return list.map((attack, index) => ({
    ...attack,
    id: `${characterId}-${String(index + 1).padStart(2, '0')}`,
    price: attackPrice(index),
  }));
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'guerrero',
    name: 'Guerrero',
    title: 'Caballero del Grid',
    description: 'Mucha vida y defensa. Escudos y golpes pesados.',
    color: '#e07a5f',
    maxHp: 140,
    hpGrowth: 14,
    maxEnergy: 40,
    energyGrowth: 4,
    power: 1.0,
    defense: 0.85,
    critChance: 0.05,
    attacks: buildAttacks('guerrero', [
      { name: 'Tajo', description: 'Corte básico con la espada.', damage: 14, cost: 0 },
      { name: 'Golpe de Escudo', description: 'Golpea y reduce 30% el próximo daño.', damage: 12, cost: 6, shield: 0.3 },
      { name: 'Embestida', description: 'Carga brutal contra el jefe.', damage: 24, cost: 10 },
      { name: 'Grito de Guerra', description: 'Recupera 30 PV y reduce 40% el próximo daño.', damage: 0, cost: 10, heal: 30, shield: 0.4 },
      { name: 'Corte Giratorio', description: 'Dos tajos seguidos.', damage: 13, cost: 12, hits: 2 },
      { name: 'Martillazo', description: 'Golpe pesado con 30% de aturdir.', damage: 30, cost: 14, stunChance: 0.3 },
      { name: 'Muro de Acero', description: 'Bloquea 70% del próximo daño y cura 15 PV.', damage: 10, cost: 12, shield: 0.7, heal: 15 },
      { name: 'Tajo Sangriento', description: 'Roba el 40% del daño causado.', damage: 34, cost: 16, drain: 0.4 },
      { name: 'Furia del Titán', description: 'Golpe devastador.', damage: 46, cost: 20 },
      { name: 'Contraataque Real', description: 'Daña y reduce 50% el próximo daño.', damage: 38, cost: 18, shield: 0.5 },
      { name: 'Terremoto', description: 'Sacude el suelo: 35% de aturdir.', damage: 50, cost: 24, stunChance: 0.35 },
      { name: 'Estandarte Sagrado', description: 'Cura 40 PV y protege 30% a todo el equipo.', damage: 0, cost: 20, heal: 40, shield: 0.3, party: true },
      { name: 'Hoja Ancestral', description: 'Tres cortes certeros.', damage: 24, cost: 26, hits: 3 },
      { name: 'Juicio del Rey', description: 'Golpe con 35% extra de crítico.', damage: 72, cost: 30, critChance: 0.35 },
      { name: 'Ragnarok', description: 'El ataque definitivo del guerrero.', damage: 100, cost: 38 },
    ]),
  },
  {
    id: 'mago',
    name: 'Mago',
    title: 'Hechicero Binario',
    description: 'Daño mágico enorme y mucha energía, pero poca vida.',
    color: '#7b6cf6',
    maxHp: 105,
    hpGrowth: 12,
    maxEnergy: 70,
    energyGrowth: 6,
    power: 1.2,
    defense: 0.92,
    critChance: 0.05,
    attacks: buildAttacks('mago', [
      { name: 'Chispa', description: 'Pequeña descarga mágica.', damage: 14, cost: 0 },
      { name: 'Bola de Fuego', description: 'Lanza una esfera ardiente.', damage: 22, cost: 10 },
      { name: 'Escudo Arcano', description: 'Daña y reduce 50% el próximo daño.', damage: 8, cost: 10, shield: 0.5 },
      { name: 'Rayo', description: 'Relámpago con 15% extra de crítico.', damage: 30, cost: 14, critChance: 0.15 },
      { name: 'Drenar Vida', description: 'Roba el 50% del daño causado.', damage: 22, cost: 14, drain: 0.5 },
      { name: 'Ventisca', description: 'Dos ráfagas heladas, 20% de aturdir.', damage: 16, cost: 16, hits: 2, stunChance: 0.2 },
      { name: 'Meteoro', description: 'Una roca ardiente cae del cielo.', damage: 42, cost: 20 },
      { name: 'Curación Arcana', description: 'Recupera 40 PV.', damage: 0, cost: 14, heal: 40 },
      { name: 'Cadena de Rayos', description: 'Tres rayos encadenados.', damage: 18, cost: 22, hits: 3 },
      { name: 'Prisión de Hielo', description: 'Congela al jefe: 50% de aturdir.', damage: 30, cost: 22, stunChance: 0.5 },
      { name: 'Llamarada', description: 'Columna de fuego infernal.', damage: 58, cost: 28 },
      { name: 'Barrera Temporal', description: 'Cura 25 PV y bloquea 60% del daño a todo el equipo.', damage: 0, cost: 22, heal: 25, shield: 0.6, party: true },
      { name: 'Agujero Negro', description: 'Devora al jefe y roba el 30% del daño.', damage: 70, cost: 32, drain: 0.3 },
      { name: 'Tormenta Arcana', description: 'Tres impactos con 20% extra de crítico.', damage: 30, cost: 36, hits: 3, critChance: 0.2 },
      { name: 'Supernova', description: 'La explosión estelar definitiva.', damage: 115, cost: 46 },
    ]),
  },
  {
    id: 'arquera',
    name: 'Arquera',
    title: 'Cazadora de Paquetes',
    description: 'Ataques múltiples y críticos frecuentes.',
    color: '#81b29a',
    maxHp: 115,
    hpGrowth: 13,
    maxEnergy: 50,
    energyGrowth: 5,
    power: 1.1,
    defense: 0.95,
    critChance: 0.12,
    attacks: buildAttacks('arquera', [
      { name: 'Flecha', description: 'Disparo rápido y preciso.', damage: 14, cost: 0 },
      { name: 'Disparo Doble', description: 'Dos flechas a la vez.', damage: 9, cost: 8, hits: 2 },
      { name: 'Flecha Perforante', description: 'Atraviesa armaduras, 20% extra de crítico.', damage: 26, cost: 12, critChance: 0.2 },
      { name: 'Paso Ágil', description: 'Esquiva: reduce 60% el próximo daño y cura 20 PV.', damage: 0, cost: 8, shield: 0.6, heal: 20 },
      { name: 'Lluvia de Flechas', description: 'Tres flechas desde el cielo.', damage: 10, cost: 14, hits: 3 },
      { name: 'Flecha Aturdidora', description: '40% de aturdir al jefe.', damage: 24, cost: 14, stunChance: 0.4 },
      { name: 'Disparo Certero', description: 'Apunta al punto débil: 30% extra de crítico.', damage: 40, cost: 18, critChance: 0.3 },
      { name: 'Flecha Vampírica', description: 'Roba el 50% del daño causado.', damage: 30, cost: 16, drain: 0.5 },
      { name: 'Ráfaga', description: 'Cuatro flechas consecutivas.', damage: 13, cost: 22, hits: 4 },
      { name: 'Bálsamo del Bosque', description: 'Cura 35 PV a todo el equipo.', damage: 0, cost: 16, heal: 35, party: true },
      { name: 'Flecha de Tormenta', description: 'Flecha eléctrica, 25% de aturdir.', damage: 54, cost: 26, stunChance: 0.25 },
      { name: 'Ojo de Halcón', description: 'Disparo con 50% extra de crítico.', damage: 60, cost: 28, critChance: 0.5 },
      { name: 'Danza de Flechas', description: 'Cinco flechas en un giro.', damage: 18, cost: 30, hits: 5 },
      { name: 'Flecha Lunar', description: 'Roba el 30% del daño causado.', damage: 78, cost: 34, drain: 0.3 },
      { name: 'Lluvia Celestial', description: 'Cuatro flechas de luz, 25% extra de crítico.', damage: 30, cost: 42, hits: 4, critChance: 0.25 },
    ]),
  },
  {
    id: 'sanadora',
    name: 'Sanadora',
    title: 'Clériga del Servidor',
    description: 'Cura y protege al equipo. Ideal en cooperativo.',
    color: '#f2cc8f',
    maxHp: 120,
    hpGrowth: 13,
    maxEnergy: 60,
    energyGrowth: 5,
    power: 0.95,
    defense: 0.9,
    critChance: 0.05,
    attacks: buildAttacks('sanadora', [
      { name: 'Golpe de Báculo', description: 'Golpe sencillo con el báculo.', damage: 14, cost: 0 },
      { name: 'Luz Sagrada', description: 'Daña y cura 10 PV.', damage: 18, cost: 8, heal: 10 },
      { name: 'Plegaria', description: 'Cura 35 PV a todo el equipo.', damage: 0, cost: 10, heal: 35, party: true },
      { name: 'Castigo Divino', description: 'Rayo de luz punitivo.', damage: 28, cost: 12 },
      { name: 'Aura Protectora', description: 'Cura 15 PV y bloquea 60% del daño a todo el equipo.', damage: 0, cost: 12, heal: 15, shield: 0.6, party: true },
      { name: 'Lanza de Luz', description: 'Lanza sagrada, 15% extra de crítico.', damage: 34, cost: 16, critChance: 0.15 },
      { name: 'Toque Vital', description: 'Roba el 60% del daño causado.', damage: 26, cost: 16, drain: 0.6 },
      { name: 'Destello Cegador', description: '50% de aturdir al jefe.', damage: 24, cost: 16, stunChance: 0.5 },
      { name: 'Martillo Celestial', description: 'Un martillo cae del cielo.', damage: 46, cost: 22 },
      { name: 'Renacer', description: 'Cura 70 PV a todo el equipo.', damage: 0, cost: 24, heal: 70, party: true },
      { name: 'Juicio Sagrado', description: 'Roba el 30% del daño causado.', damage: 56, cost: 26, drain: 0.3 },
      { name: 'Santuario', description: 'Cura 30 PV y bloquea 80% del daño a todo el equipo.', damage: 20, cost: 26, heal: 30, shield: 0.8, party: true },
      { name: 'Coro Angelical', description: 'Tres golpes de luz que curan 20 PV al equipo.', damage: 20, cost: 30, hits: 3, heal: 20, party: true },
      { name: 'Ira Divina', description: 'Castigo celestial, 30% de aturdir.', damage: 78, cost: 34, stunChance: 0.3 },
      { name: 'Apoteosis', description: 'Golpe divino que cura 40 PV al equipo.', damage: 105, cost: 42, heal: 40, party: true },
    ]),
  },
];

function bossHp(level: number): number {
  const n = level - 1;
  return Math.round(110 + 70 * n + 6 * n * n);
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
  { name: 'Slime Corrupto', title: 'Guardián del Nivel 1', moves: ['Golpe Viscoso', 'Ácido Corrosivo', 'Lluvia de Baba'] },
  { name: 'Golem de Datos', title: 'Guardián del Nivel 2', moves: ['Puñetazo de Piedra', 'Aplastamiento', 'Temblor'] },
  { name: 'Araña Cibernética', title: 'Guardiana del Nivel 3', moves: ['Mordida', 'Veneno Binario', 'Red Eléctrica'] },
  { name: 'Caballero Espectral', title: 'Guardián del Nivel 4', moves: ['Espadazo', 'Estocada Fantasma', 'Lamento'] },
  { name: 'Hidra de Fuego', title: 'Guardiana del Nivel 5', moves: ['Mordisco', 'Aliento Ígneo', 'Mar de Llamas'] },
  { name: 'Liche del Firewall', title: 'Guardián del Nivel 6', moves: ['Toque Helado', 'Rayo Necrótico', 'Plaga'] },
  { name: 'Dragón de Cristal', title: 'Guardián del Nivel 7', moves: ['Zarpazo', 'Aliento de Cristal', 'Tormenta de Esquirlas'] },
  { name: 'Titán Glitch', title: 'Guardián del Nivel 8', moves: ['Golpe Corrupto', 'Error Fatal', 'Pantalla Azul'] },
  { name: 'Reina del Vacío', title: 'Guardiana del Nivel 9', moves: ['Latigazo Oscuro', 'Abismo', 'Eclipse'] },
  { name: 'Señor del Grid', title: 'Jefe Final', moves: ['Pulso de Red', 'Desconexión', 'Colapso del Grid'] },
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
  return 50 + level * 35;
}

export function scenarioImagePath(level: number): string {
  return `/escenario/esc${level}`;
}

export function bossImagePath(level: number): string {
  return `/bosses/boss${level}`;
}

export function characterImagePath(characterId: string): string {
  return `/personajes/${characterId}`;
}
