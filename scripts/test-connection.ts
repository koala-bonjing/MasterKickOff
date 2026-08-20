import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDriver, getNeo4jConfig, closeDriver } from '../src/lib/neo4j';

async function testConnection() {
  const config = getNeo4jConfig();
  console.log('----------------------------------------------------');
  console.log('🔌 CognoDB / Neo4j Bolt Connection Verification');
  console.log('----------------------------------------------------');
  console.log(`URI:      ${config.uri}`);
  console.log(`User:     ${config.user}`);
  console.log(`Database: ${config.database || 'default'}`);
  console.log(`Password: ${config.password ? '****** (configured)' : '❌ (empty)'}`);
  console.log('----------------------------------------------------');
  console.log('Sending Bolt handshake & executing: RETURN 1 AS alive, datetime() AS serverTime ...\n');

  const startTime = Date.now();
  const driver = getDriver();

  try {
    // 1. Verify driver connectivity (Bolt server handshake)
    const serverInfo = await driver.getServerInfo();
    console.log('✅ Bolt Handshake Successful!');
    console.log(`   Server Agent: ${serverInfo.agent}`);
    console.log(`   Protocol:     Bolt v${serverInfo.protocolVersion}`);
    console.log(`   Address:      ${serverInfo.address}\n`);

    // 2. Open a session and run the test query
    const session = driver.session({ database: config.database });
    try {
      const result = await session.run('RETURN 1 AS alive, datetime() AS serverTime');
      const duration = Date.now() - startTime;
      const record = result.records[0];

      if (record) {
        const alive = record.get('alive');
        const serverTime = record.get('serverTime');
        console.log('🎉 Cypher Query Succeeded:');
        console.log(`   alive:      ${alive}`);
        console.log(`   serverTime: ${serverTime}`);
        console.log(`   Round-trip: ${duration}ms\n`);
        console.log('Everything is wired up correctly! Ready for Phase 1.');
      }
    } finally {
      await session.close();
    }
  } catch (error: any) {
    console.error('❌ Connection Failed!');
    console.error(`   Error code:    ${error.code || 'UNKNOWN'}`);
    console.error(`   Error message: ${error.message}`);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Check your .env.local file in the project root.');
    console.log('   2. Ensure NEO4J_URI or COGNODB_URI uses the right scheme (e.g. bolt://, neo4j+s://).');
    console.log('   3. Verify credentials and network/firewall access to your CognoDB Cloud instance.');
    process.exitCode = 1;
  } finally {
    await closeDriver();
  }
}

testConnection();
