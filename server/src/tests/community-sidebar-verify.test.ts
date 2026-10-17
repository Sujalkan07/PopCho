import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { app } from '../index.js';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${name}${details ? ` (${details})` : ''}`);
}

async function runVerificationSuite() {
  console.log('================================================================');
  console.log('🎬 POPCHO — COMMUNITY SIDEBAR DYNAMIC SHOW DESCRIPTION TEST SUITE');
  console.log('================================================================\n');

  // --- 1. STATIC SOURCE CODE AUDIT ---
  console.log('--- Step 1: Component Code Audit ---');
  const workspacePath = path.resolve(process.cwd(), '../src/components/chat/CommunityChatWorkspace.tsx');
  const showDescPath = path.resolve(process.cwd(), '../src/components/chat/ShowDescriptionCard.tsx');

  const workspaceCode = fs.readFileSync(workspacePath, 'utf-8');
  const showDescCode = fs.readFileSync(showDescPath, 'utf-8');

  // Verify Theory of the Week removal
  const hasTheoryOfTheWeek = workspaceCode.includes('Theory of the Week');
  recordTest(
    'Theory of the Week widget removed from CommunityChatWorkspace',
    !hasTheoryOfTheWeek,
    hasTheoryOfTheWeek ? 'Found string in workspace' : 'Clean'
  );

  const hasWillByers = workspaceCode.includes('Will Byers Created');
  recordTest(
    'Hardcoded Will Byers theory content removed',
    !hasWillByers,
    hasWillByers ? 'Found hardcoded theory content' : 'Clean'
  );

  // Verify Watch Party widget removal
  const hasWatchPartyWidget = workspaceCode.includes('Upcoming Fan Watch Party');
  recordTest(
    'Upcoming Fan Watch Party widget removed from CommunityChatWorkspace',
    !hasWatchPartyWidget,
    hasWatchPartyWidget ? 'Found string in workspace' : 'Clean'
  );

  const hasHawkinsSync = workspaceCode.includes('Hawkins S1–S4 Global Sync');
  recordTest(
    'Hardcoded watch party event title removed',
    !hasHawkinsSync,
    hasHawkinsSync ? 'Found hardcoded watch party content' : 'Clean'
  );

  const hasCountdownTimer = workspaceCode.includes('countdown.days');
  recordTest(
    'Static countdown timer state & interval removed',
    !hasCountdownTimer,
    hasCountdownTimer ? 'Found countdown reference' : 'Clean'
  );

  const hasRsvpButton = workspaceCode.includes('RSVP (3,842 Attending)');
  recordTest(
    'Hardcoded RSVP widget button removed',
    !hasRsvpButton,
    hasRsvpButton ? 'Found RSVP button' : 'Clean'
  );

  // Verify ShowDescriptionCard integration
  const hasShowDescriptionCardImport = workspaceCode.includes("import { ShowDescriptionCard } from './ShowDescriptionCard'");
  const hasShowDescriptionCardUsage = workspaceCode.includes('<ShowDescriptionCard');
  recordTest(
    'ShowDescriptionCard integrated into CommunityChatWorkspace',
    hasShowDescriptionCardImport && hasShowDescriptionCardUsage,
    'Imported and rendered in right sidebar'
  );

  // Verify Online Members List retained
  const hasOnlineMembers = workspaceCode.includes('Online Members');
  recordTest(
    'Online Members List retained in right sidebar',
    hasOnlineMembers,
    'Existing sidebar member list preserved'
  );

  // Verify ShowDescriptionCard structure and states
  console.log('\n--- Step 2: ShowDescriptionCard Specification Audit ---');
  recordTest(
    'Section Heading is "About This Show"',
    showDescCode.includes('About This Show'),
    'Matches requirement 4A'
  );

  recordTest(
    'Missing overview state renders exact required text',
    showDescCode.includes('Description is not available for this title yet.'),
    'Matches requirement 6: "Description is not available for this title yet."'
  );

  recordTest(
    'Loading skeleton state implemented',
    showDescCode.includes('show-description-loading') && showDescCode.includes('animate-pulse'),
    'Pulsing skeleton placeholder present'
  );

  recordTest(
    'API failure state with retry option implemented',
    showDescCode.includes('show-description-error') && showDescCode.includes('Retry'),
    'Compact error box with retry button present'
  );

  recordTest(
    'Expand / Collapse toggle for long descriptions implemented',
    showDescCode.includes('Read More') && showDescCode.includes('Show Less') && showDescCode.includes('line-clamp-4'),
    'Read More / Show Less clamp toggle present'
  );

  recordTest(
    'Restrained metadata row (year, media type, genres) implemented',
    showDescCode.includes('releaseYear') && showDescCode.includes('mediaTypeLabel') && showDescCode.includes('validGenres'),
    'Validates and renders year, media type, and genre tags'
  );

  recordTest(
    'In-memory caching implemented to prevent duplicate metadata requests',
    showDescCode.includes('showMetadataCache') && showDescCode.includes('new Map'),
    'Metadata cache avoids repeated API requests'
  );

  // --- 3. LIVE API VERIFICATION ---
  console.log('\n--- Step 3: Live Backend TMDB Details & Metadata Resolution ---');
  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => {
    testServer.listen(0, '127.0.0.1', () => resolve());
  });

  const address = testServer.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[Test Server] Running at ${baseUrl}\n`);

  try {
    // 3a. TV Show Details: Stranger Things (TMDB ID 66732)
    const stRes = await fetch(`${baseUrl}/api/tmdb/details/66732?mediaType=tv`);
    if (stRes.ok) {
      const stData = (await stRes.json()) as { title?: string; overview?: string; genres?: string[]; firstAirDate?: string };
      const valid = Boolean(stData.title?.includes('Stranger Things') && stData.overview && stData.overview.length > 20);
      recordTest(
        'Stranger Things TMDB metadata resolved dynamically',
        valid,
        `Title: "${stData.title}", Overview: "${stData.overview?.slice(0, 50)}...", Genres: [${stData.genres?.join(', ')}]`
      );
    } else {
      recordTest('Stranger Things TMDB metadata resolved', false, `Status ${stRes.status}`);
    }

    // 3b. TV Show Details: Breaking Bad (TMDB ID 1396)
    const bbRes = await fetch(`${baseUrl}/api/tmdb/details/1396?mediaType=tv`);
    if (bbRes.ok) {
      const bbData = (await bbRes.json()) as { title?: string; overview?: string; genres?: string[]; firstAirDate?: string };
      const valid = Boolean(bbData.title?.includes('Breaking Bad') && bbData.overview && bbData.overview.includes('chemistry'));
      recordTest(
        'Breaking Bad TMDB metadata resolved dynamically',
        valid,
        `Title: "${bbData.title}", Overview: "${bbData.overview?.slice(0, 50)}...", Genres: [${bbData.genres?.join(', ')}]`
      );
    } else {
      recordTest('Breaking Bad TMDB metadata resolved', false, `Status ${bbRes.status}`);
    }

    // 3c. Movie Details: Inception (TMDB ID 27205)
    const incRes = await fetch(`${baseUrl}/api/tmdb/details/27205?mediaType=movie`);
    if (incRes.ok) {
      const incData = (await incRes.json()) as { title?: string; overview?: string; genres?: string[]; releaseDate?: string };
      const valid = Boolean(incData.title?.includes('Inception') && incData.overview && incData.overview.length > 20);
      recordTest(
        'Inception movie TMDB metadata resolved dynamically',
        valid,
        `Title: "${incData.title}", Overview: "${incData.overview?.slice(0, 50)}...", Year: ${incData.releaseDate?.slice(0, 4)}`
      );
    } else {
      recordTest('Inception movie TMDB metadata resolved', false, `Status ${incRes.status}`);
    }

    // 3d. Community Lookup endpoint integrates show metadata
    const commLookupRes = await fetch(
      `${baseUrl}/api/communities/lookup?tmdbId=66732&mediaType=tv&title=Stranger%20Things`
    );
    if (commLookupRes.ok) {
      const lookupData = (await commLookupRes.json()) as { community: { title: string; description: string; tmdbId: number } };
      const valid = Boolean(lookupData.community && lookupData.community.title.includes('Stranger Things'));
      recordTest(
        'Community lookup preserves show title and description',
        valid,
        `Resolved Community: "${lookupData.community.title}", TMDB ID: ${lookupData.community.tmdbId}`
      );
    } else {
      recordTest('Community lookup preserves show title and description', false, `Status ${commLookupRes.status}`);
    }

    // 3e. Error handling on invalid show details
    const invalidRes = await fetch(`${baseUrl}/api/tmdb/details/invalid_id_99999999?mediaType=tv`);
    recordTest(
      'Invalid show identifier returns HTTP error (safe fallback)',
      !invalidRes.ok,
      `Status: ${invalidRes.status} (expected non-200)`
    );

  } finally {
    testServer.close();
  }

  // --- SUMMARY ---
  console.log('\n================================================================');
  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Results: ${passedCount} / ${results.length} checks passed`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runVerificationSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
