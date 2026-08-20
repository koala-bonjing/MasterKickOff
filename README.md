# SoundGraph: Six Degrees of Music Collaboration

> **An interactive graph network exploration platform that discovers the shortest collaboration chains between musicians, computes 2-hop recommendation networks, and identifies music industry super-hubs.** Built with **Next.js 14 (App Router)**, **TypeScript**, **Mantine UI v7**, **Tailwind CSS**, **TanStack Query**, and **neo4j-driver** running against **CognoDB Cloud** (openCypher / Bolt protocol).

![SoundGraph Banner](https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80)

---

## 🌟 Table of Contents
1. [Why a Graph Database? (Graph vs. Relational SQL)](#why-a-graph-database-graph-vs-relational-sql)
2. [Graph Data Model & Schema](#graph-data-model--schema)
3. [The Three Core Cypher Queries Explained](#the-three-core-cypher-queries-explained)
4. [Tech Stack & Architecture](#tech-stack--architecture)
5. [Setup & Local Reproduction Guide](#setup--local-reproduction-guide)
6. [Creating a CognoDB Cloud Instance](#creating-a-cognoDB-cloud-instance)
7. [Hard Requirements Compliance Checklist](#hard-requirements-compliance-checklist)
8. [Screen Recording & Demo Checklist](#screen-recording--demo-checklist)

---

## 💡 Why a Graph Database? (Graph vs. Relational SQL)

In relational databases (RDBMS), data is stored in static tables. Relationships are not first-class citizens — they are represented indirectly as foreign keys. To discover how two entities relate, the database engine must perform expensive index lookups and Cartesian product joins across multiple tables.

### The Relational Pain Point: Variable-Length Pathfinding

Consider finding the shortest collaboration chain between **Dave Grohl** and **Eminem** in a relational database with 4 normalized tables (`artists`, `bands`, `tracks`, `artist_credits`):

```sql
-- Relational SQL (Recursive Common Table Expression)
WITH RECURSIVE CollabPath AS (
  -- Base case: Starting artist's 1-hop tracks/bands
  SELECT 
    c1.artist_id AS current_artist, 
    c2.artist_id AS next_artist, 
    c1.track_id, 
    1 AS depth, 
    ARRAY[c1.artist_id, c2.artist_id] AS visited_path
  FROM artist_credits c1
  JOIN artist_credits c2 ON c1.track_id = c2.track_id AND c1.artist_id <> c2.artist_id
  WHERE c1.artist_id = 'dave-grohl'

  UNION ALL

  -- Recursive step: Exponential Cartesian self-join
  SELECT 
    cp.next_artist AS current_artist, 
    c4.artist_id AS next_artist, 
    c3.track_id, 
    cp.depth + 1, 
    cp.visited_path || c4.artist_id
  FROM CollabPath cp
  JOIN artist_credits c3 ON cp.next_artist = c3.artist_id
  JOIN artist_credits c4 ON c3.track_id = c4.track_id AND c3.artist_id <> c4.artist_id
  WHERE NOT c4.artist_id = ANY(cp.visited_path) AND cp.depth < 6
)
SELECT * FROM CollabPath WHERE next_artist = 'eminem' LIMIT 1;
```

**Why this fails at scale:**
1. **Exponential Complexity $O(B^D)$:** Every recursive depth step multiplies table joins by the average branching factor ($B$). At 4 hops with an average degree of 15, the join space evaluates over $15^4 = 50,625$ joined row permutations.
2. **High Memory Overhead & Join Degeneration:** Relational engines allocate massive temp tables to store intermediate join sets.
3. **Fragile Schema Changes:** Adding an intermediary entity (e.g., `Band` membership or `Producer` credit) requires rewriting the recursive query to join against an entirely separate set of tables (`band_members`, `producers`).

### The Graph Database Advantage (Index-Free Adjacency)

In **CognoDB / Neo4j**, relationships are stored as direct physical memory pointers connecting nodes. Traversing an edge does not require a table scan or index lookup — the pointer is dereferenced directly in $O(1)$ constant time.

```cypher
// openCypher Variable-Length Path Search
MATCH (start:Artist { id: $startId }), (target:Artist { id: $targetId })
MATCH p = shortestPath((start)-[:PERFORMED_ON|MEMBER_OF*..12]-(target))
RETURN p, length(p) AS totalHops
```

| Feature | Relational SQL (Postgres / MySQL) | Graph Database (CognoDB / openCypher) |
| :--- | :--- | :--- |
| **Path Traversal Model** | Recursive CTEs + Multiple Table Joins | Native Breadth-First Search (BFS) over memory pointers |
| **Multi-Hop Performance** | Degrades exponentially ($O(B^D)$) | Linear with path length ($O(D)$) |
| **Heterogeneous Links** | Requires explicit `UNION` across join tables | Seamless single pattern `[:PERFORMED_ON\|MEMBER_OF]` |
| **Data Provenance** | Lost unless complex tracking arrays are built | Full `Path` object with nodes and relationships returned |

---

## 📐 Graph Data Model & Schema

The graph model represents real-world music provenance. Musicians connect through the actual creative artifacts they shared:

```mermaid
graph LR
    Artist["(:Artist)<br/>• id (Unique)<br/>• name<br/>• genre<br/>• bio"]
    Band["(:Band)<br/>• id (Unique)<br/>• name<br/>• formedYear"]
    Track["(:Track)<br/>• id (Unique)<br/>• title<br/>• durationMs<br/>• releaseYear"]
    Album["(:Album)<br/>• id (Unique)<br/>• title<br/>• releaseYear"]

    Artist -->|:MEMBER_OF { role }| Band
    Artist -->|:PERFORMED_ON { role }| Track
    Band -->|:RELEASED| Album
    Artist -->|:RELEASED| Album
    Album -->|:CONTAINS| Track
```

### Schema Nodes
- **`Artist`**: Unique `id` (e.g., `"dave-grohl"`), `name`, `genre`, `bio`, `imageUrl`.
- **`Band`**: Unique `id` (e.g., `"nirvana"`), `name`, `formedYear`.
- **`Track`**: Unique `id` (e.g., `"cut-me-some-slack"`), `title`, `durationMs`, `releaseYear`.
- **`Album`**: Unique `id` (e.g., `"nevermind"`), `title`, `releaseYear`.

### Schema Relationships
- `(:Artist)-[:MEMBER_OF { role }]->(:Band)`: Captures band memberships (e.g., *Dave Grohl $\to$ Nirvana*).
- `(:Artist)-[:PERFORMED_ON { role }]->(:Track)`: Captures shared credits (e.g., *Dave Grohl & Paul McCartney $\to$ "Cut Me Some Slack"*).
- `(:Band|:Artist)-[:RELEASED]->(:Album)`: Associates albums with creators.
- `(:Album)-[:CONTAINS]->(:Track)`: Connects tracks to their containing albums.

---

## 🔍 The Three Core Cypher Queries Explained

All queries in the repository are strictly parameterized (never string-concatenated).

### 1. Flagship Query: Shortest Collaboration Path (Variable-Length BFS)
Finds the shortest chain of collaborations connecting two named musicians across songs and bands.

```cypher
MATCH (start:Artist { id: $startId }), (target:Artist { id: $targetId })
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
       length(p) AS totalHops
```
- **What it matches:** An alternating sequence of `Artist -> Track/Band -> Artist -> Track/Band -> Artist`.
- **Why it matters:** In sub-milliseconds, it discovers cross-genre connections that would require deep domain knowledge or hundreds of table lookups (e.g., *Miles Davis $\to$ Prince $\to$ Beyoncé $\to$ Lady Gaga $\to$ Bruno Mars* in 4 degrees).

---

### 2. 2-Hop Recommendation Query: "Collaborators of Collaborators"
Discovers musicians who share mutual connections with you, but whom you haven't collaborated with directly.

```cypher
// 1. Gather all direct collaborator IDs into a fast exclusion list
MATCH (me:Artist { id: $artistId })-[:PERFORMED_ON|MEMBER_OF]-(via1)-(directCollab:Artist)
WHERE directCollab <> me
WITH me, collect(DISTINCT directCollab.id) AS directIds

// 2. Discover 2nd degree network peers and exclude existing direct collaborators
MATCH (me)-[:PERFORMED_ON|MEMBER_OF]-(via1)-(collab:Artist)
WHERE collab <> me
MATCH (collab)-[:PERFORMED_ON|MEMBER_OF]-(via2)-(rec:Artist)
WHERE rec <> me AND NOT rec.id IN directIds

// 3. Aggregate and rank by number of mutual collaborators
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
```
- **What it matches:** 2nd-degree network neighbors who share the highest number of mutual bandmates/collaborators.

---

### 3. Most Connected Musicians (Degree Centrality Super-Hubs)
Ranks musicians by how many distinct peers they bridge across tracks and bands.

```cypher
MATCH (a:Artist)-[:PERFORMED_ON|MEMBER_OF*2]-(other:Artist)
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
```
- **What it matches:** Super-connectors who act as topological hubs bridging different music genres (e.g. *Jay-Z, Paul McCartney, Kendrick Lamar, Dave Grohl*).

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** Next.js 14 (App Router) + TypeScript + Mantine UI v7 + Tailwind CSS
- **State Management & Caching:** `@tanstack/react-query`
- **Visualization:** Interactive Force-Directed Canvas Graph Visualizer (zero external graph library bloat)
- **Database Access:** `neo4j-driver` (Official Driver) over **Bolt Protocol** (`bolt+s://`) against **CognoDB Cloud**
- **Idempotent Ingestion:** Batched parameterized Cypher `UNWIND ... MERGE`

---

## 🚀 Setup & Local Reproduction Guide

### Prerequisites
- Node.js 18+ or 20+
- pnpm (recommended) or npm

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd MasterKickoff
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:

```bash
# CognoDB Cloud Bolt Connection Settings
NEO4J_URI=bolt+s://<your-instance-id>.databases.cognodb.com
NEO4J_USERNAME=cognodb
NEO4J_PASSWORD=<your-secure-password>
NEO4J_DATABASE=neo4j
```

### 4. Verify Database Connection
Run the connection check to verify the Bolt handshake:
```bash
pnpm test:conn
```

### 5. Apply Schema Constraints & Seed the Graph
Run the idempotent seed script (uses `MERGE` to prevent duplicate nodes):
```bash
pnpm db:seed
```

### 6. Run Automated Query Verification
Verify all 5 Cypher queries against the live database:
```bash
pnpm tsx scripts/test-queries.ts
```

### 7. Start the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Creating a CognoDB Cloud Instance

1. Navigate to [CognoDB Cloud Console](https://console.cognodb.com) or [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/).
2. Click **Create Instance** and select the free / standard tier.
3. Save your generated credentials securely (`Connection URI`, `Username`, `Password`).
4. Copy the connection URI (e.g. `bolt+s://db-xxxx.bravo.databases.cognodb.com`) and password into `.env.local`.
5. Run `pnpm test:conn` to confirm the secure TLS socket is active.

---

## ✅ Hard Requirements Compliance Checklist

| Requirement | Implementation Evidence | Status |
| :--- | :--- | :---: |
| **All Cypher queries parameterized** | Zero string concatenations; all inputs use `$startId`, `$targetId`, `$artistId`, `$query`, `$limit` in `src/lib/queries.ts` | ✅ PASS |
| **2+ hop traversal query** | `getShortestPath` (variable 1..12 hops) & `getRecommendations` (2-hop collaborative filtering) | ✅ PASS |
| **Relational comparison / Shortest-Path query** | Documented in README with side-by-side SQL recursive CTE comparison | ✅ PASS |
| **Secrets only in environment variables** | Loaded from `process.env` in `src/lib/neo4j.ts`; `*-credentials.txt`, `.env*` gitignored | ✅ PASS |
| **Graceful handling when CognoDB is unreachable** | Custom error interceptor in `src/lib/api-response.ts` returning 503; UI `StatusBadge` and retry banners | ✅ PASS |
| **Real / realistic seed data loaded via script** | 78 artists, 23 bands, 45 albums, 79 tracks loaded idempotently via `scripts/seed.ts` + `scripts/fetch-musicbrainz.ts` | ✅ PASS |
| **Clean loading / empty / error states in UI** | Mantine Skeletons, empty search fallbacks, and error banners across all views | ✅ PASS |
| **Complete README documentation** | Why Graph section, schema diagram, setup guide, query walkthrough, and checklist | ✅ PASS |

---

## 🎥 Screen Recording & Demo Checklist

When recording your take-home demo video for Wexa AI:
1. **Connection & Architecture (0:00 - 0:45):**
   - Show the live `StatusBadge` in the navbar displaying live Bolt protocol latency.
   - Explain how `neo4j-driver` communicates over binary PackStream sockets.
2. **Shortest Collaboration Path (0:45 - 2:00):**
   - Demonstrate a multi-hop path (e.g., *Dave Grohl ➔ Eminem* or *Miles Davis ➔ Bruno Mars*).
   - Walk through the intermediate cards showing the exact track and band bridges.
   - Highlight the "Why a Graph DB?" explanation box.
3. **Industry Super-Hubs Leaderboard (2:00 - 3:00):**
   - Switch to the "Industry Hubs" tab.
   - Show the degree-centrality ranking and explain why Jay-Z, Paul McCartney, and Kendrick Lamar are network hubs.
4. **2-Hop Recommendations (3:00 - 4:00):**
   - Switch to "2-Hop Recs" and select an artist (e.g., *Kendrick Lamar*).
   - Point out the mutual connections bridging the recommended musicians.
5. **Interactive Subgraph Visualizer (4:00 - 5:00):**
   - Switch to "Visual Graph" and interact with the force-directed canvas.
   - Drag nodes to show graph physics, and click collaborating artists to re-center the neighborhood view.
