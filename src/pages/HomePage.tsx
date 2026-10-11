import React, { useState } from 'react';
import type { MediaItem } from '../services/tmdb/types';

interface HomePageProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  bookmarkedIds: Record<string | number, boolean>;
  onToggleBookmark: (showId: string | number) => void;
  onJoinHub: (show: MediaItem) => void;
  onViewReviews: (show: MediaItem) => void;
  onRequestHub?: () => void;
  setNotificationToast?: (msg: string | null) => void;
}

const STRANGER_THINGS_ITEM: MediaItem = {
  id: 'st-1396',
  tmdbId: 66732,
  title: 'Stranger Things',
  overview:
    'Hawkins is fractured, and the perimeter has breached. Fans around the globe are dissecting every gate coordinate, Vecna memory tape, and 80s synth motif as the endgame looms.',
  posterPath:
    'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
  backdropPath:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuASQuUGHlozeTB-7aiBPIbIyrqa_Dy9ReTEydZ92M49bgusNTKWKexCS8rupIwjMcClu9vCySd64RV5Oiiz1LVLe4fuesqEqs_BO7pP-Vey1FgP6X8ufp4_dsrhW1JJcvPer3oXBef3C3BHpnYY6yP-iKYMnxCN3jzxdC6HL7JRj25bCBZ0qFXUnNdCa7Glz_Rzu8QJiHrX8rmZgK1MqvR0-RvMvA-cyVlAHV-G1zGD2skOANywqLxQAQ',
  mediaType: 'tv',
  releaseDate: '2016-07-15',
  firstAirDate: '2016-07-15',
  voteAverage: 8.6,
  voteCount: 16840,
  genres: ['Sci-Fi', 'Mystery', 'Drama', 'Horror'],
};

interface TrendingCommunityItem {
  id: string;
  title: string;
  hubName: string;
  onlineCount: string;
  fansCount: string;
  theoryExcerpt: string;
  posterBg: string;
  genre: string;
  mediaItem: MediaItem;
}

