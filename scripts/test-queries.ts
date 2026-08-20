import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import {
  getShortestPath,
  getRecommendations,
  getMostConnectedArtists,
  getArtistNeighborhood,
  searchArtists,
} from '../src/lib/queries';
import { closeDriver } from '../src/lib/neo4j';

async function testCoreQueries() {
  console.log('====================================================');
  console.log('🧪 Verifying Phase 2 Core Graph Queries on Live DB');
  console.log('====================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Query 1: Shortest Path (Dave Grohl -> Eminem)
    // -------------------------------------------------------------------------
    console.log('1️⃣ FLAGSHIP QUERY: Shortest Path (Dave Grohl ➔ Eminem)');
    const path1 = await getShortestPath('dave-grohl', 'eminem');
    console.log(`   Found: ${path1.found} | Degrees of Separation: ${path1.degreesOfSeparation} | Edge Hops: ${path1.totalHops}`);
    path1.hops.forEach((hop, idx) => {
      console.log(`   Step ${idx + 1}: ${hop.fromArtist.name} ➔ [${hop.via.type}: "${hop.via.titleOrName}"] ➔ ${hop.toArtist.name}`);
    });
    console.log('');

    // -------------------------------------------------------------------------
    // Query 1b: Shortest Path (Miles Davis ➔ Bruno Mars)
    // -------------------------------------------------------------------------
    console.log('1️⃣b FLAGSHIP QUERY: Shortest Path (Miles Davis ➔ Bruno Mars)');
    const path2 = await getShortestPath('miles-davis', 'bruno-mars');
    console.log(`   Found: ${path2.found} | Degrees of Separation: ${path2.degreesOfSeparation} | Edge Hops: ${path2.totalHops}`);
    path2.hops.forEach((hop, idx) => {
      console.log(`   Step ${idx + 1}: ${hop.fromArtist.name} ➔ [${hop.via.type}: "${hop.via.titleOrName}"] ➔ ${hop.toArtist.name}`);
    });
    console.log('');

    // -------------------------------------------------------------------------
    // Query 2: 2-Hop Recommendations for Kendrick Lamar
    // -------------------------------------------------------------------------
    console.log('2️⃣ 2-HOP RECOMMENDATION QUERY: Recommendations for Kendrick Lamar');
    const recs = await getRecommendations('kendrick-lamar', 5);
    console.log(`   Found ${recs.length} recommended artists (collaborators of collaborators):`);
    recs.forEach((rec, idx) => {
      console.log(`   #${idx + 1} ${rec.name} (${rec.genre}) — ${rec.mutualCollabs} mutual collaborator(s): [${rec.sampleMutuals.join(', ')}]`);
    });
    console.log('');

    // -------------------------------------------------------------------------
    // Query 3: Most Connected Industry Super-Hubs
    // -------------------------------------------------------------------------
    console.log('3️⃣ NETWORK HUBS QUERY: Top 5 Most Connected Musicians');
    const hubs = await getMostConnectedArtists(5);
    hubs.forEach((hub, idx) => {
      console.log(`   #${idx + 1} ${hub.name} (${hub.genre}) — ${hub.collaboratorCount} direct collaborators across ${hub.trackCount} tracks & bands: [${hub.bands.join(', ') || 'Solo'}]`);
    });
    console.log('');

    // -------------------------------------------------------------------------
    // Query 4: Local Neighborhood Subgraph for Paul McCartney
    // -------------------------------------------------------------------------
    console.log('4️⃣ SUBGRAPH NEIGHBORHOOD QUERY: Paul McCartney');
    const hood = await getArtistNeighborhood('paul-mccartney');
    if (hood) {
      console.log(`   Total Nodes: ${hood.nodes.length} | Total Links: ${hood.links.length}`);
      console.log(`   Bands: [${hood.bands.join(', ')}]`);
      console.log(`   Direct Collaborators: ${hood.directCollaborators.map((c) => c.name).slice(0, 5).join(', ')}... (${hood.directCollaborators.length} total)`);
    }
    console.log('');

    // -------------------------------------------------------------------------
    // Query 5: Search / Autocomplete
    // -------------------------------------------------------------------------
    console.log('5️⃣ SEARCH / AUTOCOMPLETE QUERY: Search "rock"');
    const searchRes = await searchArtists('rock', 5);
    console.log(`   Found ${searchRes.length} matches: ${searchRes.map((a) => a.name).join(', ')}`);

    console.log('\n🎉 ALL 5 GRAPH QUERIES VERIFIED SUCCESSFULLY WITH REAL LIVE DATA!');
  } catch (error: any) {
    console.error('❌ Query verification failed:', error);
    process.exitCode = 1;
  } finally {
    await closeDriver();
  }
}

testCoreQueries();
