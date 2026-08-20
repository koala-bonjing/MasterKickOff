import { NextRequest } from 'next/server';
import { getDriver, getNeo4jConfig } from '@/lib/neo4j';
import { handleApiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const driver = getDriver();
    const config = getNeo4jConfig();
    const serverInfo = await driver.getServerInfo();

    const session = driver.session({ database: config.database });
    let countRes: any = null;
    try {
      const res = await session.run('MATCH (a:Artist) RETURN count(a) AS totalArtists');
      countRes = res.records[0]?.get('totalArtists');
    } finally {
      await session.close();
    }

    const latencyMs = Date.now() - startTime;
    const totalArtists = typeof countRes === 'object' && countRes?.low !== undefined ? countRes.low : Number(countRes || 0);

    return handleApiSuccess({
      status: 'connected',
      serverAgent: serverInfo.agent,
      protocol: `Bolt v${serverInfo.protocolVersion}`,
      address: serverInfo.address,
      latencyMs,
      totalArtists,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return handleApiError(error, 'Health check failed');
  }
}
