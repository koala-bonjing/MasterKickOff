import { NextRequest, NextResponse } from 'next/server';
import { getMostConnectedArtists } from '@/lib/queries';
import { handleApiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const hubs = await getMostConnectedArtists(limit);
    return handleApiSuccess(hubs, { count: hubs.length });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch hub artists');
  }
}
