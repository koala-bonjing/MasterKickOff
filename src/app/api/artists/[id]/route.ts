import { NextRequest, NextResponse } from 'next/server';
import { getArtistNeighborhood } from '@/lib/queries';
import { handleApiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Artist ID is required' } },
        { status: 400 }
      );
    }

    const neighborhood = await getArtistNeighborhood(id);
    if (!neighborhood) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Artist "${id}" not found` } },
        { status: 404 }
      );
    }

    return handleApiSuccess(neighborhood);
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch artist neighborhood');
  }
}
