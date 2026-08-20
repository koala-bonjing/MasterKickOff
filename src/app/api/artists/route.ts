import { NextRequest, NextResponse } from 'next/server';
import { searchArtists } from '@/lib/queries';
import { handleApiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 40;

    const artists = await searchArtists(query, limit);
    return handleApiSuccess(artists, { count: artists.length, query });
  } catch (error: any) {
    return handleApiError(error, 'Failed to search artists');
  }
}
