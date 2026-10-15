process.env.NODE_ENV = 'test';
process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';

const { app } = await import('../index.js');
const { initSocketServer } = await import('../socket.js');
const { default: prisma } = await import('../db/prisma.js');
const { watchlistService } = await import('../services/watchlist.service.js');
const { communityService } = await import('../services/community.service.js');
const { reviewService } = await import('../services/review.service.js');

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

async function runPhase3E2ETests() {
  console.log('====================================================');
  console.log('🧪 PopCho Phase 3 End-to-End Integration Test Suite');
  console.log('====================================================\n');

  // Start isolated test HTTP and Socket server
  const testServer = http.createServer(app);
  const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  initSocketServer(testServer, allowedOrigins);

  await new Promise<void>((resolve) => {
    testServer.listen(0, '127.0.0.1', () => resolve());
  });

  const address = testServer.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[Phase 3 Test Server] Running at ${baseUrl}\n`);

  // Identifiers for two distinct authenticated users
  const timestamp = Date.now();
  const userA = {
    id: `user_alpha_${timestamp}`,
    name: 'Alpha Watcher',
    email: `alpha_${timestamp}@popcho.test`,
    avatar: 'https://example.com/alpha.png',
    role: 'Senior Critic',
  };
  const userB = {
    id: `user_beta_${timestamp}`,
    name: 'Beta Fan',
    email: `beta_${timestamp}@popcho.test`,
    avatar: 'https://example.com/beta.png',
    role: 'Community Member',
  };

  // Seed test profiles in database for both users
  await prisma.profile.createMany({
    data: [
      {
        id: userA.id,
        displayName: userA.name,
        email: userA.email,
        avatarUrl: userA.avatar,
        role: userA.role,
      },
      {
        id: userB.id,
        displayName: userB.name,
        email: userB.email,
        avatarUrl: userB.avatar,
        role: userB.role,
      },
    ],
  });

  try {
    // =========================================================================
    // SUITE 1: Two-User Authentication, Authorization & Cross-Account Isolation
    // =========================================================================
    console.log('--- Suite 1: Two-User Cross-Account Isolation ---');

    // 1.1 Watchlist Isolation: User A adds movie, User B watchlist stays empty
    const testTmdbId = 888001;
    await watchlistService.toggleItem(userA.id, {
      tmdbId: testTmdbId,
      mediaType: 'movie',
      title: 'Alpha Private Movie',
    });

    const userBWatchlist = await watchlistService.getUserWatchlist(userB.id);
    recordTest(
      'Watchlist Isolation: User B cannot see User A saved items',
      !userBWatchlist.some((item) => item.tmdbId === testTmdbId),
      'User B list is strictly isolated'
    );

    // 1.2 Cross-User Deletion Protection
    const deleteAttempt = await watchlistService.removeItem(userB.id, testTmdbId, 'movie');
    recordTest(
      'Watchlist Security: User B cannot delete User A watchlist items',
      !deleteAttempt.removed,
      'Deletion attempt correctly rejected'
    );

    const userAWatchlist = await watchlistService.getUserWatchlist(userA.id);
    recordTest(
      'Watchlist Integrity: User A item remains preserved after unauthorized deletion attempt',
      userAWatchlist.some((item) => item.tmdbId === testTmdbId),
      'Item fully preserved'
    );

    // 1.3 Review Ownership & Cross-User Delete Guard
    const userAReview = await reviewService.createReview(
      {
        tmdbId: testTmdbId,
        mediaType: 'movie',
        showTitle: 'Alpha Private Movie',
        headline: 'A Masterpiece of Cinematic Tension',
        content: 'Exceptional pacing and deep character arcs throughout the entire narrative.',
        rating: 4.5,
      },
      userA
    );

    // User B attempts to delete User A's review
    let userBCouldDelete = false;
    let unauthorizedStatusCode = 0;
    try {
      await reviewService.deleteReview(userAReview.id, userB.id);
      userBCouldDelete = true;
    } catch (err: unknown) {
      unauthorizedStatusCode = (err as { statusCode?: number })?.statusCode || 500;
    }

    recordTest(
      'Review Authorization: User B cannot delete User A review',
      !userBCouldDelete && unauthorizedStatusCode === 403,
      `Blocked with HTTP ${unauthorizedStatusCode}`
    );

    // User A successfully deletes their own review
    let userACouldDelete = false;
    try {
      const delRes = await reviewService.deleteReview(userAReview.id, userA.id);
      userACouldDelete = Boolean(delRes.success);
    } catch {
      userACouldDelete = false;
    }

    recordTest(
      'Review Ownership: Author (User A) can delete their own review',
      userACouldDelete,
      'Author deletion succeeded'
    );

    // =========================================================================
    // SUITE 2: Watchlist Media Composite Identity (Movie vs TV with same ID)
    // =========================================================================
    console.log('\n--- Suite 2: Watchlist Media Composite Identity (Movie vs TV) ---');

    const sharedId = 777001;
    // Add movie with ID 777001
    await watchlistService.toggleItem(userA.id, {
      tmdbId: sharedId,
      mediaType: 'movie',
      title: 'Shared ID The Movie',
    });
    // Add TV show with the exact same numeric TMDB ID 777001
    await watchlistService.toggleItem(userA.id, {
      tmdbId: sharedId,
      mediaType: 'tv',
      title: 'Shared ID The TV Series',
    });

    const compositeItems = await watchlistService.getUserWatchlist(userA.id);
    const movieFound = compositeItems.some((i) => i.tmdbId === sharedId && i.mediaType === 'movie');
    const tvFound = compositeItems.some((i) => i.tmdbId === sharedId && i.mediaType === 'tv');

    recordTest(
      'Media Identity: Movie and TV show with same TMDB ID coexist without collision',
      movieFound && tvFound,
      'Both movie-777001 and tv-777001 exist independently'
    );

    // Remove only the movie
    await watchlistService.removeItem(userA.id, sharedId, 'movie');
    const remainingItems = await watchlistService.getUserWatchlist(userA.id);
    const movieGone = !remainingItems.some((i) => i.tmdbId === sharedId && i.mediaType === 'movie');
    const tvStillThere = remainingItems.some((i) => i.tmdbId === sharedId && i.mediaType === 'tv');

    recordTest(
      'Media Identity: Deleting movie leaves TV show intact',
      movieGone && tvStillThere,
      'Composite primary key prevents accidental cross-media deletion'
    );

    // Clean up TV show
    await watchlistService.removeItem(userA.id, sharedId, 'tv');

    // =========================================================================
    // SUITE 3: Read-Only Community Lookup Safety (Zero Unintended Writes on GET)
    // =========================================================================
    console.log('\n--- Suite 3: Community Lookup Read-Only Integrity ---');

    const phantomTmdbId = 9999881;
    // Verify it doesn't exist in DB before lookup
    const beforeCount = await prisma.community.count({
      where: { tmdbId: phantomTmdbId },
    });

    // Perform GET /lookup
    const lookupRes = await fetch(
      `${baseUrl}/api/communities/lookup?tmdbId=${phantomTmdbId}&mediaType=tv&title=Phantom%20Show`
    );
    const lookupData = (await lookupRes.json()) as { community?: { isPersisted?: boolean; id?: string } };

    // Verify it STILL does not exist in DB after GET request
    const afterCount = await prisma.community.count({
      where: { tmdbId: phantomTmdbId },
    });

    recordTest(
      'Read-Only Integrity: GET /api/communities/lookup creates 0 records in database',
      beforeCount === 0 && afterCount === 0 && lookupData.community?.isPersisted === false,
      `Records in DB before: ${beforeCount}, after: ${afterCount} (isPersisted: ${lookupData.community?.isPersisted})`
    );

    // =========================================================================
    // SUITE 4: Real-Time Socket.IO Multi-User Chat, Persistence & Reaction Sync
    // =========================================================================
    console.log('\n--- Suite 4: Multi-User Real-Time Chat & Persistence ---');

    // Ensure a test community and channel exist in DB for real-time test
    const testComm = await communityService.findOrCreateCommunity({
      tmdbId: 550999,
      mediaType: 'tv',
      fallbackTitle: 'Integration Test Fandom Hub',
    });
    const channelId = testComm.channels[0].id;

    // Connect User A socket client
    const socketClientA: ClientSocket = ioClient(baseUrl, {
      transports: ['websocket'],
      auth: {
        userId: userA.id,
        userName: userA.name,
        userAvatar: userA.avatar,
        userRole: userA.role,
      },
    });

    // Connect User B socket client
    const socketClientB: ClientSocket = ioClient(baseUrl, {
      transports: ['websocket'],
      auth: {
        userId: userB.id,
        userName: userB.name,
        userAvatar: userB.avatar,
        userRole: userB.role,
      },
    });

    // Wait for both sockets to connect with error handling
    const connectSocket = (socket: ClientSocket) =>
      new Promise<void>((resolve, reject) => {
        if (socket.connected) return resolve();
        socket.once('connect', () => resolve());
        socket.once('connect_error', (err) => reject(new Error(`Socket connection error: ${err.message}`)));
      });

    await Promise.all([connectSocket(socketClientA), connectSocket(socketClientB)]);

    recordTest(
      'Socket.IO Handshake: Both User A and User B connected with distinct sessions',
      socketClientA.connected && socketClientB.connected,
      `User A [${socketClientA.id}], User B [${socketClientB.id}]`
    );

    // Both join channel room
    await Promise.all([
      new Promise<void>((resolve) =>
        socketClientA.emit('join_channel', { channelId }, () => resolve())
      ),
      new Promise<void>((resolve) =>
        socketClientB.emit('join_channel', { channelId }, () => resolve())
      ),
    ]);

    // 4.1 Real-Time Message Exchange: User A sends -> User B receives via 'new_message'
    const testMessageText = `E2E Live message at ${timestamp}`;
    const messagePromise = new Promise<{ id: string; content: string; userName: string }>((resolve) => {
      socketClientB.on('new_message', (data: { message: { id: string; content: string; userName: string } }) => {
        if (data.message.content === testMessageText) {
          resolve(data.message);
        }
      });
    });

    let sentMessageId = '';
    await new Promise<void>((resolve) => {
      socketClientA.emit(
        'send_message',
        { channelId, content: testMessageText, isSpoiler: false },
        (res: { success: boolean; message?: { id: string } }) => {
          if (res.success && res.message) {
            sentMessageId = res.message.id;
          }
          resolve();
        }
      );
    });

    const receivedMessage = await Promise.race([
      messagePromise,
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);

    recordTest(
      'Real-Time Chat: User B receives User A message instantly without refresh',
      Boolean(receivedMessage && receivedMessage.content === testMessageText),
      receivedMessage ? `Received "${receivedMessage.content}" from "${receivedMessage.userName}"` : 'Timed out waiting for message'
    );

    // 4.2 Message Persistence & Real Author Attribution on REST Fetch
    const messagesRes = await fetch(
      `${baseUrl}/api/communities/${testComm.id}/channels/${channelId}/messages?limit=20`
    );
    const messagesJson = (await messagesRes.json()) as { messages?: Array<{
      id: string;
      content: string;
      userName: string;
      userAvatar: string;
    }> } | Array<{
      id: string;
      content: string;
      userName: string;
      userAvatar: string;
    }>;
    const messagesList = Array.isArray(messagesJson) ? messagesJson : (messagesJson.messages || []);

    const persistedMatch = messagesList.find((m) => m.content === testMessageText);

    recordTest(
      'Chat Persistence: Message persisted in database with real author profile attribution',
      Boolean(persistedMatch && persistedMatch.userName === userA.name),
      persistedMatch
        ? `Persisted with author: "${persistedMatch.userName}" (avatar: "${persistedMatch.userAvatar}")`
        : 'Message not found in history'
    );

    // 4.3 Real-Time Reaction Sync: User B reacts with 🔥 -> User A receives 'reaction_updated'
    if (sentMessageId) {
      const reactionPromise = new Promise<boolean>((resolve) => {
        socketClientA.on(
          'reaction_updated',
          (data: { messageId: string; reactions: Array<{ emoji: string; count: number }> }) => {
            if (data.messageId === sentMessageId && data.reactions.some((r) => r.emoji === '🔥')) {
              resolve(true);
            }
          }
        );
      });

      await new Promise<void>((resolve) => {
        socketClientB.emit(
          'toggle_reaction',
          { messageId: sentMessageId, channelId, emoji: '🔥' },
          () => resolve()
        );
      });

      const reactionReceived = await Promise.race([
        reactionPromise,
        new Promise<boolean>((r) => setTimeout(() => r(false), 5000)),
      ]);

      recordTest(
        'Reaction Sync: User A receives User B reaction in real time',
        reactionReceived,
        reactionReceived ? 'Received reaction_updated with emoji 🔥' : 'Reaction event timed out'
      );
    }

    // Clean up socket clients
    socketClientA.disconnect();
    socketClientB.disconnect();
  } finally {
    // Clean up database test fixtures
    await prisma.watchlist.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.review.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.membership.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.message.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.profile.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

    testServer.close();
  }

  console.log('\n====================================================');
  console.log('📊 PHASE 3 TEST SUMMARY');
  console.log('====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${results.length - passedCount}`);

  if (passedCount === results.length) {
    console.log('\n✨ ALL PHASE 3 INTEGRATION TESTS PASSED SUCCESSFULLY! ✨\n');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED\n');
    process.exit(1);
  }
}

runPhase3E2ETests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
