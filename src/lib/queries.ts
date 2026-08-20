import { runQuery } from './neo4j';

export interface ArtistSummary {
  id: string;
  name: string;
  genre: string;
  bio?: string;
  imageUrl?: string;
}

export interface PathNode {
  id: string;
  name?: string;
  title?: string;
  label: 'Artist' | 'Band' | 'Track' | 'Album';
  genre?: string;
  releaseYear?: number;
}

export interface PathHop {
  fromArtist: { id: string; name: string };
  toArtist: { id: string; name: string };
  via: {
    id: string;
    type: 'Track' | 'Band';
    titleOrName: string;
    details?: string;
  };
}

export interface ShortestPathResult {
  found: boolean;
  degreesOfSeparation: number;
  totalHops: number;
  nodes: PathNode[];
  hops: PathHop[];
  rawPathSummary?: string;
}

export interface RecommendationResult {
  id: string;
  name: string;
  genre: string;
  bio?: string;
  imageUrl?: string;
  mutualCollabs: number;
  sampleMutuals: string[];
}

export interface HubArtistResult {
  id: string;
  name: string;
  genre: string;
  bio?: string;
  collaboratorCount: number;
  trackCount: number;
  bands: string[];
}

export interface SubgraphNode {
  id: string;
  label: string;
  name: string;
  type: 'artist' | 'band' | 'track' | 'album';
  genre?: string;
  isCenter?: boolean;
}

export interface SubgraphLink {
  source: string;
  target: string;
  type: string;
  role?: string;
}

export interface ArtistNeighborhood {
  artist: ArtistSummary;
  nodes: SubgraphNode[];
  links: SubgraphLink[];
  directCollaborators: ArtistSummary[];
  bands: string[];
  tracks: string[];
}

/**
 * 1. FLAGSHIP QUERY: Shortest Collaboration Path between two artists
 * 
 * CYPHER EXPLANATION:
 * - `shortestPath((start)-[:PERFORMED_ON|MEMBER_OF*..12]-(target))` uses breadth-first search (BFS)
 *   in graph topology to find the minimum distance path across heterogeneous relationships.
 * - In relational SQL, doing this requires recursive CTEs with unbounded Cartesian self-joins
 *   across 4 tables (artists, tracks, bands, artist_track_credits), resulting in terrible O(B^D) complexity.
 *   In Cypher, graph index-free adjacency follows physical memory pointers directly in O(D) time.
 */
export async function getShortestPath(startId: string, targetId: string): Promise<ShortestPathResult> {
  if (startId === targetId) {
    const artistRes = await runQuery<{ a: any }>(
      'MATCH (a:Artist { id: $startId }) RETURN a',
      { startId }
    );
    if (artistRes.length === 0) {
      return { found: false, degreesOfSeparation: 0, totalHops: 0, nodes: [], hops: [] };
    }
    const artist = artistRes[0].a.properties;
    return {
      found: true,
      degreesOfSeparation: 0,
      totalHops: 0,
      nodes: [{ id: artist.id, name: artist.name, label: 'Artist', genre: artist.genre }],
      hops: [],
    };
  }

  const cypher = `
    MATCH (start:Artist { id: $startId })
    MATCH (target:Artist { id: $targetId })
    MATCH p = shortestPath((start)-[:PERFORMED_ON|MEMBER_OF*..12]-(target))
    RETURN p,
           [n IN nodes(p) | { 
             id: n.id, 
             name: n.name, 
             title: n.title, 
             label: labels(n)[0],
             genre: n.genre,
             releaseYear: n.releaseYear
           }] AS pathNodes,
           [r IN relationships(p) | { 
             type: type(r), 
             role: r.role,
             startId: startNode(r).id,
             endId: endNode(r).id
           }] AS pathRels,
           length(p) AS totalHops
  `;

  const records = await runQuery<{
    pathNodes: PathNode[];
    pathRels: any[];
    totalHops: any;
  }>(cypher, { startId, targetId });

  if (!records || records.length === 0) {
    return { found: false, degreesOfSeparation: -1, totalHops: 0, nodes: [], hops: [] };
  }

  const row = records[0];
  const pathNodes = row.pathNodes;
  const totalHops = typeof row.totalHops === 'object' && 'low' in row.totalHops ? row.totalHops.low : Number(row.totalHops);

  // Group alternating Artist -> Connector (Track/Band) -> Artist into clear collaborative hops
  const hops: PathHop[] = [];
  for (let i = 0; i < pathNodes.length - 2; i += 2) {
    const fromArtist = pathNodes[i];
    const viaNode = pathNodes[i + 1];
    const toArtist = pathNodes[i + 2];

    hops.push({
      fromArtist: { id: fromArtist.id, name: fromArtist.name || fromArtist.id },
      toArtist: { id: toArtist.id, name: toArtist.name || toArtist.id },
      via: {
        id: viaNode.id,
        type: viaNode.label as 'Track' | 'Band',
        titleOrName: viaNode.title || viaNode.name || viaNode.id,
        details: viaNode.releaseYear ? `(${viaNode.releaseYear})` : undefined,
      },
    });
  }

  return {
    found: true,
    degreesOfSeparation: hops.length,
    totalHops,
    nodes: pathNodes,
    hops,
  };
}

