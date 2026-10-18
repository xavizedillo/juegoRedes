import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env['NODE_ENV'] !== 'production') globalForPrisma.prisma = prisma;

const MAX_LIMIT = 100;
const COUNT_TTL_MS = 5_000;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' };

let countCache: { value: number; expiresAt: number } | null = null;
let countInFlight: Promise<number> | null = null;

function getTotal(): Promise<number> {
  if (countCache && countCache.expiresAt > Date.now()) return Promise.resolve(countCache.value);
  countInFlight ??= prisma.matchTelemetry
    .count()
    .then((value) => {
      countCache = { value, expiresAt: Date.now() + COUNT_TTL_MS };
      return value;
    })
    .finally(() => {
      countInFlight = null;
    });
  return countInFlight;
}

const telemetrySelect = {
  id: true,
  playerId: true,
  floorReached: true,
  bossesDefeated: true,
  goldCollected: true,
  status: true,
  playtimeMinutes: true,
  createdAt: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));

    const [data, total] = await Promise.all([
      prisma.matchTelemetry.findMany({
        select: telemetrySelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      getTotal(),
    ]);

    return NextResponse.json(
      {
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error fetching telemetry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch telemetry data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      playerId?: string;
      partySize?: number;
      floorReached?: number;
      bossesDefeated?: number;
      goldCollected?: number;
      status?: string;
      playtimeMinutes?: number;
      inventory?: any;
    };

    const telemetry = await prisma.matchTelemetry.create({
      data: {
        playerId: body.playerId || 'unknown',
        partySize: body.partySize || 1,
        floorReached: body.floorReached || 1,
        bossesDefeated: body.bossesDefeated || 0,
        goldCollected: body.goldCollected || 0,
        status: body.status || 'GAME_OVER',
        playtimeMinutes: body.playtimeMinutes || 0,
        inventory: body.inventory || {},
      },
    });

    countCache = null;
    return NextResponse.json({ success: true, telemetry }, { status: 201 });
  } catch (error) {
    console.error('Error saving telemetry:', error);
    return NextResponse.json(
      { error: 'Failed to save telemetry data' },
      { status: 500 }
    );
  }
}
