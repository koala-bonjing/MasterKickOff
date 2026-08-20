import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { runQuery, closeDriver } from '../src/lib/neo4j';

async function diagnose() {
  const artists = ['kendrick-lamar', 'dave-grohl', 'daft-punk', 'jay-z', 'dr-dre'];

  for (const id of artists) {
    console.log(`\n🔍 Checking recommendations for ${id}:`);
    const cypher = `
      MATCH (me:Artist { id: $id })-[:PERFORMED_ON|MEMBER_OF]-(via1)-(collab:Artist)
      WHERE collab <> me
      MATCH (collab)-[:PERFORMED_ON|MEMBER_OF]-(via2)-(rec:Artist)
      WHERE rec <> me
      RETURN rec.name AS recName, count(DISTINCT collab) AS mutualCount, collect(DISTINCT collab.name) AS mutuals
      ORDER BY mutualCount DESC
      LIMIT 5
    `;
    const res = await runQuery<any>(cypher, { id });
    console.log(`   Raw 2-hop connections (including existing direct):`, res);

    const direct = await runQuery<any>(`
      MATCH (me:Artist { id: $id })-[:PERFORMED_ON|MEMBER_OF]-(via)-(collab:Artist)
      WHERE collab <> me
      RETURN collect(DISTINCT collab.id) AS directIds
    `, { id });
    console.log(`   Direct collaborator IDs:`, direct[0]?.directIds);
  }

  await closeDriver();
}

diagnose();
