import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { searchArtists, getShortestPath, getMostConnectedArtists, getRecommendations } from '../src/lib/queries';
import { closeDriver } from '../src/lib/neo4j';

async function test() {
  console.log('--- START BENCHMARK ---');

  console.time('1. searchArtists (all 78)');
  const artists = await searchArtists('', 100);
  console.timeEnd('1. searchArtists (all 78)');
  console.log(`   Found ${artists.length} artists`);

  console.time('2. shortestPath (Grohl -> Eminem)');
  const path = await getShortestPath('dave-grohl', 'eminem');
  console.timeEnd('2. shortestPath (Grohl -> Eminem)');
  console.log(`   Hops: ${path.hops.length}`);

  console.time('3. mostConnected (top 10)');
  const hubs = await getMostConnectedArtists(10);
  console.timeEnd('3. mostConnected (top 10)');
  console.log(`   Hubs: ${hubs.length}`);

  console.time('4. recommendations (Kendrick)');
  const recs = await getRecommendations('kendrick-lamar', 6);
  console.timeEnd('4. recommendations (Kendrick)');
  console.log(`   Recs: ${recs.length}`);

  await closeDriver();
  console.log('--- DONE ---');
  process.exit(0);
}

test().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
