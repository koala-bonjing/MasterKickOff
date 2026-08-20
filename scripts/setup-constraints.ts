import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDriver, closeDriver } from '../src/lib/neo4j';

/**
 * Creates uniqueness constraints and search indexes in CognoDB/Neo4j.
 * 
 * WHY CONSTRAINTS MATTER IN GRAPH DATABASES:
 * 1. Data Integrity: Prevents duplicate nodes when running seed scripts or ingestion pipelines.
 * 2. MERGE Performance: When you execute `MERGE (a:Artist { id: $id })`, Neo4j must check if the node exists.
 *    Without a constraint/index, this requires an O(N) full node scan. With a constraint, Neo4j builds an
 *    underlying B-Tree index, turning MERGE checks into O(1) lookups.
 */
export async function setupConstraints() {
  const driver = getDriver();
  const session = driver.session();

  const constraints = [
    {
      name: 'artist_id_unique',
      cypher: 'CREATE CONSTRAINT artist_id_unique IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE',
      description: 'Unique constraint on Artist(id)',
    },
    {
      name: 'band_id_unique',
      cypher: 'CREATE CONSTRAINT band_id_unique IF NOT EXISTS FOR (b:Band) REQUIRE b.id IS UNIQUE',
      description: 'Unique constraint on Band(id)',
    },
    {
      name: 'track_id_unique',
      cypher: 'CREATE CONSTRAINT track_id_unique IF NOT EXISTS FOR (t:Track) REQUIRE t.id IS UNIQUE',
      description: 'Unique constraint on Track(id)',
    },
    {
      name: 'album_id_unique',
      cypher: 'CREATE CONSTRAINT album_id_unique IF NOT EXISTS FOR (al:Album) REQUIRE al.id IS UNIQUE',
      description: 'Unique constraint on Album(id)',
    },
  ];

  const indexes = [
    {
      name: 'artist_name_idx',
      cypher: 'CREATE INDEX artist_name_idx IF NOT EXISTS FOR (a:Artist) ON (a.name)',
      description: 'Index on Artist(name) for autocomplete/search',
    },
    {
      name: 'band_name_idx',
      cypher: 'CREATE INDEX band_name_idx IF NOT EXISTS FOR (b:Band) ON (b.name)',
      description: 'Index on Band(name) for search',
    },
    {
      name: 'track_title_idx',
      cypher: 'CREATE INDEX track_title_idx IF NOT EXISTS FOR (t:Track) ON (t.title)',
      description: 'Index on Track(title)',
    },
  ];

  console.log('🔒 Applying Schema Constraints and Indexes...');

  try {
    for (const item of constraints) {
      process.stdout.write(`   Applying ${item.description}... `);
      await session.run(item.cypher);
      console.log('✅');
    }

    for (const item of indexes) {
      process.stdout.write(`   Applying ${item.description}... `);
      await session.run(item.cypher);
      console.log('✅');
    }

    console.log('🎉 All constraints and indexes applied successfully!\n');
  } catch (error: any) {
    console.error('❌ Error setting up constraints:', error.message);
    throw error;
  } finally {
    await session.close();
    await closeDriver();
  }
}

// Allow direct execution
if (require.main === module) {
  setupConstraints().catch(() => {
    process.exit(1);
  });
}
