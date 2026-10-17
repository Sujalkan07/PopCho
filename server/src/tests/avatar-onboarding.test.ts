process.env.NODE_ENV = 'test';
process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

import http from 'node:http';
import type { AddressInfo } from 'node:net';

const { app } = await import('../index.js');
const { initSocketServer } = await import('../socket.js');
const { default: prisma } = await import('../db/prisma.js');

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

async function runAvatarOnboardingTestSuite() {
  console.log('====================================================');
  console.log('🎭 PopCho Avatar Onboarding & Identity Test Suite');
  console.log('====================================================\n');

  const testServer = http.createServer(app);
  initSocketServer(testServer, ['http://localhost:5173']);

  await new Promise<void>((resolve) => {
    testServer.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (testServer.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Running at ${baseUrl}\n`);

  const userAId = `user_avatar_a_${Date.now()}`;
  const userBId = `user_avatar_b_${Date.now()}`;

  const headersUserA = {
    'x-user-id': userAId,
    'x-user-name': 'Avatar Tester A',
    'x-user-email': 'testerA@popcho.tv',
    'x-user-role': 'Community Member',
    'Content-Type': 'application/json',
  };

  const headersUserB = {
    'x-user-id': userBId,
    'x-user-name': 'Avatar Tester B',
    'x-user-email': 'testerB@popcho.tv',
    'x-user-role': 'Community Member',
    'Content-Type': 'application/json',
  };

  try {
    // -------------------------------------------------------------------------
    // Test Suite 1: Canon Avatar Catalog & Filters
    // -------------------------------------------------------------------------
    console.log('--- Suite 1: Canon Avatar Catalog & Category Filters ---');

    const catRes = await fetch(`${baseUrl}/api/avatars/catalog`);
    const catData = await catRes.json();
    const hasCatalog = catRes.ok && Array.isArray(catData.items) && catData.items.length >= 18;
    recordTest(
      'GET /api/avatars/catalog returns full canon roster',
      hasCatalog,
      `Total items: ${catData.total || 0}`
    );

    // Verify category counts breakdown
    const hasCounts = Boolean(catData.counts && catData.counts.all && catData.counts.tv && catData.counts.movies && catData.counts.anime);
    recordTest(
      'Catalog provides exact category breakdown counts',
      hasCounts,
      `All: ${catData.counts?.all}, TV: ${catData.counts?.tv}, Movies: ${catData.counts?.movies}, Anime: ${catData.counts?.anime}`
    );

    // Test TV filter
    const tvRes = await fetch(`${baseUrl}/api/avatars/catalog?category=tv`);
    const tvData = await tvRes.json();
    const allTv = tvRes.ok && tvData.items.every((i: { category: string }) => i.category === 'tv');
    recordTest(
      'Category filter ?category=tv strictly isolates TV characters',
      allTv && tvData.items.length > 0,
      `Returned ${tvData.items?.length} TV characters`
    );

    // Test Anime filter
    const animeRes = await fetch(`${baseUrl}/api/avatars/catalog?category=anime`);
    const animeData = await animeRes.json();
    const allAnime = animeRes.ok && animeData.items.every((i: { category: string }) => i.category === 'anime');
    recordTest(
      'Category filter ?category=anime strictly isolates Anime characters',
      allAnime && animeData.items.length > 0,
      `Returned ${animeData.items?.length} Anime characters`
    );

    // Test Archetype filter
    const archRes = await fetch(`${baseUrl}/api/avatars/catalog?archetype=anti-hero`);
    const archData = await archRes.json();
    const allAntiHero = archRes.ok && archData.items.every((i: { archetype: string }) => i.archetype === 'anti-hero');
    recordTest(
      'Archetype filter ?archetype=anti-hero correctly filters archetypes',
      allAntiHero && archData.items.length > 0,
      `Returned ${archData.items?.length} anti-heroes`
    );

    // Test Search query filter
    const searchRes = await fetch(`${baseUrl}/api/avatars/catalog?q=Eleven`);
    const searchData = await searchRes.json();
    const foundEleven = searchRes.ok && searchData.items.some((i: { id: string }) => i.id === 'eleven');
    recordTest(
      'Search filter ?q=Eleven locates target character',
      foundEleven,
      `Matched: ${searchData.items?.[0]?.name}`
    );

    // Test Random character selection
    const randomRes = await fetch(`${baseUrl}/api/avatars/random?category=movies`);
    const randomData = await randomRes.json();
    const hasRandomMovie = randomRes.ok && randomData.item && randomData.item.category === 'movies';
    recordTest(
      'GET /api/avatars/random selects a valid random character portrait',
      hasRandomMovie,
      `Selected: "${randomData.item?.name}"`
    );

    // -------------------------------------------------------------------------
    // Test Suite 2: Authentication Guard on Avatar Updates
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 2: Avatar Update Authentication Guards ---');

    const unauthSaveRes = await fetch(`${baseUrl}/api/auth/avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatarUrl: 'https://images.example.com/eleven.jpg',
      }),
    });
    recordTest(
      'Unauthenticated POST /api/auth/avatar returns 401 Unauthorized',
      unauthSaveRes.status === 401,
      `Status: ${unauthSaveRes.status}`
    );

    const emptyUrlRes = await fetch(`${baseUrl}/api/auth/avatar`, {
      method: 'POST',
      headers: headersUserA,
      body: JSON.stringify({ avatarUrl: '' }),
    });
    recordTest(
      'POST /api/auth/avatar rejects empty or invalid avatar URL with 400',
      emptyUrlRes.status === 400,
      `Status: ${emptyUrlRes.status}`
    );

    // -------------------------------------------------------------------------
    // Test Suite 3: Avatar Persistence & Sync
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 3: Avatar Persistence in Database ---');

    const elevenAvatar = catData.items.find((i: { id: string }) => i.id === 'eleven') || catData.items[0];
    const saveResA = await fetch(`${baseUrl}/api/auth/avatar`, {
      method: 'POST',
      headers: headersUserA,
      body: JSON.stringify({
        avatarUrl: elevenAvatar.imageUrl,
        avatarSource: elevenAvatar.category,
        avatarMediaId: elevenAvatar.id,
        avatarCharacter: elevenAvatar.name,
        avatarTitle: elevenAvatar.title,
      }),
    });
    const saveAData = await saveResA.json();
    const savedCorrectlyA = saveResA.ok && saveAData.profile?.avatarUrl === elevenAvatar.imageUrl;
    recordTest(
      'User A saves chosen avatar and receives updated profile',
      savedCorrectlyA,
      `Saved avatarUrl: ${saveAData.profile?.avatarUrl?.slice(0, 40)}...`
    );

    // Verify GET /api/auth/me returns the saved avatar
    const meResA = await fetch(`${baseUrl}/api/auth/me`, {
      headers: headersUserA,
    });
    const meDataA = await meResA.json();
    const meHasAvatarA = meResA.ok && meDataA.profile?.avatarUrl === elevenAvatar.imageUrl;
    recordTest(
      'GET /api/auth/me returns persisted avatar for User A',
      meHasAvatarA,
      `Profile avatarUrl matches saved choice`
    );

    // -------------------------------------------------------------------------
    // Test Suite 4: Multi-User Identity Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 4: Multi-User Profile & Avatar Isolation ---');

    const walterAvatar = catData.items.find((i: { id: string }) => i.id === 'walter-white') || catData.items[1];
    const saveResB = await fetch(`${baseUrl}/api/auth/avatar`, {
      method: 'POST',
      headers: headersUserB,
      body: JSON.stringify({
        avatarUrl: walterAvatar.imageUrl,
        avatarSource: walterAvatar.category,
        avatarMediaId: walterAvatar.id,
        avatarCharacter: walterAvatar.name,
        avatarTitle: walterAvatar.title,
      }),
    });
    const saveBData = await saveResB.json();
    const savedCorrectlyB = saveResB.ok && saveBData.profile?.avatarUrl === walterAvatar.imageUrl;
    recordTest(
      'User B saves a distinct avatar (Walter White)',
      savedCorrectlyB,
      `User B avatarUrl matches Walter White`
    );

    // Verify User A avatar is still intact and not affected by User B
    const verifyUserARes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: headersUserA,
    });
    const verifyUserAData = await verifyUserARes.json();
    const userAIntact = verifyUserAData.profile?.avatarUrl === elevenAvatar.imageUrl;
    recordTest(
      'User A avatar is strictly isolated and unchanged by User B operations',
      userAIntact,
      `User A avatar still Eleven (${userAIntact ? 'intact' : 'corrupted'})`
    );

    // -------------------------------------------------------------------------
    // Test Suite 5: Subsequent Request Default Overwrite Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 5: Verification that Default Avatar Does Not Overwrite Saved ---');

    // Make regular request to watchlist or me
    const subsequentReq = await fetch(`${baseUrl}/api/auth/me`, {
      headers: headersUserA,
    });
    const subsequentData = await subsequentReq.json();
    const notOverwritten = subsequentData.profile?.avatarUrl === elevenAvatar.imageUrl;
    recordTest(
      'Subsequent requests preserve saved custom avatar and do not revert to default',
      notOverwritten,
      `Avatar preserved: ${subsequentData.profile?.avatarUrl?.slice(0, 30)}...`
    );
  } finally {
    // Cleanup test profiles
    try {
      await prisma.profile.deleteMany({
        where: {
          id: { in: [userAId, userBId] },
        },
      });
    } catch {
      // Ignore cleanup error
    }

    testServer.close();
    console.log('\n[Test Server] Server closed successfully.');
  }

  // Summary
  console.log('\n====================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}\n`);

  if (failedCount > 0) {
    console.error('❌ SOME AVATAR ONBOARDING TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('✨ ALL AVATAR ONBOARDING TESTS PASSED SUCCESSFULLY! ✨\n');
  }
}

runAvatarOnboardingTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
