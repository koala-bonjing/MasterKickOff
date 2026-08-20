import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDriver, closeDriver } from '../src/lib/neo4j';
import { setupConstraints } from './setup-constraints';

/**
 * IDEMPOTENT GRAPH SEEDING SCRIPT
 * 
 * WHY MERGE VS CREATE:
 * - `CREATE` unconditionally writes a new node/relationship every time it is called. If you run a CREATE seed script
 *   twice, your graph duplicates all nodes and edges, inflating degree metrics and corrupting path traversals.
 * - `MERGE` provides find-or-create semantics:
 *   MERGE (a:Artist { id: item.id })
 *   ON CREATE SET a.name = item.name, a.genre = item.genre, a.bio = item.bio, a.createdAt = timestamp()
 *   ON MATCH SET a.name = item.name, a.genre = item.genre, a.bio = item.bio, a.updatedAt = timestamp()
 * 
 * WHY UNIQUENESS CONSTRAINTS ARE CRITICAL HERE:
 * - When Cypher runs `MERGE (a:Artist { id: 'dave-grohl' })`, it must search if that node exists.
 * - Without a uniqueness constraint/index on `Artist.id`, Neo4j performs an O(N) full label scan for every item.
 * - With a uniqueness constraint, Neo4j uses an in-memory B-Tree index for instantaneous O(1) point lookups,
 *   preventing race conditions and making large batch ingestions orders of magnitude faster.
 */