const TRENDING_COMMUNITIES: TrendingCommunityItem[] = [
  {
    id: 'wednesday',
    title: 'Wednesday',
    hubName: 'Nevermore Academy',
    onlineCount: '2.8k',
    fansCount: '28.1k',
    theoryExcerpt: '"Enid & Wednesday team-up theory trending"',
    posterBg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB5XiDpYmGOCGMizpKGiX5HGrjcjj6huhwQXWgkT5pdslznLQ7laaM80RuyvbVU-aD9meHY_VStgHqt76V3UmwUnIR7n2J9As-4DycXcjRDTZ4hBKXsDiBuTo-E9Sqg-Ya8XspGVLrTs6nH-azIlFwlG4VUwm9yimnCSSE9yeho90rr-WA54qhVwu9b1TPr5Uf3QI9NsPQKyWdeTLjpmk23u_HzcvYDYwVGsaEIxryZ6tidBxA-XFM-Tw',
    genre: 'Mystery · Fantasy',
    mediaItem: {
      id: '119051',
      tmdbId: 119051,
      title: 'Wednesday',
      overview: 'Wednesday Addams misadventures at Nevermore Academy.',
      posterPath: 'https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg',
      backdropPath: 'https://image.tmdb.org/t/p/original/iHSwvRVsRyxKuOC09ygvE0knQEG.jpg',
      mediaType: 'tv',
      voteAverage: 8.5,
      voteCount: 7890,
      genres: ['Mystery', 'Comedy', 'Fantasy'],
    },
  },
  {
    id: 'dark',
    title: 'Dark',
    hubName: 'Winden Quantum Hub',
    onlineCount: '1.1k',
    fansCount: '19.4k',
    theoryExcerpt: '"Cycle 3 paradox flowchart mapped"',
    posterBg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDfIXP5UXb2K3E4VcNCDQbdA6yTChHrdfqGr9OZL9Vbvn_E7sQSMCv-EiWoXfaaZKJz7BJOsBkpPZ5ZaZdCdqVTu8THuCRebIkOJwqTUoEgrANKfTQ0i5j82ShlH6URF1m33OZ-ABt5k2ogJOYhzQQdLxLpwFyQpIzUxE0IvacRM1-6Zr8DPtT7IrauiPCXeEfWeAXOy3u4bkaJVSxdMQ_atCZnf6D-fAHSxrXMvWmNIvPOMfdNU_Mp5g',
    genre: 'Sci-Fi · Mystery',
    mediaItem: {
      id: '70523',
      tmdbId: 70523,
      title: 'Dark',
      overview: 'A missing child sets four families on a frantic hunt for answers.',
      posterPath: 'https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg',
      backdropPath: 'https://image.tmdb.org/t/p/original/3lBDg3i6nnOccRsgUGmVvxYRKVW.jpg',
      mediaType: 'tv',
      voteAverage: 8.4,
      voteCount: 6120,
      genres: ['Sci-Fi', 'Mystery', 'Drama'],
    },
  },
  {
    id: 'squid-game',
    title: 'Squid Game',
    hubName: 'VIP Lounge',
    onlineCount: '4.9k',
    fansCount: '34.8k',
    theoryExcerpt: '"Season 2 arena theories active"',
    posterBg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBrEe6DvWnvSy2WaOrKHy5IC0nJbiKY_oNxJA2S_Mjs55o1cDbY2d1s5xVD2rZyDiPNamLhKKyoePgVecbbcGXax-ViNPIDBzMcMLiK78KdO2LMrH2evfbncWCypaLrdvzjGf-P0k841PtFCFKiq65DLlcuyUitiz-kVYme6eu7XM_0zIueoUUEnEsgDMiS7TY7hfD0OTJeqN75N5eg_-XlyCMfnoMhLAKo_13cznlCH8exFCfOoGQbVA',
    genre: 'Thriller · Drama',
    mediaItem: {
      id: '93405',
      tmdbId: 93405,
      title: 'Squid Game',
      overview: 'Hundreds of cash-strapped players accept a strange invitation.',
      posterPath: 'https://image.tmdb.org/t/p/w500/dDlG5n0iH4c6u0C2qWzC3cR3uQv.jpg',
      backdropPath: 'https://image.tmdb.org/t/p/original/oaGvjB0DvdNDbdPtDcX0ag9QgNV.jpg',
      mediaType: 'tv',
      voteAverage: 7.8,
      voteCount: 14200,
      genres: ['Action', 'Mystery', 'Drama'],
    },
  },
  {
    id: 'the-witcher',
    title: 'The Witcher',
    hubName: 'Continental Lodge',
    onlineCount: '890',
    fansCount: '15.2k',
    theoryExcerpt: '"Book fidelity discussion #42"',
    posterBg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAeSp42uo28vtxwuXDqGgeRgdYmo_Z9ktAAej_OvPtOkX_CBejZZc_LcER-vzdObq01cWGptvpYvdiZnsbn3F-1leRGEyU7NR8s-EOqYKgfL8usmI0Yv8KA5NVLMrc0Dq_WE1UgGqnLMY619GUA3losRjilnINZbU6XGypN7klZAnBDLRC8vrkXBDMObFD5q-nSoFFlQNZ0Wj-1PqKkuCbX0E0uTxhi9Ux-NeUgUsTkerQR84LuOOEA0w',
    genre: 'Fantasy · Action',
    mediaItem: {
      id: '71912',
      tmdbId: 71912,
      title: 'The Witcher',
      overview: 'Geralt of Rivia, a mutated monster-hunter for hire.',
      posterPath: 'https://image.tmdb.org/t/p/w500/cZ0d3rtvXPVvuiX22434W1fT5r6.jpg',
      backdropPath: 'https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6YQ69x.jpg',
      mediaType: 'tv',
      voteAverage: 8.0,
      voteCount: 5400,
      genres: ['Sci-Fi', 'Fantasy', 'Action'],
    },
  },
  {
    id: 'black-mirror',
    title: 'Black Mirror',
    hubName: 'Tech Dystopia',
    onlineCount: '1.6k',
    fansCount: '22.0k',
    theoryExcerpt: '"Interactive episode breakdowns"',
    posterBg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD2zaRZeKoVCFkzCw4DWEsMjzdR6Q-4M-GdKLbFKlBMmfL0uEEiANoobIaMQIy1qGoPF0m5J8VQxyUt_Zx88g34f2Ki76me32mf2TFJC-2cuXNXEqlNKabdBJA5kH1aVxmGGRepOWIZyN1sN-s5fyJI6o6LNpYy7tvopcHyaOk8MCDQgkAoi3_fPySzXI7vxMn4klFOR4Ms8OfCmyQr5Nn9Ax1St5wLWaFeKQnFG8xE-vMk3SVWsCzrmA',
    genre: 'Sci-Fi · Thriller',
    mediaItem: {
      id: '42009',
      tmdbId: 42009,
      title: 'Black Mirror',
      overview: 'Overarching anthology series exploring a twisted, high-tech near-future.',
      posterPath: 'https://image.tmdb.org/t/p/w500/7Rum0Wj969G1mR6p5u2MvF6YyR2.jpg',
      backdropPath: 'https://image.tmdb.org/t/p/original/56v2KjUmLeVoV291x5gq1L1r3t.jpg',
      mediaType: 'tv',
      voteAverage: 8.3,
      voteCount: 4800,
      genres: ['Sci-Fi', 'Drama', 'Mystery'],
    },
  },
];

const GENRE_BAR = [
  'All Genres',
  'Sci-Fi & Fantasy',
  'Psychological Thriller',
  'Dark Comedy',
  'True Crime',
  'Dystopian',
  'Anime & Animation',
  'Period Drama',
];

