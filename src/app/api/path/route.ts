import { NextRequest, NextResponse } from 'next/server';
import { getShortestPath } from '@/lib/queries';
import { handleApiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const target = searchParams.get('target');

    if (!start || !target) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Both "start" and "target" artist IDs must be provided in the query string.',
          },
        },
        { status: 400 }
      );
    }

    const pathResult = await getShortestPath(start.trim(), target.trim());
    return handleApiSuccess(pathResult, {
      startId: start,
      targetId: target,
      hopsCount: pathResult.hops.length,
    });
  } catch (error: any) {
    return handleApiError(error, 'Failed to compute shortest collaboration path');
  }
}