async function seedDatabase() {
  const startTime = Date.now();
  console.log('====================================================');
  console.log('🌱 Starting Idempotent Graph Seeding (MERGE Strategy)');
  console.log('====================================================');

  // Step 1: Ensure uniqueness constraints exist first
  await setupConstraints();

  // Step 2: Load the curated JSON seed dataset
  const datasetPath = path.resolve(process.cwd(), 'src/data/seed-network.json');
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Seed dataset not found at ${datasetPath}`);
  }

  const rawData = fs.readFileSync(datasetPath, 'utf8');
  const data = JSON.parse(rawData);

  const driver = getDriver();
  const session = driver.session();

  try {
    // -------------------------------------------------------------------------
    // 1. Seed Artists (MERGE)
    // -------------------------------------------------------------------------
    console.log(`📦 Merging ${data.artists.length} Artist nodes...`);
    const artistCypher = `
      UNWIND $batch AS item
      MERGE (a:Artist { id: item.id })
      ON CREATE SET 
        a.name = item.name,
        a.genre = item.genre,
        a.bio = item.bio,
        a.imageUrl = item.imageUrl,
        a.createdAt = timestamp()
      ON MATCH SET 
        a.name = item.name,
        a.genre = item.genre,
        a.bio = item.bio,
        a.imageUrl = item.imageUrl,
        a.updatedAt = timestamp()
      RETURN count(a) AS count
    `;
    const artistRes = await session.run(artistCypher, { batch: data.artists });
    console.log(`   ✅ Artists processed: ${artistRes.records[0].get('count')}`);

    // -------------------------------------------------------------------------
    // 2. Seed Bands (MERGE)
    // -------------------------------------------------------------------------
    console.log(`📦 Merging ${data.bands.length} Band nodes...`);
    const bandCypher = `
      UNWIND $batch AS item
      MERGE (b:Band { id: item.id })
      ON CREATE SET 
        b.name = item.name,
        b.formedYear = item.formedYear,
        b.createdAt = timestamp()
      ON MATCH SET 
        b.name = item.name,
        b.formedYear = item.formedYear,
        b.updatedAt = timestamp()
      RETURN count(b) AS count
    `;
    const bandRes = await session.run(bandCypher, { batch: data.bands });
    console.log(`   ✅ Bands processed: ${bandRes.records[0].get('count')}`);

    // -------------------------------------------------------------------------
    // 3. Seed Albums (MERGE)
    // -------------------------------------------------------------------------
    console.log(`📦 Merging ${data.albums.length} Album nodes...`);
    const albumCypher = `
      UNWIND $batch AS item
      MERGE (al:Album { id: item.id })
      ON CREATE SET 
        al.title = item.title,
        al.releaseYear = item.releaseYear,
        al.createdAt = timestamp()
      ON MATCH SET 
        al.title = item.title,
        al.releaseYear = item.releaseYear,
        al.updatedAt = timestamp()
      RETURN count(al) AS count
    `;
    const albumRes = await session.run(albumCypher, { batch: data.albums });
    console.log(`   ✅ Albums processed: ${albumRes.records[0].get('count')}`);

    // -------------------------------------------------------------------------
    // 4. Seed Tracks (MERGE)
    // -------------------------------------------------------------------------
    console.log(`📦 Merging ${data.tracks.length} Track nodes...`);
    const trackCypher = `
      UNWIND $batch AS item
      MERGE (t:Track { id: item.id })
      ON CREATE SET 
        t.title = item.title,
        t.durationMs = item.durationMs,
        t.releaseYear = item.releaseYear,
        t.createdAt = timestamp()
      ON MATCH SET 
        t.title = item.title,
        t.durationMs = item.durationMs,
        t.releaseYear = item.releaseYear,
        t.updatedAt = timestamp()
      RETURN count(t) AS count
    `;
    const trackRes = await session.run(trackCypher, { batch: data.tracks });
    console.log(`   ✅ Tracks processed: ${trackRes.records[0].get('count')}`);

    // -------------------------------------------------------------------------
    // 5. Seed Relationships: (:Artist)-[:MEMBER_OF]->(:Band)
    // -------------------------------------------------------------------------
    console.log(`🔗 Merging ${data.memberOf.length} [:MEMBER_OF] relationships...`);
    const memberOfCypher = `
      UNWIND $batch AS item
      MATCH (a:Artist { id: item.artistId })
      MATCH (b:Band { id: item.bandId })
      MERGE (a)-[r:MEMBER_OF]->(b)
      ON CREATE SET r.role = item.role, r.createdAt = timestamp()
      ON MATCH SET r.role = item.role, r.updatedAt = timestamp()
      RETURN count(r) AS count
    `;
    const memberOfRes = await session.run(memberOfCypher, { batch: data.memberOf });
    console.log(`   ✅ MEMBER_OF relationships: ${memberOfRes.records[0].get('count')}`);

    // -------------------------------------------------------------------------
    // 6. Seed Relationships: (:Artist)-[:PERFORMED_ON]->(:Track)
    // -------------------------------------------------------------------------
    console.log(`🔗 Merging ${data.performedOn.length} [:PERFORMED_ON] relationships...`);
    const performedOnCypher = `
      UNWIND $batch AS item
      MATCH (a:Artist { id: item.artistId })
      MATCH (t:Track { id: item.trackId })
      MERGE (a)-[r:PERFORMED_ON]->(t)
      ON CREATE SET r.role = item.role, r.createdAt = timestamp()
      ON MATCH SET r.role = item.role, r.updatedAt = timestamp()
      RETURN count(r) AS count
    `;
    const performedOnRes = await session.run(performedOnCypher, { batch: data.performedOn });
    console.log(`   ✅ PERFORMED_ON relationships: ${performedOnRes.records[0].get('count')}`);

    // -------------------------------------------------------------------------
    // 7. Seed Relationships: (:Band|Artist)-[:RELEASED]->(:Album)
    // -------------------------------------------------------------------------
    console.log(`🔗 Merging ${data.released.length} [:RELEASED] relationships...`);
    const releasedCypher = `
      UNWIND $batch AS item
      MATCH (al:Album { id: item.albumId })
      OPTIONAL MATCH (b:Band { id: item.bandId })
      OPTIONAL MATCH (a:Artist { id: item.artistId })
      FOREACH (_ IN CASE WHEN b IS NOT NULL THEN [1] ELSE [] END |
        MERGE (b)-[r:RELEASED]->(al)
      )
      FOREACH (_ IN CASE WHEN a IS NOT NULL THEN [1] ELSE [] END |
        MERGE (a)-[r:RELEASED]->(al)
      )
      RETURN count(al) AS count
    `;
    const releasedRes = await session.run(releasedCypher, { batch: data.released });
    console.log(`   ✅ RELEASED relationships processed: ${releasedRes.records[0].get('count')}`);

    // -------------------------------------------------------------------------
    // 8. Seed Relationships: (:Album)-[:CONTAINS]->(:Track)
    // -------------------------------------------------------------------------
    console.log(`🔗 Merging ${data.contains.length} [:CONTAINS] relationships...`);
    const containsCypher = `
      UNWIND $batch AS item
      MATCH (al:Album { id: item.albumId })
      MATCH (t:Track { id: item.trackId })
      MERGE (al)-[r:CONTAINS]->(t)
      RETURN count(r) AS count
    `;
    const containsRes = await session.run(containsCypher, { batch: data.contains });
    console.log(`   ✅ CONTAINS relationships: ${containsRes.records[0].get('count')}`);

    // -------------------------------------------------------------------------
    // 9. Summary Audit Query
    // -------------------------------------------------------------------------
    console.log('\n📊 Auditing Live Graph Counts...');
    const countRes = await session.run(`
      MATCH (a:Artist) WITH count(a) AS artists
      MATCH (b:Band) WITH artists, count(b) AS bands
      MATCH (al:Album) WITH artists, bands, count(al) AS albums
      MATCH (t:Track) WITH artists, bands, albums, count(t) AS tracks
      MATCH ()-[r:MEMBER_OF]->() WITH artists, bands, albums, tracks, count(r) AS memberOf
      MATCH ()-[r:PERFORMED_ON]->() WITH artists, bands, albums, tracks, memberOf, count(r) AS performedOn
      MATCH ()-[r:RELEASED]->() WITH artists, bands, albums, tracks, memberOf, performedOn, count(r) AS released
      MATCH ()-[r:CONTAINS]->() WITH artists, bands, albums, tracks, memberOf, performedOn, released, count(r) AS contains
      RETURN artists, bands, albums, tracks, memberOf, performedOn, released, contains
    `);

    const r = countRes.records[0];
    console.log('----------------------------------------------------');
    console.log(`🎤 Total Artists:       ${r.get('artists')}`);
    console.log(`🎸 Total Bands:         ${r.get('bands')}`);
    console.log(`💿 Total Albums:        ${r.get('albums')}`);
    console.log(`🎵 Total Tracks:        ${r.get('tracks')}`);
    console.log(`👥 MEMBER_OF Edges:     ${r.get('memberOf')}`);
    console.log(`⚡ PERFORMED_ON Edges:  ${r.get('performedOn')}`);
    console.log(`🚀 RELEASED Edges:      ${r.get('released')}`);
    console.log(`🎼 CONTAINS Edges:      ${r.get('contains')}`);
    console.log('----------------------------------------------------');
    console.log(`✨ Seeding completed in ${(Date.now() - startTime) / 1000}s!`);

  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await session.close();
    await closeDriver();
  }
}

seedDatabase().catch(() => process.exit(1));
