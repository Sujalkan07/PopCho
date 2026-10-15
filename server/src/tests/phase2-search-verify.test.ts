import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../index.js';
import prisma from '../db/prisma.js';

async function runSearchVerification() {
  console.log('====================================================');
  console.log('🔍 PopCho Phase 2 Search & Verification Suite');
  console.log('====================================================\n');

  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => {
    testServer.listen(0, '127.0.0.1', () => resolve());
  });

  const address = testServer.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[Test Server] Running at ${baseUrl}\n`);

  let allPassed = true;

  try {
    // 1. TMDB live search for TV show
    console.log('--- Test 1: TMDB TV Search ---');
    const tvRes = await fetch(`${baseUrl}/api/tmdb/search?query=Severance`);
    if (!tvRes.ok) throw new Error(`TV search failed: ${tvRes.status}`);
    const tvData = (await tvRes.json()) as { results: any[]; total: number };
    const hasSeverance = tvData.results?.some((r) => r.title.toLowerCase().includes('severance'));
    if (hasSeverance) {
      console.log('✅ PASS | TMDB Search: Successfully searched "Severance" and found matching titles');
    } else {
      console.log('❌ FAIL | TMDB Search: "Severance" not found in results');
      allPassed = false;
    }

    // 2. TMDB live search for Movie
    console.log('\n--- Test 2: TMDB Movie Search ---');
    const movieRes = await fetch(`${baseUrl}/api/tmdb/search?query=Inception`);
    if (!movieRes.ok) throw new Error(`Movie search failed: ${movieRes.status}`);
    const movieData = (await movieRes.json()) as { results: any[]; total: number };
    const hasInception = movieData.results?.some((r) => r.title.toLowerCase().includes('inception'));
    if (hasInception) {
      console.log('✅ PASS | TMDB Search: Successfully searched "Inception" and found matching movie');
    } else {
      console.log('❌ FAIL | TMDB Search: "Inception" not found in results');
      allPassed = false;
    }

    // 3. Communities endpoint search parameter
    console.log('\n--- Test 3: Communities Query ---');
    const commRes = await fetch(`${baseUrl}/api/communities?limit=10`);
    if (commRes.ok) {
      console.log('✅ PASS | Communities: Successfully queried community directory');
    } else {
      console.log(`❌ FAIL | Communities query failed: ${commRes.status}`);
      allPassed = false;
    }

    // 4. TMDB Details endpoint (for autocomplete persistence)
    console.log('\n--- Test 4: TMDB Details Persistence Integrity ---');
    const detailsRes = await fetch(`${baseUrl}/api/tmdb/details/27205?mediaType=movie`); // Inception TMDB ID
    if (detailsRes.ok) {
      const details = (await detailsRes.json()) as { title: string; posterPath: string; backdropPath: string };
      if (details.title && details.posterPath) {
        console.log(`✅ PASS | TMDB Details: Retrieved "${details.title}" with valid poster (${details.posterPath})`);
      } else {
        console.log('❌ FAIL | TMDB Details: Missing title or poster path');
        allPassed = false;
      }
    } else {
      console.log(`❌ FAIL | TMDB Details failed: ${detailsRes.status}`);
      allPassed = false;
    }

  } catch (err) {
    console.error('Test error:', err);
    allPassed = false;
  } finally {
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('✨ ALL SEARCH & VERIFICATION TESTS PASSED! ✨');
  } else {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runSearchVerification();
