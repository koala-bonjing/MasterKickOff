import neo4j, { Driver, Session, SessionMode } from 'neo4j-driver';

// Global declaration for Next.js hot module reloading in development
declare global {
  // eslint-disable-next-line no-var
  var __neo4jDriver: Driver | undefined;
}

interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
  database?: string;
}

/**
 * Resolves connection credentials from environment variables.
 * Supports both NEO4J_* and COGNODB_* naming conventions.
 */
export function getNeo4jConfig(): Neo4jConfig {
  const uri = process.env.NEO4J_URI || process.env.COGNODB_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || process.env.COGNODB_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || process.env.COGNODB_PASSWORD || '';
  const database = process.env.NEO4J_DATABASE || process.env.COGNODB_DATABASE || 'neo4j';

  return { uri, user, password, database };
}

/**
 * Returns the singleton Neo4j/CognoDB Driver instance.
 * In development, reuses global instance across HMR reloads.
 */
export function getDriver(): Driver {
  if (globalThis.__neo4jDriver) {
    return globalThis.__neo4jDriver;
  }

  const { uri, user, password } = getNeo4jConfig();

  if (!password && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Warning: Neo4j/CognoDB password is empty in production environment!');
  }

  const driver = neo4j.driver(
    uri,
    neo4j.auth.basic(user, password),
    {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 20000, // 20s for resilient cloud connections
      connectionTimeout: 15000,
      maxConnectionLifetime: 3600000, // 1 hour
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__neo4jDriver = driver;
  }

  return driver;
}

/**
 * Creates a managed session for a specific mode (READ or WRITE).
 * ALWAYS close sessions with `await session.close()` or use `runQuery`.
 */
export function createSession(mode: SessionMode = 'READ'): Session {
  const driver = getDriver();
  const { database } = getNeo4jConfig();
  return driver.session({
    database,
    defaultAccessMode: mode === 'WRITE' ? neo4j.session.WRITE : neo4j.session.READ,
  });
}

/**
 * Safe query execution helper.
 * Automatically acquires a session, runs the parameterized Cypher query,
 * and guarantees session closure in the finally block.
 */
export async function runQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {},
  mode: SessionMode = 'READ'
): Promise<T[]> {
  const session = createSession(mode);
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject() as T);
  } finally {
    // Guarantees the Bolt connection is released back to the pool
    await session.close();
  }
}

/**
 * Closes the driver and releases all socket pools.
 */
export async function closeDriver(): Promise<void> {
  if (globalThis.__neo4jDriver) {
    await globalThis.__neo4jDriver.close();
    globalThis.__neo4jDriver = undefined;
  }
}
