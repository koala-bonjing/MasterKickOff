import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/queries';
import { handleApiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const artistId = searchParams.get('artistId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 6;

    if (!artistId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ARTIST_ID',
            message: 'An "artistId" parameter is required to generate 2-hop recommendations.',
          },
        },
        { status: 400 }
      );
    }

    const recs = await getRecommendations(artistId.trim(), limit);
    return handleApiSuccess(recs, { artistId, count: recs.length });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch recommendations');
  }
}
