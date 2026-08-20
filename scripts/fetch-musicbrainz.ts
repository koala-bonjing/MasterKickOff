import * as fs from 'fs';
import * as path from 'path';

/**
 * MusicBrainz Public API Ingestion Tool
 * 
 * MUSICBRAINZ API POLICIES:
 * - Rate limit: Strictly 1 request / second per IP.
 * - Header requirement: Must provide a unique User-Agent identifying the client application.
 * - Endpoints used:
 *   - Search: https://musicbrainz.org/ws/2/artist?query=...&fmt=json
 *   - Artist details & relationships: https://musicbrainz.org/ws/2/artist/{mbid}?inc=artist-rels+release-groups+releases&fmt=json
 */

const USER_AGENT = 'SoundGraphApp/1.0.0 ( contact@example.com )';
const DELAY_MS = 1100; // 1.1s safety throttle

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FetchOptions {
  curatedArtistNames?: string[];
  limit?: number;
}

export async function fetchFromMusicBrainz(options: FetchOptions = {}) {
  const artistsToFetch = options.curatedArtistNames || [
    'Dave Grohl',
    'Kurt Cobain',
    'Paul McCartney',
    'David Bowie',
    'Daft Punk',
    'Pharrell Williams',
    'Kendrick Lamar',
    'Dr. Dre',
    'Eminem',
    'Beyoncé',
    'Jay-Z',
    'Lady Gaga',
    'Miles Davis',
    'Herbie Hancock',
    'Jack White',
    'Damon Albarn',
  ];

  console.log(`🌐 Fetching metadata from MusicBrainz API for ${artistsToFetch.length} artists...`);
  console.log(`⏱️ Applying 1.1s rate-limiting throttle between requests...\n`);

  const results: any[] = [];

  for (const name of artistsToFetch) {
    try {
      console.log(`🔍 Searching MusicBrainz for: "${name}"...`);
      const searchUrl = `https://musicbrainz.org/ws/2/artist?query=artist:${encodeURIComponent(name)}&fmt=json&limit=1`;
      
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!searchRes.ok) {
        console.warn(`   ⚠️ Search failed with status ${searchRes.status}`);
        await sleep(DELAY_MS);
        continue;
      }

      const searchJson = await searchRes.json();
      const artist = searchJson.artists?.[0];

      if (!artist) {
        console.warn(`   ⚠️ No artist found for "${name}"`);
        await sleep(DELAY_MS);
        continue;
      }

      console.log(`   ✅ Found: ${artist.name} (MBID: ${artist.id}, Country: ${artist.country || 'N/A'}, Disambiguation: ${artist.disambiguation || 'None'})`);
      
      await sleep(DELAY_MS);

      // Fetch relationships (band memberships, collaborations)
      const relsUrl = `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=artist-rels+url-rels&fmt=json`;
      const relsRes = await fetch(relsUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (relsRes.ok) {
        const relsJson = await relsRes.json();
        results.push({
          mbid: artist.id,
          name: artist.name,
          sortName: artist['sort-name'],
          country: artist.country,
          type: artist.type,
          disambiguation: artist.disambiguation,
          relations: relsJson.relations?.map((r: any) => ({
            type: r.type,
            direction: r.direction,
            targetArtist: r.artist?.name,
            targetMbid: r.artist?.id,
          })),
        });
      }

      await sleep(DELAY_MS);
    } catch (err: any) {
      console.error(`   ❌ Failed to fetch ${name}:`, err.message);
    }
  }

  const outPath = path.resolve(process.cwd(), 'src/data/musicbrainz-fetched.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n🎉 Saved ${results.length} enriched artist records to ${outPath}`);
}

if (require.main === module) {
  fetchFromMusicBrainz();
}