/**
 * 2. 2-HOP RECOMMENDATION QUERY: "Collaborators of Collaborators"
 * 
 * CYPHER EXPLANATION:
 * - `(me:Artist)-[:PERFORMED_ON|MEMBER_OF*2]-(collab:Artist)` matches all artists who share a track or band with `me` (1st degree).
 * - `(collab)-[:PERFORMED_ON|MEMBER_OF*2]-(rec:Artist)` traverses another 2 edge hops to discover 2nd degree network peers.
 * - `WHERE rec <> me AND NOT (me)-[:PERFORMED_ON|MEMBER_OF*2]-(rec)` excludes self and artists already directly collaborated with.
 * - Aggregates `count(DISTINCT collab)` to rank recommendations by number of mutual collaborators.
 */
export async function getRecommendations(artistId: string, limit: number = 6): Promise<RecommendationResult[]> {
  const cypher = `
    MATCH (me:Artist { id: $artistId })-[:PERFORMED_ON|MEMBER_OF]-(via1)-(directCollab:Artist)
    WHERE directCollab <> me
    WITH me, collect(DISTINCT directCollab.id) AS directIds

    MATCH (me)-[:PERFORMED_ON|MEMBER_OF]-(via1)-(collab:Artist)
    WHERE collab <> me
    MATCH (collab)-[:PERFORMED_ON|MEMBER_OF]-(via2)-(rec:Artist)
    WHERE rec <> me AND NOT rec.id IN directIds
    WITH rec, 
         count(DISTINCT collab) AS mutualCollabs, 
         collect(DISTINCT collab.name)[0..3] AS sampleMutuals
    RETURN rec.id AS id,
           rec.name AS name,
           rec.genre AS genre,
           rec.bio AS bio,
           rec.imageUrl AS imageUrl,
           mutualCollabs,
           sampleMutuals
    ORDER BY mutualCollabs DESC, rec.name ASC
    LIMIT $limit
  `;

  const records = await runQuery<any>(cypher, { artistId, limit: Math.max(1, limit) });
  return records.map((r) => ({
    id: r.id,
    name: r.name,
    genre: r.genre,
    bio: r.bio,
    imageUrl: r.imageUrl,
    mutualCollabs: typeof r.mutualCollabs === 'object' && 'low' in r.mutualCollabs ? r.mutualCollabs.low : Number(r.mutualCollabs),
    sampleMutuals: r.sampleMutuals || [],
  }));
}

/**
 * 3. MOST CONNECTED ARTISTS / INDUSTRY SUPER-HUBS (Degree Centrality Aggregation)
 * 
 * CYPHER EXPLANATION:
 * - Calculates degree centrality across the entire collaboration graph.
 * - Evaluates how many distinct peers each musician connects to across tracks and bands.
 */
export async function getMostConnectedArtists(limit: number = 10): Promise<HubArtistResult[]> {
  const cypher = `
    MATCH (a:Artist)-[:PERFORMED_ON|MEMBER_OF]-(c)-[:PERFORMED_ON|MEMBER_OF]-(other:Artist)
    WHERE a <> other
    WITH a, count(DISTINCT other) AS collaboratorCount
    OPTIONAL MATCH (a)-[:PERFORMED_ON]->(t:Track)
    WITH a, collaboratorCount, count(DISTINCT t) AS trackCount
    OPTIONAL MATCH (a)-[:MEMBER_OF]->(b:Band)
    WITH a, collaboratorCount, trackCount, collect(DISTINCT b.name) AS bands
    RETURN a.id AS id,
           a.name AS name,
           a.genre AS genre,
           a.bio AS bio,
           collaboratorCount,
           trackCount,
           bands
    ORDER BY collaboratorCount DESC, trackCount DESC
    LIMIT $limit
  `;

  const records = await runQuery<any>(cypher, { limit: Math.max(1, limit) });
  return records.map((r) => ({
    id: r.id,
    name: r.name,
    genre: r.genre,
    bio: r.bio,
    collaboratorCount: typeof r.collaboratorCount === 'object' && 'low' in r.collaboratorCount ? r.collaboratorCount.low : Number(r.collaboratorCount),
    trackCount: typeof r.trackCount === 'object' && 'low' in r.trackCount ? r.trackCount.low : Number(r.trackCount),
    bands: r.bands || [],
  }));
}

