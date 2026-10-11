import React, { useState, useMemo } from 'react';
import type { MediaItem, NormalizedTmdbReview } from '../services/tmdb/types';
import { getMediaReviews } from '../services/tmdb/reviews';

interface CommunityReviewsPageProps {
  onJoinHub?: (show: MediaItem) => void;
  onOpenGlobalReviewModal?: (show: MediaItem) => void;
  setNotificationToast?: (msg: string | null) => void;
}

interface EditorialReview {
  id: string;
  showTitle: string;
  categoryTag: string;
  mediaInfo: string;
  backdropUrl: string;
  posterUrl: string;
  authorUsername: string;
  authorBadge: string;
  authorReviewsCount: number;
  timeAgo: string;
  authorAvatar: string;
  score: number; // e.g. 5.0
  essayType: string;
  hasSpoilerWarning?: boolean;
  headline: string;
  body: string;
  helpfulCount: number;
  responsesCount: number;
  isHelpfulLiked?: boolean;
  isBookmarked?: boolean;
}

const INITIAL_EDITORIAL_REVIEWS: EditorialReview[] = [
  {
    id: 'rev-st4-piggyback',
    showTitle: 'Stranger Things Season 4 Finale: The Piggyback',
    categoryTag: 'Season Finale',
    mediaInfo: 'Runtime: 2h 22m • Directed by The Duffer Brothers',
    backdropUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuApDQ7TFf3DBvc9ibvLt0RdmPYfvwFLeLc2TE7giEDU8eJL5GL9PizUh-qU6uyCWZfcXuMR-JTMB5s9l5RpRYVON6o_s0Oxc9y9xY9tA2ddbUkmPgoAVUcQXWIAljYmpV7nun5tZ7ddLuPmb-MvW8k6bX4zat97-A-WNSrcfMkL5hDdv_ygzYv5T2Krw8xZegttsPkI4ajzQqo4SmvqsGhhyZ5Vi_q-eo-rF8szgsoJTa8dxHYvnvS4GA',
    posterUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuALOOenzh4FUHGIbldx-m8kJ3JWHFcvVMI1dvfAZW8iJpAvgo_oZXgi4xpVP5FW7hIj-qXPzBcpasUTDCC7odoHD-QLKM20OIGdBdA_z5qP4DQAQWrDg_TD_CtTJtdTAkbQDaQl7w913H-V4doyUok8kINxvPXtVwFEc7uHhysvbANrNQ4yUSsr-pjgEmGNhH6bPX3g8twF-ywUP-hoajCpexDDphKdTjJKARizDMPUp7R_bEZ2K94BnA',
    authorUsername: '@CinemaSavant',
    authorBadge: 'Verified Critic',
    authorReviewsCount: 420,
    timeAgo: '4 days ago',
    authorAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDLECa6t3nqVHYo_JxkppetrHeia4uCLqDuUYallSuEjPjOYIs-SHJYSLWN0GlJgvmkCYQ5ZTrj281JGC0zNR0u2UCBtPBvLK0DsrqFHmnymJBwGnIHmPafQ3F9EuUKzCLmD3-AlqhrfpAM3YABIFoDVd_pplXCUEBM-QknBJ6F94tO5Ld2wil4xeoqp1wiNb8uJsHEO-d2ycs4pEosbmtk2u7uoby4dOqugtA4upqRp_HscSzC5rNC9Q',
    score: 5.0,
    essayType: 'Comprehensive Essay',
    headline: 'Masterclass in Tension: How Eddie Munson Transcended Typical Supporting Character Tropes',
    body: "The Duffer Brothers took a massive gamble dedicating the penultimate emotional crescendo of an 80-million-dollar episode to a guitar solo in a hellscape. But what makes Munson's arc resonate isn't just the sheer spectacle of Metallica's Master of Puppets—it's the thematic reconciliation of cowardice and atonement. When Eddie cuts the rope and stays behind, the script delivers on four hours of foundational character guilt with unrelenting, heart-wrenching visual bravura.",
    helpfulCount: 842,
    responsesCount: 128,
  },
  {
    id: 'rev-dark-retrospective',
    showTitle: 'Dark (All 3 Seasons Review)',
    categoryTag: 'Full Series Retrospective',
    mediaInfo: '26 Episodes • Baran bo Odar & Jantje Friese',
    backdropUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBtoUdq5rQMmQUYTnVKAXcAQkpyetrf9NyZc6PHYEsG3c6UWzGomcbRuHcqkbpFyNHxphjyv03xm0gjKneO8_zsoCk21nRxtrHixTIZq0a_p5TQR_5C5N9ywVXPKE7tKZT9EsKnWbAoYsbQMxW4svA_yTNOS8gil0zIue_mxuBjvgOMUgNFuIrxFHFOmrVT-eBY-uHjj39yQ01Sxo0wN5l_qN_5tt6U91zWocSYpLlY3ef_psWS5REzPw',
    posterUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCTfYlUiAx2LX7m-U_LY20io88yzKt85t3gB240IX3HLL0yYny_CQiGFXQ1kisP_2gkE-6INmzJMoH4TIG1ugH0NoBGMbQnAPStcBty8ZN1d4bWqFAvvs2E4TBjOfxMya9NiwDom2XnqCpBKCUkKLy3AujvooW0byevLwTGhgBa60Il6assAOmjUPOgHkXZFi8Z0CWk5sZluANyLuhos-jz8t04zoeNz1o3OrqwWV5SESYH1MswGPHi0Q',
    authorUsername: '@QuantumTrope',
    authorBadge: 'Top Contributor',
    authorReviewsCount: 188,
    timeAgo: '1 week ago',
    authorAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBJVWOuWRnhlEhHtbftQK1ANXBeqAOT8BzWT2YbELmqh4u5fGV6RnPx1-iJlGBs4DgVyjsgvbs0vTGullcxU0GlPmHciwaXpWpkztT_TlJjUuLDo-o5RBZsHNcm1vWYcz2AG4_1-3YQ1jc696VAEXiOkueGHWA1imojDq2k2fRqeJf02BIvcH5QBfNwk8zUKMA6BiVOnNMljlbEzd_V7csh7AMm3O2XH3oMq5LtgkfdVHrsL9OZqQk-WA',
    score: 5.0,
    essayType: 'Season Retrospective',
    hasSpoilerWarning: true,
    headline: 'The Most Airtight Time-Travel Narrative Ever Committed to Screen',
    body: "German television crafted something unprecedented: a puzzle box where every single gear genuinely connects. The finale doesn't cheat with magical retcons or hand-waving paradoxes; rather, it adheres with ruthless mathematical elegance to the causal loops built from the very first hour. The heartbreak of Jonas and Martha realizing their existence is the error itself is executed with staggering philosophical weight.",
    helpfulCount: 1420,
    responsesCount: 215,
  },
  {
    id: 'rev-squid-game-s1',
    showTitle: 'Squid Game Season 1',
    categoryTag: 'Season 1 Critique',
    mediaInfo: '9 Episodes • Hwang Dong-hyuk',
    backdropUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDTfqE3IxYvoIInlhhQV1R33qQF3DDWCZYBM8thpCOpOXzexpQRGZaa36SplAgmUfV2PW2CsxDPvxlq1ygkYRCybCg3mdd01oE850q-dksWJXl_xdKRKue7b64qWiq6Jr4ujK_Flfnd-vVPZP3M2Y_aopl1BzfBfJjkzxZYLK48Llr2qFgYOhZMobJghFv90Q_aYxDaOxoGefh-3GagQBhA2Vv821qHEow66pRpKBcZG_wMAvCwSV3JSA',
    posterUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCf1waszBNspDsu-LUaNFGURzIFcvzwRNbwuZH8N7I8LMHbRvXka2CbEWIiK-5mgqGfTeBNSOjvKZJZP6qo9oDpcBLFDehtKfjGmYY0oKpif6tnS0byfvyZsGZSxFgFkHxUXhsp-c9wu_WG8E7eHkmTmMxu8pGnPzHqdV_mSYgaWYsO_JwQFTTZOD4_-uS1wZtWTMVdZz549y_IS45loMQs9I45b_a1YUtgOtI3elQrK-PzKCnj9WmZ9A',
    authorUsername: '@SeoulScreenplay',
    authorBadge: 'Critic',
    authorReviewsCount: 94,
    timeAgo: '2 weeks ago',
    authorAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCW6Vh14iZi8Mg2nabYkw0Zg71UiP4mCjT01HSpYadXY31So1IBbXKjzVE4FCW6MY6GBe3ImGj6RFTpLVwZMIcStAMiIpZycUuOpx35Lp2AGBns0d8UrKuLleWT-lTz22Cxen6nybkuVTEa3YmgYx3kMzQpSN8OD3lV7vi0CG9zz7I6ppo6yHWubpMN5cu091DAnowsY6iNrSA00iywBNCQc0Ha0aChoe_HxnzNP3pdtHkvxs3jLVDnBQ',
    score: 4.5,
    essayType: 'Sociological Reading',
    headline: 'Capitalism, Marble Games, and the Anatomy of Despair',
    body: 'Episode 6, "Gganbu," remains the emotional high-water mark of contemporary television. By forcing characters into voluntary zero-sum games where the currency is human betrayal, director Hwang exposes the dehumanizing calculus of desperation. While the VIP segment slightly falters with clumsy foreign dialogue, the tragic domestic poetry of Sang-woo and Gi-hun endures.',
    helpfulCount: 975,
    responsesCount: 89,
  },
];