export const HomePage: React.FC<HomePageProps> = ({
  bookmarkedIds,
  onToggleBookmark,
  onJoinHub,
  onViewReviews,
  setNotificationToast,
}) => {
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [activeReviewTab, setActiveReviewTab] = useState<'week' | 'all' | 'helpful'>('week');

  // Pulse thread likes
  const [threadLikes, setThreadLikes] = useState({
    thread1: 482,
    thread2: 319,
    thread3: 204,
  });
  const [likedThreads, setLikedThreads] = useState<Record<string, boolean>>({});

  const toggleThreadLike = (threadKey: 'thread1' | 'thread2' | 'thread3') => {
    setLikedThreads((prev) => {
      const isCurrentlyLiked = Boolean(prev[threadKey]);
      const nextLiked = !isCurrentlyLiked;
      setThreadLikes((current) => ({
        ...current,
        [threadKey]: nextLiked ? current[threadKey] + 1 : current[threadKey] - 1,
      }));
      return { ...prev, [threadKey]: nextLiked };
    });
  };

  const isStBookmarked = Boolean(bookmarkedIds[STRANGER_THINGS_ITEM.id]);

  return (
    <main className="w-full min-h-screen bg-[#131313] text-[#e5e2e1] -mt-[68px]">
      <div className="flex flex-col w-full">
        {/* ========================================================================= */}
        {/* 1. CINEMATIC HERO STAGE (Screen 7bbed666b8da4ddcbcd2d4214343e2b7)       */}
        {/* ========================================================================= */}
        <section className="relative w-full overflow-hidden">
          <div
            className="w-full min-h-[620px] lg:min-h-[720px] bg-cover bg-center relative flex items-end"
            style={{
              backgroundImage: `url('${STRANGER_THINGS_ITEM.backdropPath}')`,
            }}
          >
            {/* Multi-stop Scrim Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#131313] via-[#131313]/60 to-transparent" />
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#0e0e0e]/80 to-transparent" />

            {/* Floating Top Left / Right Stitch Cards on Hero (Ambient Overlays) */}
            <div className="absolute top-24 left-6 hidden xl:flex flex-col gap-2 p-3.5 rounded-2xl bg-[#0e0e0e]/75 backdrop-blur-md border border-[#353534]/70 shadow-2xl max-w-xs z-20 pointer-events-none opacity-85">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#e50914]">
                Community Activity
              </span>
              <p className="text-xs font-bold text-[#e5e2e1]">Season 5 Theories &amp; Live Decodes</p>
              <p className="text-[11px] text-[#e9bcb6]/80 line-clamp-2">
                Upside Down Cosplay Contest • 182 new theory posts today
              </p>
            </div>

            <div className="absolute top-24 right-6 hidden xl:flex flex-col gap-2 p-3.5 rounded-2xl bg-[#0e0e0e]/75 backdrop-blur-md border border-[#353534]/70 shadow-2xl max-w-xs z-20 pointer-events-none opacity-85">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#70dc8e]">
                  Discover Channels
                </span>
                <span className="text-[10px] text-[#70dc8e] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e] animate-ping" />
                  Live Sync
                </span>
              </div>
              <div className="text-[11px] text-[#e9bcb6] space-y-1">
                <p>#theories • 781 active</p>
                <p>#fan-art • 152 active</p>
                <p>#episodes • 232 active</p>
              </div>
            </div>

            {/* Hero Main Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-10 flex flex-col justify-end">
              {/* Live Status Pill & Metadata Row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0e0e0e]/90 backdrop-blur-md shadow-sm border border-[#353534]/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#70dc8e] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#008442]" />
                  </span>
                  <span className="text-xs font-semibold text-[#e5e2e1] uppercase tracking-wider">
                    12.4k Online in Hub
                  </span>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#e50914] text-white text-xs font-extrabold uppercase tracking-widest shadow-md">
                  Season 5 Anticipation Hub
                </span>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a2a2a]/90 text-[#e9bcb6] text-xs font-semibold border border-[#353534]/50">
                  <span className="material-symbols-outlined text-sm text-[#ffb4aa]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="font-bold text-[#e5e2e1]">4.9</span>
                  <span className="opacity-70">(18.4k reviews)</span>
                </div>
              </div>

              {/* Dramatic Headline Block */}
              <div className="max-w-3xl">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#e5e2e1] tracking-tight uppercase leading-none drop-shadow-2xl select-none mb-3">
                  STRANGER THINGS
                </h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-[#e9bcb6] mb-3">
                  <span>1983 Hawkins, IN</span>
                  <span className="w-1 h-1 rounded-full bg-[#353534]" />
                  <span>Sci-Fi Mystery &amp; Horror</span>
                  <span className="w-1 h-1 rounded-full bg-[#353534]" />
                  <span className="text-[#ffb4aa] font-bold">45.2k Active Theorists</span>
                  <span className="w-1 h-1 rounded-full bg-[#353534]" />
                  <span className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-[#e5e2e1] text-[11px] font-bold border border-[#353534]">
                    TV-MA
                  </span>
                </div>

                <p className="text-sm sm:text-base text-[#e9bcb6]/90 max-w-2xl mb-6 leading-relaxed drop-shadow">
                  Hawkins is fractured, and the perimeter has breached. Fans around the globe are dissecting every gate coordinate, Vecna memory tape, and 80s synth motif as the endgame looms.
                </p>

                {/* Call-To-Action Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onJoinHub(STRANGER_THINGS_ITEM)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#e50914] text-white font-bold text-sm shadow-xl hover:bg-[#b2000d] transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      forum
                    </span>
                    <span>Join Community Discussion</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewReviews(STRANGER_THINGS_ITEM)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] font-semibold text-sm shadow-md transition-all active:scale-[0.98] border border-[#353534] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg text-[#ffb4aa]">reviews</span>
                    <span>Read 3,420 Fan Reviews</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleBookmark(STRANGER_THINGS_ITEM.id);
                      setNotificationToast?.(
                        isStBookmarked
                          ? 'Removed Stranger Things from Watchlist'
                          : 'Added Stranger Things to Watchlist'
                      );
                    }}
                    className={`p-3 rounded-xl transition-all shadow-sm border border-[#353534] cursor-pointer ${
                      isStBookmarked
                        ? 'bg-[#e50914] text-white'
                        : 'bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6]'
                    }`}
                    title="Bookmark Stranger Things Hub"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isStBookmarked ? 'bookmark_added' : 'bookmark_add'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. INTERACTIVE GENRE FILTERS BAR (BROWSE)                                */}
        {/* ========================================================================= */}
        <section className="w-full bg-[#0e0e0e] py-3.5 border-y border-[#353534]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs uppercase tracking-wider text-[#e9bcb6]/70 mr-1 hidden md:inline font-semibold">
                  Browse:
                </span>
                {GENRE_BAR.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                      selectedGenre === genre
                        ? 'bg-[#e50914] text-white shadow-md'
                        : 'bg-[#201f1f] text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a] border border-[#353534]/50'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setNotificationToast?.('Filter Drawer: 14 TV Networks, 8 Languages indexed.')}
                className="hidden lg:flex items-center gap-1.5 text-xs text-[#e9bcb6] hover:text-[#e5e2e1] shrink-0 px-3 py-1 rounded-full bg-[#201f1f] border border-[#353534]/50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span>Filters</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. TRENDING SHOW COMMUNITIES (5-Column Poster Layout)                    */}
        {/* ========================================================================= */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <h2 className="text-2xl font-bold text-[#e5e2e1]">Trending Show Communities</h2>
            </div>
            <a
              href="/discover"
              className="text-xs sm:text-sm font-semibold text-[#ffb4aa] hover:text-[#e5e2e1] flex items-center gap-0.5 transition-colors"
            >
              <span>Explore All Hubs</span>
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </a>
          </div>

          {/* 5-Column Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {TRENDING_COMMUNITIES.map((comm) => (
              <div
                key={comm.id}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#201f1f] border border-[#353534] shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5"
              >
                <div
                  className="w-full aspect-[2/3] bg-cover bg-center relative"
                  style={{ backgroundImage: `url('${comm.posterBg}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-[#201f1f]/20 to-transparent" />

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0e0e0e]/85 backdrop-blur text-[11px] font-semibold text-[#e5e2e1] border border-[#353534]/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e] animate-pulse" />
                    <span>{comm.onlineCount} live</span>
                  </div>

                  {/* Hover Overlay CTA */}
                  <div className="absolute inset-0 bg-[#0e0e0e]/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center p-4 text-center transition-opacity duration-200">
                    <span className="material-symbols-outlined text-3xl text-[#e50914] mb-1">
                      forum
                    </span>
                    <span className="text-sm font-bold text-[#e5e2e1] mb-1">{comm.hubName}</span>
                    <p className="text-[11px] text-[#e9bcb6]/80 line-clamp-2 mb-3">
                      {comm.theoryExcerpt}
                    </p>
                    <button
                      type="button"
                      onClick={() => onJoinHub(comm.mediaItem)}
                      className="px-4 py-2 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white font-bold text-xs w-full shadow cursor-pointer"
                    >
                      Open Community
                    </button>
                  </div>
                </div>

                <div className="p-3 flex flex-col flex-1 justify-between gap-1">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3 className="text-sm font-bold text-[#e5e2e1] truncate group-hover:text-[#ffb4aa] transition-colors">
                        {comm.title}
                      </h3>
                      <span className="text-[11px] text-[#e9bcb6]/70 shrink-0">{comm.fansCount}</span>
                    </div>
                    <p className="text-xs text-[#ffb4aa] font-medium truncate">{comm.hubName}</p>
                  </div>
                  <p className="text-[11px] text-[#e9bcb6]/70 truncate mt-0.5">{comm.theoryExcerpt}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. SPLIT SOCIAL STAGE: LIVE PULSE & WATCHROOMS                           */}
        {/* ========================================================================= */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Primary Left Feed: Live Fan Pulse */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#e5e2e1]">
                    Live Fan Pulse — Hot Discussions
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#e9bcb6]">
                  <span className="w-2 h-2 rounded-full bg-[#70dc8e] animate-pulse" />
                  <span>Real-time stream</span>
                </div>
              </div>

              {/* Pulse Thread Card 1 */}
              <article className="p-4 sm:p-5 rounded-2xl bg-[#201f1f] hover:bg-[#252424] transition-all border border-[#353534] shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-[#353534]"
                        alt="@DufferFanatic"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDH-t7vGqWvEjdY7gIYk78Mz067Z3OT5RRYwIy4oy4EdHpZv4DFkukoFFkmO9DVte04gYDKhOFYOazkMFBTW57BZR07sVpyr6oKY584FZD8r7qtNOtMB43ciT9EuZQWpIrm63RE4JnSgz_boJQl2-GTbW1Z0FpEeilRjjOk6HMNTNBkE0JTYE7XdawKRN6aYUfanqu-hs2QAl17sLdAzZgRPCQ39JZHP0Xg3GIp687fUOvXTMz23FTDYw"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#70dc8e] ring-2 ring-[#201f1f]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#e5e2e1]">@DufferFanatic</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#e50914]/20 text-[#ffb4aa] text-[10px] font-bold">
                          Top Theorist
                        </span>
                        <span className="text-xs text-[#e9bcb6]">in</span>
                        <span className="text-xs font-semibold text-[#e5e2e1]">Stranger Things</span>
                      </div>
                      <span className="text-[11px] text-[#e9bcb6]/70">8 minutes ago • Hawkins Clocks</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationToast?.('Thread actions: report, mute, save.')}
                    className="text-[#e9bcb6] hover:text-white p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#e5e2e1] mb-3 leading-relaxed">
                  "Look at the grandfather clock chiming at exactly 14:02 in the S5 teaser. It matches Will's season 2 crayon drawing coordinates to the millimeter. There's no way that's a coincidence..."
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-[#353534]/50">
                  <div className="flex items-center gap-4 text-xs text-[#e9bcb6]">
                    <button
                      type="button"
                      onClick={() => toggleThreadLike('thread1')}
                      className={`flex items-center gap-1 transition-colors cursor-pointer ${
                        likedThreads['thread1'] ? 'text-[#e50914]' : 'hover:text-[#e50914]'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-base"
                        style={{
                          fontVariationSettings: likedThreads['thread1'] ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </span>
                      <span>{threadLikes.thread1}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationToast?.('142 replies loaded.')}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">chat_bubble</span>
                      <span>142 replies</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        setNotificationToast?.('Discussion link copied!');
                      }}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">share</span>
                      <span>Share</span>
                    </button>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2a2a2a] text-[10px] font-semibold text-[#70dc8e] border border-[#353534]">
                    Active Debate
                  </span>
                </div>
              </article>

              {/* Pulse Thread Card 2 */}
              <article className="p-4 sm:p-5 rounded-2xl bg-[#201f1f] hover:bg-[#252424] transition-all border border-[#353534] shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-[#353534]"
                        alt="@PiltoverEnforcer"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-OEhqrztoiuY3OF8Xz2OvuFiCAqSNQaMm5_ePv2942nZblHmEi7oCN-rfgjJrMmVQ2X8AjDzG8nqHt10ogaiUO7RKbzdloEhrP2geWoYQgcA2n-HOUCIfRPgWyu42hfeCr5TLcAQ4bGYD-gs1u9M7cY5LnzkA_DYbZ8NKIdbdWjp7HgsKMbi5SBk5Hb2fGRXrPkai-KXdC7_h47eaVWrq6Z6ChDk8SFg7T2mWKFmqZdwDNF3sMssLew"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#70dc8e] ring-2 ring-[#201f1f]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#e5e2e1]">@PiltoverEnforcer</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-[#e9bcb6] text-[10px] font-bold">
                          Lore Scholar
                        </span>
                        <span className="text-xs text-[#e9bcb6]">in</span>
                        <span className="text-xs font-semibold text-[#e5e2e1]">Arcane</span>
                      </div>
                      <span className="text-[11px] text-[#e9bcb6]/70">14 minutes ago • Zaun Politics</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationToast?.('Thread actions: report, mute, save.')}
                    className="text-[#e9bcb6] hover:text-white p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#e5e2e1] mb-3 leading-relaxed">
                  "Why Silco's legacy still dictates season 2's pacing: Jinx isn't fighting the Council; she is running from the void left when he died. Every scene in the first three episodes proves this thesis."
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-[#353534]/50">
                  <div className="flex items-center gap-4 text-xs text-[#e9bcb6]">
                    <button
                      type="button"
                      onClick={() => toggleThreadLike('thread2')}
                      className={`flex items-center gap-1 transition-colors cursor-pointer ${
                        likedThreads['thread2'] ? 'text-[#e50914]' : 'hover:text-[#e50914]'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-base"
                        style={{
                          fontVariationSettings: likedThreads['thread2'] ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </span>
                      <span>{threadLikes.thread2}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationToast?.('89 replies loaded.')}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">chat_bubble</span>
                      <span>89 replies</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        setNotificationToast?.('Discussion link copied!');
                      }}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">share</span>
                      <span>Share</span>
                    </button>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2a2a2a] text-[10px] font-semibold text-[#e9bcb6] border border-[#353534]">
                    Character Study
                  </span>
                </div>
              </article>

              {/* Pulse Thread Card 3 */}
              <article className="p-4 sm:p-5 rounded-2xl bg-[#201f1f] hover:bg-[#252424] transition-all border border-[#353534] shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-[#353534]"
                        alt="@AmyLau99"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9YujzyFxBd8bwKWKIljFYwAyykS4XfL3B6GQOBWV9M7PInZW_8JKBd9PySannT0X7SyR9QegzE3gvZ78W4P5QSYCUeQ9SNn886VffJHp2TIIA1omGPO6mgh8H6qpvXFQ2fpsxn_7TE70YAXG43DyM1UhvHgsy_asPi5UmIJebxxl-SFWpviEKOBCjp2Tne4YhUtmBO69ktSKRgqadXQwpeY2mL49KfTLoc-XtAtHf0HBGLHgTTwLTkA"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#70dc8e] ring-2 ring-[#201f1f]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#e5e2e1]">@AmyLau99</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-[#e9bcb6] text-[10px] font-bold">
                          Staff Writer
                        </span>
                        <span className="text-xs text-[#e9bcb6]">in</span>
                        <span className="text-xs font-semibold text-[#e5e2e1]">Beef</span>
                      </div>
                      <span className="text-[11px] text-[#e9bcb6]/70">21 minutes ago • Series Finale</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationToast?.('Thread actions: report, mute, save.')}
                    className="text-[#e9bcb6] hover:text-white p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#e5e2e1] mb-3 leading-relaxed">
                  "The final hospital sequence is the most cathartic television ending of the decade. No dialogue needed, just pure emotional exhaustion transforming into acceptance."
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-[#353534]/50">
                  <div className="flex items-center gap-4 text-xs text-[#e9bcb6]">
                    <button
                      type="button"
                      onClick={() => toggleThreadLike('thread3')}
                      className={`flex items-center gap-1 transition-colors cursor-pointer ${
                        likedThreads['thread3'] ? 'text-[#e50914]' : 'hover:text-[#e50914]'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-base"
                        style={{
                          fontVariationSettings: likedThreads['thread3'] ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </span>
                      <span>{threadLikes.thread3}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationToast?.('56 replies loaded.')}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">chat_bubble</span>
                      <span>56 replies</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        setNotificationToast?.('Discussion link copied!');
                      }}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">share</span>
                      <span>Share</span>
                    </button>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2a2a2a] text-[10px] font-semibold text-[#e9bcb6] border border-[#353534]">
                    Finale Breakdown
                  </span>
                </div>
              </article>
            </div>

            {/* Secondary Right Sidebar: Synchronized Watch Parties & Fandom Leaderboard */}
            <aside className="lg:col-span-4 flex flex-col gap-4">
              {/* Live Watchroom Card */}
              <div className="p-5 rounded-2xl bg-[#201f1f] border border-[#353534] shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e50914] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e50914]" />
                    </span>
                    <h3 className="font-bold text-sm text-[#e5e2e1]">Synchronized Watchroom</h3>
                  </div>
                  <span className="text-[10px] text-[#ffb4aa] font-extrabold uppercase tracking-wider">
                    LIVE SYNC
                  </span>
                </div>

                {/* Watchroom Media Mini Hero */}
                <div
                  className="w-full h-36 rounded-xl bg-cover bg-center relative mb-3 overflow-hidden flex items-end p-3 border border-[#353534]"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC9F6Sw1dw8igYJ_YmloMq8jaWuPi1qb6f2dEa9eG_lHMvpDcyXmtoiMA59uye2wWmbns4UXTWvPvlxv7ShOVmGy-lk_awtcLAIzuAx1ClhLzXGU7E5ZghMdQHwsZvWMQzH0a9njdRK4HJszCalRprjSCjiMX2pmhjOn98W7FRULzm_-lYOR1RQ9SsBiOKVJHdZDHHCzABcCYJijN6yu8dwCG_YBNhaKXAbb2FUovNFT4flB5UP14sFgQ')",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent" />
                  <div className="relative z-10">
                    <span className="text-[10px] text-[#ffb4aa] font-extrabold uppercase">
                      S4: Episode 9 Climax
                    </span>
                    <h4 className="text-sm font-bold text-[#e5e2e1]">The Piggyback Re-watch</h4>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] text-[#e9bcb6]/80 mb-1">
                    <span>Current Time: 01:42:10</span>
                    <span className="font-semibold text-[#e5e2e1]">1,842 in room</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0e0e0e] rounded-full overflow-hidden">
                    <div className="h-full bg-[#e50914] rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>

                {/* Attendees */}
                <div className="flex -space-x-2 overflow-hidden mb-4 py-1">
                  <img
                    className="inline-block h-7 w-7 rounded-full ring-2 ring-[#201f1f] object-cover"
                    alt="Attendee"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBt7hEDyYZFIBGkJUUC9DTT6htRCgyoXJ19VF8IJMOVqHqXBYR9DjQzNtIshLelYiJVz8A3kaKH5-H2WR7CwuHJcpmy-1MlSPHoeKxR2rrhirjQ5YjJ9wwp0r8iu9u8_TzOvZzV1VDLnpSfEhHBsL359e2JQDdbUI6yrF9U9_4LlxBUl_6OUptr0398IVVcyjSZL9JCTRflioOhr6kOuJpWUI3f_o0aPcesMtZufsX3EQJW9km_PghEzw"
                  />
                  <img
                    className="inline-block h-7 w-7 rounded-full ring-2 ring-[#201f1f] object-cover"
                    alt="Attendee"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhSLE8ajVaE9HOSjXVSwcGt60yMpavFWtNKpOfWkbCaCHdE4r_PNWVpj5qSHTmyq0aYxhNVxnoJbERoj-dtyzI7rWGZoAVrzq_hrXgGjicQcKELQL39HI-sJlzO_ZbXlxMLmZpLILAhvlTKbKnkGNUM0pR57OBgF34DkiMgRMstyRmVMhacqj-mrxb6H7lJswRWITWC0YqHxIFy5RoWJ1PamDb52ijgdLPK8p0L-U29w15lI01KAifuQ"
                  />
                  <img
                    className="inline-block h-7 w-7 rounded-full ring-2 ring-[#201f1f] object-cover"
                    alt="Attendee"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw1IlOiXKYLeXUYTgEJI7L5KTKr4FCM0VKA2J3MtrOEIvqoEVdp13NB71mcovoD5BPuHQITu2EtagWPvECCE2rRg3lYpVh9W6asbsnwQ2EmTvcM_LlBG8Y_8zMTemSgNI4aYVuqOZfkSaptlr1F8xIHZx7zlmHoHK82Zqwp4UsI00M80NTCfV99UjcEJSAX31sH1E0O3QpvPg39Tx7A_5u8n5af7xEZJ5K6kBEPPxzVrA0haDQH1YB-w"
                  />
                  <div className="flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-[#201f1f] bg-[#2a2a2a] text-[10px] font-bold text-[#e5e2e1]">
                    +1.8k
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNotificationToast?.('Synchronized watchroom joined: Playback aligned with 1,842 viewers.');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#e50914] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#b2000d] transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_circle
                  </span>
                  <span>Join Watch Party</span>
                </button>
              </div>

              {/* Weekly Top Theorists Module */}
              <div className="p-5 rounded-2xl bg-[#201f1f] border border-[#353534] shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#e5e2e1]">Weekly Top Theorists</h3>
                  <span className="text-[10px] text-[#e9bcb6]/70 uppercase font-semibold">
                    Ranked by Upvotes
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-[#e50914] font-bold w-4 text-center">1</span>
                      <img
                        className="w-8 h-8 rounded-full object-cover"
                        alt="@HawkinsLabAnalyst"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3upIvtvlmHlQa683B9aMVf93Ml1X6cs0NyiUI-RA3yvU0sf23xWAB53k_DjoFPDhPWqGdBzTu54XNKBJnyyTy8gkOxHI_etWfUiCgCNxOR-f6Z6AzTFYkFK9oKyth8JACRxWTsznGLpOPjLbGtW79W0KtdYNBX_l4GW3omVo9vR3aTQFqjEuZnYy87YPlUBkNHi0qYkAxASXwpaBkpI2nuDLiCgMCMPiIGOhfpivh9Jom9FL5MDzdXA"
                      />
                      <div>
                        <div className="text-xs font-bold text-[#e5e2e1]">@HawkinsLabAnalyst</div>
                        <div className="text-[10px] text-[#e9bcb6]/70">14 Verified Theories</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#70dc8e] font-bold">+4,920 pts</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-[#e9bcb6] font-bold w-4 text-center">2</span>
                      <img
                        className="w-8 h-8 rounded-full object-cover"
                        alt="@TargaryenHistorian"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGc6p8FJlUpeMFtMqcPcFuPkAIrzoMJb4YfGDcUCarvPjgO1qVzYIqGhV6-qoDuQWuNTlztkXXxsOXPaYqeiYlr05ghE49eQ1olFHj0K0V6PPBkCepwgm98StTnyPVZYB0WMoi7fUyRV0rou3fIwIPNWEXaL16O-wN-lZ0uLa1r1VnY6CZAgjSDYigqDbc-8fPSK32R-TyTneNRcr5WuNHyf5dQmK9PVHKG0gqtrIlD0KbNsYe0oQ7hw"
                      />
                      <div>
                        <div className="text-xs font-bold text-[#e5e2e1]">@TargaryenHistorian</div>
                        <div className="text-[10px] text-[#e9bcb6]/70">9 Lineage Maps</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#70dc8e] font-bold">+3,410 pts</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-[#e9bcb6] font-bold w-4 text-center">3</span>
                      <img
                        className="w-8 h-8 rounded-full object-cover"
                        alt="@QuantumJonas"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKgq18in3cydeKhyKHfMdvmnOnSAj59K0EnvpZaVwM9Dt4nWOS5t3yDiecrX-wNcCXWWLBtQXZxwytTsfZRzK7OOqFmdyMqwVOPpq6ypat3jfrt5cyhIT_cIsH7UsMOoG-6uBA9RNd7mVrg7yP9O8MVu6blCCOiMauKg8KmGbiOo5L0hxrV4IQ6FSZ3JcFgzBJEe7Q8FYJry8QpC_RN34d2pamLkv5zn8D-Lh-_Wv9LsX7rmtHzjdYNw"
                      />
                      <div>
                        <div className="text-xs font-bold text-[#e5e2e1]">@QuantumJonas</div>
                        <div className="text-[10px] text-[#e9bcb6]/70">6 Paradox Solves</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#70dc8e] font-bold">+2,890 pts</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. FEATURED FAN REVIEWS (3-Column Layout)                                 */}
        {/* ========================================================================= */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div>
                <h2 className="text-2xl font-bold text-[#e5e2e1]">Featured Fan Reviews</h2>
                <p className="text-xs text-[#e9bcb6]/70">
                  Deep-dive critiques and verdicts from top community voices
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-[#201f1f] border border-[#353534]/50 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveReviewTab('week')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeReviewTab === 'week'
                    ? 'bg-[#353534] text-white shadow-sm'
                    : 'text-[#e9bcb6] hover:text-[#e5e2e1]'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setActiveReviewTab('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeReviewTab === 'all'
                    ? 'bg-[#353534] text-white shadow-sm'
                    : 'text-[#e9bcb6] hover:text-[#e5e2e1]'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setActiveReviewTab('helpful')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeReviewTab === 'helpful'
                    ? 'bg-[#353534] text-white shadow-sm'
                    : 'text-[#e9bcb6] hover:text-[#e5e2e1]'
                }`}
              >
                Most Helpful
              </button>
            </div>
          </div>

          {/* 3-Column Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Review Card 1 */}
            <article className="flex flex-col justify-between p-5 rounded-2xl bg-[#201f1f] hover:bg-[#252424] transition-all border border-[#353534] shadow-md">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-0.5 text-[#e50914]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[10px] font-semibold text-[#e9bcb6] border border-[#353534]/50">
                    Stranger Things S4
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#e5e2e1] mb-2 leading-snug">
                  "Kate Bush, heavy metal bravery, and horror perfected on a cinematic scale."
                </h3>
                <p className="text-xs text-[#e9bcb6]/85 line-clamp-4 mb-4 leading-relaxed">
                  The Duffer brothers managed to elevate childhood nostalgia into genuine cosmic dread. Max's sequence in 'Dear Billy' is not just television history; it is a masterclass in psychological editing and catharsis. The villain design of Vecna delivers on every promise.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#353534]/50">
                <div className="flex items-center gap-2.5">
                  <img
                    className="w-8 h-8 rounded-full object-cover"
                    alt="Marcus Thorne"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPydkwqWNN6tj9GbMhzG6uSNXj31_cdN0JwnwekGiWcHRAEgq4t6TIFl-5gn9E22QdEfwNU4In0__bICGcEaYJOHdqq9yZDm4ICgoIs3ZvdyXHYivvd06N-ZeA_YCEU3W4BnYb2-gFH_Cb1szUT4En-x9B2Eyn7gAzADXcZr1o9msSwtkjkauCiD06thQHjRZquLDDtx8c45nsn2nACKyTBQXxt-qsPe69SInQEOAWUNg6eaLuEqfffw"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#e5e2e1] flex items-center gap-1">
                      <span>Marcus Thorne</span>
                      <span className="material-symbols-outlined text-xs text-[#e50914]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <span className="text-[10px] text-[#ffb4aa]">Verified Critic</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#e9bcb6]/80">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">thumb_up</span> 1.2k
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">chat</span> 48
                  </span>
                </div>
              </div>
            </article>

            {/* Review Card 2 */}
            <article className="flex flex-col justify-between p-5 rounded-2xl bg-[#201f1f] hover:bg-[#252424] transition-all border border-[#353534] shadow-md">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-0.5 text-[#e50914]">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                    <span className="material-symbols-outlined text-base">star_half</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[10px] font-semibold text-[#e9bcb6] border border-[#353534]/50">
                    Severance S1
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#e5e2e1] mb-2 leading-snug">
                  "The sterile corporate cubicle transformed into an anxiety-fueled masterpiece."
                </h3>
                <p className="text-xs text-[#e9bcb6]/85 line-clamp-4 mb-4 leading-relaxed">
                  Every millimeter of set design reinforces the dread of Lumon Industries. The finale's cross-cutting between the 'Overtime Contingency' and Helly R.'s gala reveal is the most heart-stopping 40 minutes of pacing in the last ten years.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#353534]/50">
                <div className="flex items-center gap-2.5">
                  <img
                    className="w-8 h-8 rounded-full object-cover"
                    alt="Elena Vance"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQVXH9bYYzSxg3Z_qc4w8nwwvjLx-Tk2OWpH1rQ7IlhOsQjDtl1w37s7WbBiCEkuAMEazyC0h-QEkQrM7PJxZ1AtouFATa4dYX-LbV0GNqZrP519r35ptvw9FbJ4XCmkzeIoNcYVqqN7xhlg5HVPF5IcGb9RTIFmzFik59yprV8ivt_Rx2phN4D63lyVFR5nR0DdEav_b9e2AQhiXOi6yYeTkvr8JkA-FtwM077A6w3UFEAcf_niU1UQ"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#e5e2e1] flex items-center gap-1">
                      <span>Elena Vance</span>
                      <span className="material-symbols-outlined text-xs text-[#e50914]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <span className="text-[10px] text-[#70dc8e]">Top Theorist</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#e9bcb6]/80">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">thumb_up</span> 940
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">chat</span> 32
                  </span>
                </div>
              </div>
            </article>

            {/* Review Card 3 */}
            <article className="flex flex-col justify-between p-5 rounded-2xl bg-[#201f1f] hover:bg-[#252424] transition-all border border-[#353534] shadow-md">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-0.5 text-[#e50914]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[10px] font-semibold text-[#e9bcb6] border border-[#353534]/50">
                    Dark (All Seasons)
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#e5e2e1] mb-2 leading-snug">
                  "The only time-travel series to solve its own bootstrap paradox without cheating."
                </h3>
                <p className="text-xs text-[#e9bcb6]/85 line-clamp-4 mb-4 leading-relaxed">
                  Baran bo Odar and Jantje Friese achieved the impossible: 26 episodes across three cycles where no loose thread is forgotten. It demands pen, paper, and respect for the viewer's intelligence. Pure German existential tragedy at its peak.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#353534]/50">
                <div className="flex items-center gap-2.5">
                  <img
                    className="w-8 h-8 rounded-full object-cover"
                    alt="Felix Braun"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9YFtTH6sKEhdZolMtasTcmZcQIniwb23B6nHmvTtXIcMLzAzvudtRSGKKJMsiabMnXEFnKVkwHiiVvMnvhMjpWzHlvSoOdr80u0uaunqIsUk0E3ly4cpNWCY4R4GmgewtKEYl8QsVO7SJQs9GmSBH7-YUhS0xh_HfRTj7P5kRi8AJQBwEvHqBZKWP7cLBuwsgl1-51x8G8v8dAGC1iepT79qYkSaWF3x1jfpRw37KnnCPDVlrsxIdEA"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#e5e2e1] flex items-center gap-1">
                      <span>Felix Braun</span>
                      <span className="material-symbols-outlined text-xs text-[#e50914]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <span className="text-[10px] text-[#ffb4aa]">Verified Critic</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#e9bcb6]/80">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">thumb_up</span> 2.1k
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">chat</span> 114
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. COMMUNITY BANNER CALLOUT (LORE LABS / WATCH PARTY ANCHOR)              */}
        {/* ========================================================================= */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0e0e0e] via-[#201f1f] to-[#0e0e0e] p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border border-[#353534]">
            <div className="max-w-xl">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[#ffb4aa] font-extrabold mb-1 block">
                POPCHO LORE LABS
              </span>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#e5e2e1] mb-2">
                Host Your Own Watch Party or Deep-Dive Thread
              </h3>
              <p className="text-xs sm:text-sm text-[#e9bcb6]/80 leading-relaxed">
                Connect your streaming account, invite your squad, sync playback down to the exact millisecond, and share real-time spoiler-tagged reactions.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setNotificationToast?.('Watch Party Room creation initialized.')}
                className="px-6 py-3 rounded-xl bg-[#e50914] text-white font-bold text-xs sm:text-sm shadow-xl hover:bg-[#b2000d] transition-all cursor-pointer"
              >
                Create Watch Room
              </button>
              <button
                type="button"
                onClick={() => setNotificationToast?.('Guidelines: high-signal critique, no spoilers without masks.')}
                className="px-4 py-3 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] font-semibold text-xs sm:text-sm border border-[#353534] transition-all cursor-pointer"
              >
                Explore Guidelines
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
