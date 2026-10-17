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