const FILTER_TAGS = [
  'All Reviews',
  '★ 5-Star Masterpieces',
  'Most Helpful',
  'Season Finales',
  'Controversial Takes',
];

export const CommunityReviewsPage: React.FC<CommunityReviewsPageProps> = ({
  setNotificationToast,
}) => {
  const [reviews, setReviews] = useState<EditorialReview[]>(INITIAL_EDITORIAL_REVIEWS);
  const [activeFilter, setActiveFilter] = useState('All Reviews');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBodies, setExpandedBodies] = useState<Record<string, boolean>>({});

  // Composer Modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerShowTitle, setComposerShowTitle] = useState('');
  const [composerRating, setComposerRating] = useState(5.0);
  const [composerEssayType, setComposerEssayType] = useState('Comprehensive Analysis');
  const [composerHeadline, setComposerHeadline] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerSpoiler, setComposerSpoiler] = useState(false);

  // Live TMDB Title Review Inspector Modal / Drawer
  const [tmdbLookupId, setTmdbLookupId] = useState('');
  const [tmdbMediaType, setTmdbMediaType] = useState<'tv' | 'movie'>('tv');
  const [liveTmdbReviews, setLiveTmdbReviews] = useState<NormalizedTmdbReview[] | null>(null);
  const [loadingTmdb, setLoadingTmdb] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.showTitle.toLowerCase().includes(q) ||
          r.headline.toLowerCase().includes(q) ||
          r.authorUsername.toLowerCase().includes(q) ||
          r.body.toLowerCase().includes(q)
      );
    }

    if (activeFilter === '★ 5-Star Masterpieces') {
      result = result.filter((r) => r.score >= 5.0);
    } else if (activeFilter === 'Most Helpful') {
      result.sort((a, b) => b.helpfulCount - a.helpfulCount);
    } else if (activeFilter === 'Season Finales') {
      result = result.filter((r) => r.categoryTag.toLowerCase().includes('finale'));
    } else if (activeFilter === 'Controversial Takes') {
      result = result.filter((r) => r.score <= 4.0 || r.hasSpoilerWarning);
    }

    return result;
  }, [reviews, searchQuery, activeFilter]);

  // Toggle helpful like
  const handleToggleHelpful = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextLiked = !r.isHelpfulLiked;
          return {
            ...r,
            isHelpfulLiked: nextLiked,
            helpfulCount: nextLiked ? r.helpfulCount + 1 : r.helpfulCount - 1,
          };
        }
        return r;
      })
    );
  };

  // Toggle bookmark
  const handleToggleBookmark = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isBookmarked: !r.isBookmarked } : r))
    );
    setNotificationToast?.('Review bookmark updated.');
  };

  // Handle submit review
  const handlePublishReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerShowTitle.trim() || !composerHeadline.trim()) {
      alert('Please provide a show title and review headline.');
      return;
    }

    const newRev: EditorialReview = {
      id: `user-rev-${Date.now()}`,
      showTitle: composerShowTitle.trim(),
      categoryTag: composerEssayType,
      mediaInfo: 'PopCho Community Submission',
      backdropUrl:
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      posterUrl:
        'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=400&q=80',
      authorUsername: '@DustinTheorist',
      authorBadge: 'Community Critic',
      authorReviewsCount: 1,
      timeAgo: 'Just now',
      authorAvatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw',
      score: composerRating,
      essayType: composerEssayType,
      hasSpoilerWarning: composerSpoiler,
      headline: composerHeadline.trim(),
      body: composerBody.trim() || 'No additional commentary provided.',
      helpfulCount: 1,
      responsesCount: 0,
      isHelpfulLiked: true,
    };

    setReviews((prev) => [newRev, ...prev]);
    setIsComposerOpen(false);
    setComposerShowTitle('');
    setComposerHeadline('');
    setComposerBody('');
    setNotificationToast?.('Your critical deep dive has been published to PopCho!');
  };

  // Fetch live TMDB reviews for specific show
  const handleFetchTmdbReviews = async (id: string, type: 'tv' | 'movie') => {
    if (!id.trim()) return;
    setLoadingTmdb(true);
    setTmdbError(null);
    try {
      const data = await getMediaReviews(id, type);
      setLiveTmdbReviews(data.results);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch TMDB reviews';
      setTmdbError(errorMsg);
    } finally {
      setLoadingTmdb(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#131313] text-[#e5e2e1]">
      {/* Hero & Filter Stage */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#1c1b1b] via-[#131313] to-[#131313] pb-6 px-4 sm:px-6 lg:px-8">
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto pt-6">
          {/* Breadcrumb & Overline */}
          <div className="flex items-center gap-2 text-[#e9bcb6] text-xs font-semibold mb-2">
            <span className="hover:text-[#e5e2e1] cursor-pointer">POPCHO</span>
            <span>/</span>
            <span className="text-[#e50914] font-bold">CRITIQUE CORPS</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#008442] ml-1" />
            <span className="text-[#e9bcb6]/80 text-xs">Live Critic Index</span>
          </div>

          {/* Main Headline Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#e5e2e1] tracking-tight">
                Community Reviews &amp; Deep Dives
              </h1>
              <p className="text-sm sm:text-base text-[#e9bcb6] mt-1.5 max-w-2xl leading-relaxed">
                Unfiltered, passionate critical analysis and essays written by television lovers, not algorithms.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white font-bold text-sm shadow-lg shadow-[#e50914]/25 transition-all hover:scale-[1.02] active:scale-[0.98] self-start lg:self-auto shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">edit_square</span>
              <span>+ Write a Review</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-[#201f1f] p-2.5 rounded-2xl flex flex-col md:flex-row items-center gap-3 border border-[#353534]">
            <div className="relative w-full md:flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#e9bcb6]/60 text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews by show, author, or keyword..."
                className="w-full h-10 pl-10 pr-4 bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/60 text-xs sm:text-sm rounded-xl focus:outline-none border border-[#353534]/50 focus:border-[#e50914]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {FILTER_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveFilter(tag)}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    activeFilter === tag
                      ? 'bg-[#e50914] text-white shadow-md'
                      : 'bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#353534]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Feed & Sidebar Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left/Main Feed (lg:col-span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Live TMDB Quick Inspector Callout */}
            <div className="p-4 rounded-2xl bg-[#201f1f] border border-[#353534] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#e50914]/20 text-[#e50914] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">sync_saved_locally</span>
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#e5e2e1]">Inspect Live TMDB Reviews</h4>
                  <p className="text-[11px] text-[#e9bcb6]/70">Query verified international reviews directly from TMDB API</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="e.g. 1396 (Breaking Bad)"
                  value={tmdbLookupId}
                  onChange={(e) => setTmdbLookupId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[#0e0e0e] text-[#e5e2e1] rounded-lg border border-[#353534] w-full sm:w-44 focus:outline-none"
                />
                <select
                  value={tmdbMediaType}
                  onChange={(e) => setTmdbMediaType(e.target.value as 'tv' | 'movie')}
                  className="px-2 py-1.5 text-xs bg-[#0e0e0e] text-[#e5e2e1] rounded-lg border border-[#353534] focus:outline-none cursor-pointer"
                >
                  <option value="tv">TV</option>
                  <option value="movie">Movie</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleFetchTmdbReviews(tmdbLookupId, tmdbMediaType)}
                  className="px-3 py-1.5 rounded-lg bg-[#e50914] text-white text-xs font-bold hover:bg-[#b2000d] shrink-0"
                >
                  Fetch
                </button>
              </div>
            </div>

            {/* Display Live TMDB Inspected Reviews if loaded */}
            {loadingTmdb && (
              <div className="p-6 rounded-2xl bg-[#201f1f] border border-[#353534] text-center flex items-center justify-center gap-2 text-xs text-[#e9bcb6]">
                <span className="material-symbols-outlined text-sm animate-spin text-[#e50914]">progress_activity</span>
                <span>Fetching reviews from TMDB secure backend proxy…</span>
              </div>
            )}

            {tmdbError && (
              <div className="p-4 rounded-2xl bg-[#93000a]/20 border border-[#93000a]/40 text-xs text-[#ffb4ab] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{tmdbError}</span>
              </div>
            )}

            {liveTmdbReviews !== null && (
              <div className="p-5 rounded-2xl bg-[#201f1f] border border-[#e50914]/40 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#353534] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#e50914] text-white text-[10px] font-bold">TMDB LIVE RESULT</span>
                    <span className="text-xs font-bold text-[#e5e2e1]">{liveTmdbReviews.length} Verified Reviews</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLiveTmdbReviews(null)}
                    className="text-xs text-[#e9bcb6] hover:text-white"
                  >
                    Close
                  </button>
                </div>

                {liveTmdbReviews.length === 0 ? (
                  <p className="text-xs text-[#e9bcb6]/70">No reviews found for ID {tmdbLookupId}.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {liveTmdbReviews.slice(0, 3).map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-[#131313] border border-[#353534] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#e5e2e1]">@{r.author}</span>
                          <span className="text-[#e50914] font-bold">
                            {r.rating !== null ? `${r.rating} / 10` : 'Unrated'}
                          </span>
                        </div>
                        <p className="text-xs text-[#e9bcb6]/80 line-clamp-3 leading-relaxed">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Editorial Review Cards */}
            {filteredReviews.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-[#201f1f] rounded-2xl border border-[#353534]">
                <span className="material-symbols-outlined text-5xl text-[#e50914]">rate_review</span>
                <h3 className="text-xl font-bold text-[#e5e2e1]">No Critical Reviews Found</h3>
                <p className="text-sm text-[#e9bcb6]/70 max-w-md">
                  No essays found matching your current filter. Be the first to publish a deep dive!
                </p>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(true)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#e50914] text-white text-xs font-bold"
                >
                  + Write a Deep Dive
                </button>
              </div>
            ) : (
              filteredReviews.map((rev) => {
                const isExpanded = Boolean(expandedBodies[rev.id]);

                return (
                  <article
                    key={rev.id}
                    className="bg-[#201f1f] rounded-2xl overflow-hidden hover:bg-[#252424] transition-colors border border-[#353534] group shadow-lg"
                  >
                    {/* Card Hero / Show Backdrop Banner with Poster Overlap */}
                    <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-[#0e0e0e]">
                      <div
                        className="bg-cover bg-center w-full h-full transform group-hover:scale-105 transition-transform duration-700"
                        style={{ backgroundImage: `url('${rev.backdropUrl}')` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-[#201f1f]/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-transparent to-transparent" />

                      {/* Poster Inset & Media Info */}
                      <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3 sm:gap-4">
                        <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 shadow-2xl bg-[#0e0e0e] border border-[#353534]">
                          <img
                            src={rev.posterUrl}
                            alt={rev.showTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#e50914]/25 text-[#ffb4aa] uppercase tracking-wider mb-1 border border-[#e50914]/30">
                            {rev.categoryTag}
                          </span>
                          <h2 className="text-base sm:text-lg font-bold text-[#e5e2e1] truncate">
                            {rev.showTitle}
                          </h2>
                          <p className="text-xs text-[#e9bcb6]/80">{rev.mediaInfo}</p>
                        </div>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-4 sm:p-6 pt-3 sm:pt-4 flex flex-col gap-3">
                      {/* Author Meta & Ratings Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[#353534]/50">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={rev.authorAvatar}
                              alt={rev.authorUsername}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-[#353534]"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#008442] ring-2 ring-[#201f1f]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-[#e5e2e1]">
                                {rev.authorUsername}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#353534] text-[#ffb4aa] font-bold">
                                {rev.authorBadge}
                              </span>
                            </div>
                            <div className="text-xs text-[#e9bcb6]/70">
                              {rev.authorReviewsCount} reviews • {rev.timeAgo}
                            </div>
                          </div>
                        </div>

                        {/* Rating Badge & Essay Type */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 text-[#e50914]">
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                              star
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[#e5e2e1] ml-0.5">
                              {rev.score.toFixed(1)} / 5.0
                            </span>
                          </div>
                          {rev.hasSpoilerWarning ? (
                            <span className="px-2 py-0.5 rounded-lg bg-[#b2000d]/30 text-[#ffbdb5] text-[10px] font-bold flex items-center gap-1 border border-[#b2000d]/40">
                              <span className="material-symbols-outlined text-xs">warning</span>
                              [SPOILERS]
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-[#2a2a2a] text-[#e9bcb6] text-[10px] font-semibold">
                              {rev.essayType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Headline */}
                      <h3 className="text-base sm:text-xl font-bold text-[#e5e2e1] group-hover:text-[#ffb4aa] transition-colors">
                        {rev.headline}
                      </h3>

                      {/* Body Paragraph */}
                      <p className={`text-xs sm:text-sm text-[#e9bcb6]/90 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
                        {rev.body}
                      </p>

                      {rev.body.length > 200 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedBodies((prev) => ({ ...prev, [rev.id]: !prev[rev.id] }))
                          }
                          className="text-xs text-[#e50914] hover:underline font-semibold self-start -mt-1 cursor-pointer"
                        >
                          {isExpanded ? 'Show less' : 'Read full essay'}
                        </button>
                      )}

                      {/* Interaction Bar */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#353534]/40 mt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleHelpful(rev.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              rev.isHelpfulLiked
                                ? 'bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/30'
                                : 'bg-[#2a2a2a] hover:bg-[#353534] text-[#e9bcb6] hover:text-[#e5e2e1]'
                            }`}
                          >
                            <span
                              className="material-symbols-outlined text-base"
                              style={{ fontVariationSettings: rev.isHelpfulLiked ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              thumb_up
                            </span>
                            <span>{rev.helpfulCount.toLocaleString()} Found Helpful</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNotificationToast?.(`Loaded ${rev.responsesCount} fan comments.`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e9bcb6] hover:text-[#e5e2e1] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">forum</span>
                            <span>{rev.responsesCount} Fan Responses</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(rev.id)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              rev.isBookmarked
                                ? 'text-[#e50914] bg-[#e50914]/15'
                                : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
                            }`}
                            title="Bookmark review"
                          >
                            <span className="material-symbols-outlined text-base">
                              {rev.isBookmarked ? 'bookmark_added' : 'bookmark'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(window.location.href);
                              setNotificationToast?.('Critique link copied to clipboard!');
                            }}
                            className="p-2 rounded-xl text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                            title="Share critique"
                          >
                            <span className="material-symbols-outlined text-base">share</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Right Sidebar (lg:col-span-4) */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* 'Write Your Take' Card */}
            <div className="bg-gradient-to-br from-[#201f1f] to-[#2a2a2a] p-5 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden border border-[#353534]">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#e50914]/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#e50914] text-2xl">movie_edit</span>
                <span className="text-xs uppercase tracking-wider text-[#ffb4aa] font-bold">
                  Your Perspective Matters
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#e5e2e1] mb-1">Watched something recently?</h3>
              <p className="text-xs text-[#e9bcb6]/80 mb-4 leading-relaxed">
                Your community wants your verdict. Skip the studio review fluff—craft real, deep thematic analysis.
              </p>
              <button
                type="button"
                onClick={() => setIsComposerOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add_comment</span>
                <span>Write Your Take Now</span>
              </button>
            </div>

            {/* Top Critics Leaderboard */}
            <div className="bg-[#201f1f] p-5 rounded-2xl border border-[#353534] shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#e50914] text-xl">workspace_premium</span>
                  <h3 className="text-sm font-bold text-[#e5e2e1]">Top Critics of the Month</h3>
                </div>
                <span className="text-[10px] text-[#e9bcb6]/70 uppercase tracking-wider font-semibold">
                  MARCH '25
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {/* Critic 1 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#e50914] font-bold w-4 text-center">1</span>
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRDBmI_fkyXxgcEqNhtOnCV40d7g0bewd1BAGcH-Q_o-PcKEJJYHKcodmqf-qgv1Mukj1cuvOMwMPblObXaLZJPNKgXA5KQgEZwUe6t09tVzhja8AoefNtpBwlbtMazY3mNHgIdQguWwZeOH7w_LHZY7CudNG7ICkDgouKhuDZa1uEJl1s_nSoPibxavPZkJSH8U6GZSLHe3GyE_W-e54aaGUTl1Zw9orgkqntDByeuf6g0ZtCuhKCpw"
                      alt="@CinemaSavant"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#e5e2e1]">@CinemaSavant</h4>
                      <p className="text-[11px] text-[#e9bcb6]/70">14.8k followers • 420 reviews</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#e50914]/20 text-[#ffb4aa] font-bold">
                    Legend
                  </span>
                </div>

                {/* Critic 2 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#e9bcb6] font-bold w-4 text-center">2</span>
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_IyoF8333XUFPw-KjHSPH3a2tqxJmrobAVHFZtw-U5t3HkkURQRjm-ZhMcy3v5FpCOPVE36F_lZ1nn-LYgv0jfuVXXsqzAGzAcGtt23mbKlQbou3RoAzJz_NAg3jsnGfwWfItf-Q2gfgxegiMJpwq5zxKWzNhL7ai9ZixR0R7nDmRn8gi-6GyNohGseIt0Ihwloz3k-kZUjm83L9kUl7qLgrvidzHZrN4gUtbxXjfX8GJ2NYW7OEGPw"
                      alt="@QuantumTrope"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#e5e2e1]">@QuantumTrope</h4>
                      <p className="text-[11px] text-[#e9bcb6]/70">9.2k followers • 188 reviews</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#353534] text-[#e5e2e1] font-bold">
                    Master
                  </span>
                </div>

                {/* Critic 3 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#e9bcb6] font-bold w-4 text-center">3</span>
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxGF0ASCnWqT_AZJpoja4TgEQY1d-Md8EUJyj6NN1S7QxwjAKk2ZcyyF8RAoD7oMWXyrcW8P6ArinAno3o67AKVXG7do74a1TceHSLU5I2qZysSOrQ-QOu8qQ3rHnehgxPbShFMJ4P57w2HZJ1z9uK3prH8OgEWetPkbGEpMU0Guv_y4X3FzOsmlFb5q_q7f81zHwkpG7c3y2sUMPXd3uOj4Shgi3Ci4vVnVw0f5x_tzuLqUqR6Jro_g"
                      alt="@SeveredMind"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#e5e2e1]">@SeveredMind</h4>
                      <p className="text-[11px] text-[#e9bcb6]/70">6.4k followers • 94 reviews</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#353534] text-[#e5e2e1] font-bold">
                    Rising
                  </span>
                </div>

                {/* Critic 4 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#e9bcb6] font-bold w-4 text-center">4</span>
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMx67Ex8xs2w9CUFnZKWbJtmLy76dLcedDBOyZ7kpp7V-q6W94SS2nOJ15VjDveoi5KmI3qAg8GUeeosS8QYk9IXYjHb6TB7vQNS1OjECY6lj00LH71MjE_wOPT9m3N8tBTn35QtmqabkxzF1Jas5yNNkD5KQRLqh10_Sjoos9qzmThkhyDaO4qxaXZU9Vkr_ccspTZ21rz3pDbA4vCOP6zoCDahgaDKJcOh5vpcWhEoagTqleCxUX9Q"
                      alt="@WesterosChronicle"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#e5e2e1]">@WesterosChronicle</h4>
                      <p className="text-[11px] text-[#e9bcb6]/70">5.1k followers • 312 reviews</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#353534] text-[#e5e2e1] font-bold">
                    Veteran
                  </span>
                </div>
              </div>
            </div>

            {/* Trending Review Discussions */}
            <div className="bg-[#201f1f] p-5 rounded-2xl border border-[#353534] shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#e50914] text-xl">trending_up</span>
                <h3 className="text-sm font-bold text-[#e5e2e1]">Trending Discussions</h3>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="p-3 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                  <span className="text-[10px] text-[#ffb4aa] uppercase font-bold tracking-wider">
                    Severance S2 Speculation
                  </span>
                  <h4 className="text-xs font-bold text-[#e5e2e1] mt-0.5">
                    Is Lumon Industries actually harvesting emotional temperaments?
                  </h4>
                  <p className="text-[11px] text-[#e9bcb6]/70 mt-1">340 active comments • 18 theories</p>
                </div>

                <div className="p-3 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                  <span className="text-[10px] text-[#ffb4aa] uppercase font-bold tracking-wider">
                    The Last of Us S2
                  </span>
                  <h4 className="text-xs font-bold text-[#e5e2e1] mt-0.5">
                    Adapting Part II: The challenge of non-linear perspective shifts
                  </h4>
                  <p className="text-[11px] text-[#e9bcb6]/70 mt-1">512 active comments • 42 debates</p>
                </div>

                <div className="p-3 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                  <span className="text-[10px] text-[#ffb4aa] uppercase font-bold tracking-wider">
                    The Bear S3
                  </span>
                  <h4 className="text-xs font-bold text-[#e5e2e1] mt-0.5">
                    Was 'Doors' a stylistic pinnacle or narrative standstill?
                  </h4>
                  <p className="text-[11px] text-[#e9bcb6]/70 mt-1">198 active comments • 6 essays</p>
                </div>
              </div>
            </div>

            {/* Review Guidelines */}
            <div className="bg-[#201f1f] p-5 rounded-2xl border border-[#353534] shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#e9bcb6] text-xl">policy</span>
                <h3 className="text-sm font-bold text-[#e5e2e1]">Community Guidelines</h3>
              </div>
              <p className="text-xs text-[#e9bcb6]/80 mb-3">
                We value high-signal critique over short reaction clips.
              </p>
              <ol className="space-y-2 text-xs text-[#e5e2e1]">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#e50914]">1.</span>
                  <span>
                    <strong className="text-white">Tag spoilers responsibly:</strong> Always flag twists and finales to protect fresh viewer experiences.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#e50914]">2.</span>
                  <span>
                    <strong className="text-white">Respect differing opinions:</strong> Critique the writing, cinematography, and performance—never fellow fans.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#e50914]">3.</span>
                  <span>
                    <strong className="text-white">Detailed analysis rewarded:</strong> Long-form substantive essays earn verified Critic Badges and leaderboard rank.
                  </span>
                </li>
              </ol>
            </div>
          </aside>
        </div>
      </section>

      {/* Interactive Write Review Composer Modal (Stitch Accurate) */}
      {isComposerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-2xl bg-[#201f1f] rounded-2xl border border-[#353534] shadow-2xl p-6 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#353534]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#e50914] text-2xl">rate_review</span>
                <div>
                  <h3 className="text-lg font-bold text-[#e5e2e1]">Publish Critical Deep Dive</h3>
                  <p className="text-xs text-[#e9bcb6]/70">Contribute authentic fan criticism to the PopCho archive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="p-1.5 rounded-lg text-[#e9bcb6] hover:text-white hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePublishReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#e9bcb6] mb-1">
                  Target Show, Season, or Episode
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#e9bcb6]/60 text-sm">
                    tv
                  </span>
                  <input
                    type="text"
                    required
                    value={composerShowTitle}
                    onChange={(e) => setComposerShowTitle(e.target.value)}
                    placeholder="e.g. Severance Season 1 Finale or Arcane S2..."
                    className="w-full bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#353534] focus:outline-none focus:border-[#e50914]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#e9bcb6] mb-1">Star Score</label>
                  <div className="flex items-center gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setComposerRating(starVal)}
                        className="text-[#e50914] hover:scale-110 transition-transform cursor-pointer"
                      >
                        <span
                          className="material-symbols-outlined text-2xl"
                          style={{
                            fontVariationSettings: starVal <= composerRating ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                    <span className="text-xs font-bold text-[#ffb4aa] ml-2">
                      {composerRating.toFixed(1)} / 5.0
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#e9bcb6] mb-1">Essay Type</label>
                  <select
                    value={composerEssayType}
                    onChange={(e) => setComposerEssayType(e.target.value)}
                    className="w-full bg-[#0e0e0e] text-[#e5e2e1] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-[#353534] focus:outline-none cursor-pointer"
                  >
                    <option>Comprehensive Analysis</option>
                    <option>Thematic Breakdown</option>
                    <option>Season Retrospective</option>
                    <option>Quick Verdict</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e9bcb6] mb-1">Review Headline</label>
                <input
                  type="text"
                  required
                  value={composerHeadline}
                  onChange={(e) => setComposerHeadline(e.target.value)}
                  placeholder="A sharp, hook-driven thesis statement..."
                  className="w-full bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-[#353534] focus:outline-none focus:border-[#e50914]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e9bcb6] mb-1">Full Critical Text</label>
                <textarea
                  required
                  rows={5}
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value)}
                  placeholder="Elaborate on lighting, screenplay pacing, subtext, character arcs, and thematic conclusions..."
                  className="w-full bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs sm:text-sm px-4 py-3 rounded-xl border border-[#353534] focus:outline-none focus:border-[#e50914] resize-none"
                />
              </div>

              <div className="flex items-center gap-2.5 bg-[#1c1b1b] p-3 rounded-xl border border-[#353534]/50">
                <input
                  type="checkbox"
                  id="composer-spoiler"
                  checked={composerSpoiler}
                  onChange={(e) => setComposerSpoiler(e.target.checked)}
                  className="w-4 h-4 rounded text-[#e50914] bg-[#0e0e0e] border-[#353534] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="composer-spoiler" className="text-xs text-[#e5e2e1] cursor-pointer select-none">
                  Flag this review as containing spoilers for specific plot revelations
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Publish Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
