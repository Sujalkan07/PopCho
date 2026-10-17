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

async function runHomepageEndpointsTest() {
  console.log('====================================================');
  console.log('🏠 PopCho Homepage Endpoints Functional Test Suite');
  console.log('====================================================\n');

  const testServer = http.createServer(app);
  initSocketServer(testServer, ['http://localhost:5173']);

  await new Promise<void>((resolve) => {
    testServer.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (testServer.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Running at ${baseUrl}\n`);

  const testUserId = `user_tester_${Date.now()}`;
  const authHeaders = {
    'x-user-id': testUserId,
    'x-user-name': 'Pulse QA Tester',
    'x-user-email': 'tester@popcho.tv',
    'x-user-role': 'critic',
    'Content-Type': 'application/json',
  };

  try {
    // -------------------------------------------------------------------------
    // Test 1: Pulse Discussions Feed
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Live Fan Pulse Endpoint ---');
    const pulseRes = await fetch(`${baseUrl}/api/communities/pulse`, {
      headers: authHeaders,
    });
    const pulseData = await pulseRes.json();
    const hasDiscussions = pulseRes.ok && Array.isArray(pulseData.discussions) && pulseData.discussions.length > 0;
    recordTest(
      'GET /api/communities/pulse returns top discussions with default limit 4',
      hasDiscussions && pulseData.discussions.length <= 4,
      `Returned ${pulseData.discussions?.length || 0} discussions (expected <= 4)`
    );

    // Verify ordering by likeCount descending
    let isSortedByLikes = true;
    for (let i = 0; i < (pulseData.discussions?.length || 0) - 1; i++) {
      if (pulseData.discussions[i].likeCount < pulseData.discussions[i + 1].likeCount) {
        isSortedByLikes = false;
        break;
      }
    }
    recordTest(
      'Discussions are ordered by most-liked (reaction count) descending',
      isSortedByLikes,
      `Likes order: ${pulseData.discussions?.map((d: any) => d.likeCount).join(', ')}`
    );

    const firstDiscussion = pulseData.discussions[0];
    recordTest(
      'Discussion model has required author and show fields',
      Boolean(firstDiscussion?.id && firstDiscussion?.author?.name && firstDiscussion?.show?.title && firstDiscussion?.categoryTag),
      `Discussion ID: ${firstDiscussion?.id}, Show: "${firstDiscussion?.show?.title}", Author: "${firstDiscussion?.author?.name}"`
    );

    // -------------------------------------------------------------------------
    // Test 2: Like / Reaction Toggle
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Pulse Discussion Likes ---');
    const initialLikeCount = firstDiscussion.likeCount;
    const likeRes1 = await fetch(`${baseUrl}/api/communities/pulse/${firstDiscussion.id}/like`, {
      method: 'POST',
      headers: authHeaders,
    });
    const likeData1 = await likeRes1.json();
    recordTest(
      'POST /api/communities/pulse/:id/like toggles like on',
      likeRes1.ok && likeData1.isLiked === true && likeData1.likeCount === initialLikeCount + 1,
      `isLiked: ${likeData1.isLiked}, likeCount: ${likeData1.likeCount}`
    );

    // Toggle off
    const likeRes2 = await fetch(`${baseUrl}/api/communities/pulse/${firstDiscussion.id}/like`, {
      method: 'POST',
      headers: authHeaders,
    });
    const likeData2 = await likeRes2.json();
    recordTest(
      'POST /api/communities/pulse/:id/like toggles like off',
      likeRes2.ok && likeData2.isLiked === false && likeData2.likeCount === initialLikeCount,
      `isLiked: ${likeData2.isLiked}, likeCount: ${likeData2.likeCount}`
    );

    // -------------------------------------------------------------------------
    // Test 3: Discussion Replies
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Discussion Replies ---');
    const replyText = `Test reply verification at ${Date.now()}`;
    const postReplyRes = await fetch(`${baseUrl}/api/communities/pulse/${firstDiscussion.id}/replies`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ content: replyText }),
    });
    const postReplyData = await postReplyRes.json();
    recordTest(
      'POST /api/communities/pulse/:id/replies creates a persisted reply',
      postReplyRes.ok && postReplyData.reply?.content === replyText,
      `Reply ID: ${postReplyData.reply?.id}, updated replyCount: ${postReplyData.replyCount}`
    );

    const getRepliesRes = await fetch(`${baseUrl}/api/communities/pulse/${firstDiscussion.id}/replies`, {
      headers: authHeaders,
    });
    const getRepliesData = await getRepliesRes.json();
    const replyFound = getRepliesData.replies?.some((r: any) => r.content === replyText);
    recordTest(
      'GET /api/communities/pulse/:id/replies retrieves created reply',
      getRepliesRes.ok && replyFound,
      `Total replies returned: ${getRepliesData.replies?.length || 0}`
    );

    // -------------------------------------------------------------------------
    // Test 4: Leaderboard Top Theorists
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Weekly & All-Time Theorists Leaderboard ---');
    const weekLeaderboardRes = await fetch(`${baseUrl}/api/communities/leaderboard?period=week&limit=5`);
    const weekData = await weekLeaderboardRes.json();
    recordTest(
      'GET /api/communities/leaderboard?period=week returns calculated rankings',
      weekLeaderboardRes.ok && Array.isArray(weekData.theorists),
      `Theorists found: ${weekData.theorists?.length || 0}`
    );

    const allLeaderboardRes = await fetch(`${baseUrl}/api/communities/leaderboard?period=all&limit=5`);
    const allData = await allLeaderboardRes.json();
    recordTest(
      'GET /api/communities/leaderboard?period=all returns calculated rankings',
      allLeaderboardRes.ok && Array.isArray(allData.theorists) && allData.theorists.length > 0,
      `Theorists found: ${allData.theorists?.length || 0}, Top user: "${allData.theorists?.[0]?.displayName}" (${allData.theorists?.[0]?.points} pts)`
    );

    // -------------------------------------------------------------------------
    // Test 5: Featured Fan Reviews & Helpful Votes
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Reviews Filters & Helpful Voting ---');
    const reviewsRes = await fetch(`${baseUrl}/api/reviews?limit=3&filter=all`);
    const reviewsData = await reviewsRes.json();
    recordTest(
      'GET /api/reviews?filter=all returns real persistent reviews',
      reviewsRes.ok && Array.isArray(reviewsData.results) && reviewsData.results.length > 0,
      `Reviews found: ${reviewsData.results?.length || 0}`
    );

    const firstReview = reviewsData.results[0];
    if (firstReview) {
      const initialHelpful = firstReview.helpfulCount;
      const voteRes = await fetch(`${baseUrl}/api/reviews/${firstReview.id}/vote`, {
        method: 'POST',
        headers: authHeaders,
      });
      const voteData = await voteRes.json();
      recordTest(
        'POST /api/reviews/:id/vote updates helpful count on review',
        voteRes.ok && typeof voteData.helpfulCount === 'number',
        `isHelpfulLiked: ${voteData.isHelpfulLiked}, helpfulCount: ${voteData.helpfulCount} (was ${initialHelpful})`
      );
    }
  } catch (err) {
    console.error('Test execution error:', err);
    recordTest('Homepage tests execution', false, String(err));
  } finally {
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed:         ${passed}`);
  console.log(`Failed:         ${failed}`);

  if (failed === 0) {
    console.log('\n✨ ALL HOMEPAGE ENDPOINT TESTS PASSED SUCCESSFULLY! ✨\n');
  } else {
    console.error(`\n❌ ${failed} TEST(S) FAILED.\n`);
    process.exit(1);
  }
}

runHomepageEndpointsTest().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