/**
 * 4. ARTIST SUBGRAPH / LOCAL NEIGHBORHOOD QUERY
 * Returns the 1st and 2nd degree network for interactive node-link visualization.
 */
export async function getArtistNeighborhood(artistId: string): Promise<ArtistNeighborhood | null> {
  const artistRes = await runQuery<any>(
    'MATCH (a:Artist { id: $artistId }) RETURN a.id AS id, a.name AS name, a.genre AS genre, a.bio AS bio, a.imageUrl AS imageUrl',
    { artistId }
  );

  if (!artistRes || artistRes.length === 0) {
    return null;
  }

  const artist = artistRes[0];

  const cypher = `
    MATCH (center:Artist { id: $artistId })
    // 1st Degree: Direct tracks & bands
    OPTIONAL MATCH (center)-[r1:PERFORMED_ON|MEMBER_OF]-(connector)
    // 2nd Degree: Direct collaborator peers on those tracks & bands
    OPTIONAL MATCH (connector)-[r2:PERFORMED_ON|MEMBER_OF]-(peer:Artist)
    WHERE peer <> center
    RETURN center,
           collect(DISTINCT {
             id: connector.id,
             name: coalesce(connector.name, connector.title),
             type: toLower(labels(connector)[0]),
             role: r1.role
           }) AS connectors,
           collect(DISTINCT {
             id: peer.id,
             name: peer.name,
             genre: peer.genre,
             type: 'artist',
             via: connector.id
           }) AS peers
  `;

  const res = await runQuery<any>(cypher, { artistId });
  const row = res[0] || { connectors: [], peers: [] };

  const nodes: SubgraphNode[] = [
    {
      id: artist.id,
      label: artist.name,
      name: artist.name,
      type: 'artist',
      genre: artist.genre,
      isCenter: true,
    },
  ];

  const links: SubgraphLink[] = [];
  const directCollaboratorsMap = new Map<string, ArtistSummary>();
  const bandsSet = new Set<string>();
  const tracksSet = new Set<string>();

  // Add connectors (tracks / bands)
  for (const c of row.connectors) {
    if (!c.id) continue;
    nodes.push({
      id: c.id,
      label: c.name,
      name: c.name,
      type: c.type,
    });
    links.push({
      source: artist.id,
      target: c.id,
      type: c.type === 'band' ? 'MEMBER_OF' : 'PERFORMED_ON',
      role: c.role,
    });

    if (c.type === 'band') bandsSet.add(c.name);
    if (c.type === 'track') tracksSet.add(c.name);
  }

  // Add peer artists
  for (const p of row.peers) {
    if (!p.id) continue;
    if (!nodes.some((n) => n.id === p.id)) {
      nodes.push({
        id: p.id,
        label: p.name,
        name: p.name,
        type: 'artist',
        genre: p.genre,
      });
    }
    if (p.via) {
      links.push({
        source: p.via,
        target: p.id,
        type: 'COLLABORATED',
      });
    }
    directCollaboratorsMap.set(p.id, {
      id: p.id,
      name: p.name,
      genre: p.genre,
    });
  }

  return {
    artist,
    nodes,
    links,
    directCollaborators: Array.from(directCollaboratorsMap.values()),
    bands: Array.from(bandsSet),
    tracks: Array.from(tracksSet),
  };
}

/**
 * 5. SEARCH / AUTOCOMPLETE ARTISTS
 */
export async function searchArtists(query: string = '', limit: number = 30): Promise<ArtistSummary[]> {
  const cypher = `
    MATCH (a:Artist)
    WHERE $query = '' 
       OR toLower(a.name) CONTAINS toLower($query) 
       OR toLower(a.genre) CONTAINS toLower($query)
    RETURN a.id AS id, a.name AS name, a.genre AS genre, a.bio AS bio, a.imageUrl AS imageUrl
    ORDER BY a.name ASC
    LIMIT $limit
  `;

  return runQuery<ArtistSummary>(cypher, { query: query.trim(), limit: Math.max(1, limit) });
}
