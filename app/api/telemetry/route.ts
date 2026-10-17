import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = 50;

    const skip = (page - 1) * pageSize;

    const [records, totalCount] = await Promise.all([
      prisma.matchTelemetry.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.matchTelemetry.count(),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: records,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: totalCount,
        pageSize,
      },
    });
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

    return NextResponse.json({ success: true, telemetry }, { status: 201 });
  } catch (error) {
    console.error('Error saving telemetry:', error);
    return NextResponse.json(
      { error: 'Failed to save telemetry data' },
      { status: 500 }
    );
  }
}
