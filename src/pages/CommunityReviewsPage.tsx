import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { MediaItem, NormalizedTmdbReview } from '../services/tmdb/types';
import { getImageUrl, DEFAULT_POSTER, DEFAULT_BACKDROP } from '../services/tmdb/client';
import { getMediaReviews } from '../services/tmdb/reviews';
import { getTvShowDetails } from '../services/tmdb/tv';
import { getMovieDetails } from '../services/tmdb/movies';
import { searchMedia } from '../services/tmdb/search';
import {
  listPopchoReviews,
  createPopchoReview,
  toggleReviewHelpful,
  toggleReviewBookmark,
  getTopCritics,
  listReviewComments,
  postReviewComment,
  type PopchoReview,
  type CriticRanking,
  type ReviewCommentItem,
} from '../services/review/api';
import { useAuth } from '../contexts/AuthContext';

interface CommunityReviewsPageProps {
  onJoinHub?: (show: MediaItem) => void;
  onOpenGlobalReviewModal?: (show: MediaItem) => void;
  setNotificationToast?: (msg: string | null) => void;
}

const FILTER_TAGS = [
  'All Reviews',
  '★ 5-Star Masterpieces',
  'Most Helpful',
  'Season Finales',
  'Controversial Takes',
];

function formatTimeAgo(isoDate: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `${diffWeeks}w ago`;
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export const CommunityReviewsPage: React.FC<CommunityReviewsPageProps> = ({
  setNotificationToast,
}) => {
  const { user, openAuthModal } = useAuth();

  // Reviews state from real PostgreSQL backend
  const [reviews, setReviews] = useState<PopchoReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewLoadError, setReviewLoadError] = useState<string | null>(null);

  // Filter & Search state
  const [activeFilter, setActiveFilter] = useState('All Reviews');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBodies, setExpandedBodies] = useState<Record<string, boolean>>({});

  // Real Top Critics Leaderboard state
  const [topCritics, setTopCritics] = useState<CriticRanking[]>([]);
  const [loadingCritics, setLoadingCritics] = useState(false);

  // Active Comments Drawer state per review
  const [activeCommentReviewId, setActiveCommentReviewId] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState<Record<string, ReviewCommentItem[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});

  // Review Composer Modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerShowTitle, setComposerShowTitle] = useState('');
  const [composerTmdbId, setComposerTmdbId] = useState<number | null>(null);
  const [composerMediaType, setComposerMediaType] = useState<'tv' | 'movie'>('tv');
  const [composerPoster, setComposerPoster] = useState<string | null>(null);
  const [composerBackdrop, setComposerBackdrop] = useState<string | null>(null);
  const [composerRating, setComposerRating] = useState(5.0);
  const [composerEssayType, setComposerEssayType] = useState('Comprehensive Analysis');
  const [composerHeadline, setComposerHeadline] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerSpoiler, setComposerSpoiler] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Show Search Suggestion state in Composer
  const [showSearchSuggestions, setShowSearchSuggestions] = useState<MediaItem[]>([]);
  const [isSearchingShows, setIsSearchingShows] = useState(false);
  const [showSuggestionsOpen, setShowSuggestionsOpen] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [searchShowsError, setSearchShowsError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSequenceRef = useRef<number>(0);
  const searchCacheRef = useRef<Map<string, MediaItem[]>>(new Map());

  // Live TMDB Title Review Inspector state
  const [tmdbLookupId, setTmdbLookupId] = useState('');
  const [tmdbMediaType, setTmdbMediaType] = useState<'tv' | 'movie'>('tv');
  const [liveTmdbShow, setLiveTmdbShow] = useState<MediaItem | null>(null);
  const [liveTmdbReviews, setLiveTmdbReviews] = useState<NormalizedTmdbReview[] | null>(null);
  const [loadingTmdb, setLoadingTmdb] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);

  // Fetch reviews from backend
  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    setReviewLoadError(null);
    try {
      const data = await listPopchoReviews({ limit: 50 });
      setReviews(data.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to review service';
      setReviewLoadError(msg);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  // Fetch critics from backend
  const fetchCritics = useCallback(async () => {
    setLoadingCritics(true);
    try {
      const critics = await getTopCritics();
      setTopCritics(critics || []);
    } catch {
      // Graceful fallback to empty leaderboard without fabricated stats
      setTopCritics([]);
    } finally {
      setLoadingCritics(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    const loadInitialData = async () => {
      try {
        const [reviewsData, criticsData] = await Promise.all([
          listPopchoReviews({ limit: 50 }),
          getTopCritics().catch(() => []),
        ]);
        if (!ignore) {
          setReviews(reviewsData.results || []);
          setTopCritics(criticsData || []);
          setLoadingReviews(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to connect to review service';
          setReviewLoadError(msg);
          setLoadingReviews(false);
        }
      }
    };

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  // Client-side search and filter combined seamlessly without resetting
  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.showTitle.toLowerCase().includes(q) ||
          r.headline.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q)
      );
    }

    if (activeFilter === '★ 5-Star Masterpieces') {
      result = result.filter((r) => r.rating >= 5.0);
    } else if (activeFilter === 'Most Helpful') {
      result.sort((a, b) => b.helpfulCount - a.helpfulCount);
    } else if (activeFilter === 'Season Finales') {
      result = result.filter(
        (r) =>
          r.categoryTag.toLowerCase().includes('finale') ||
          r.headline.toLowerCase().includes('finale') ||
          r.showTitle.toLowerCase().includes('finale')
      );
    } else if (activeFilter === 'Controversial Takes') {
      // Data-supported rule for controversial reviews:
      // Critical lower ratings (<= 3.5 stars) or flagged spoilers
      result = result.filter((r) => r.rating <= 3.5 || (r.rating <= 4.0 && r.hasSpoiler));
    }

    return result;
  }, [reviews, searchQuery, activeFilter]);

  // Derived trending discussions from active reviews
  const trendingDiscussions = useMemo(() => {
    return [...reviews]
      .sort((a, b) => b.responsesCount - a.responsesCount || b.helpfulCount - a.helpfulCount)
      .slice(0, 3);
  }, [reviews]);

  // Handle helpful voting
  const handleToggleHelpful = async (id: string) => {
    try {
      const res = await toggleReviewHelpful(id);
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            return {
              ...r,
              isHelpfulLiked: res.isHelpfulLiked,
              helpfulCount: res.helpfulCount,
            };
          }
          return r;
        })
      );
      // Update critics leaderboard
      fetchCritics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update helpful vote';
      setNotificationToast?.(msg);
    }
  };

  // Handle bookmarking
  const handleToggleBookmark = async (id: string) => {
    try {
      const res = await toggleReviewBookmark(id);
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isBookmarked: res.isBookmarked } : r))
      );
      setNotificationToast?.(
        res.isBookmarked ? 'Review added to your bookmarks.' : 'Bookmark removed.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update bookmark';
      setNotificationToast?.(msg);
    }
  };

  // Toggle comments drawer for a review
  const handleToggleComments = async (reviewId: string) => {
    if (activeCommentReviewId === reviewId) {
      setActiveCommentReviewId(null);
      return;
    }

    setActiveCommentReviewId(reviewId);

    // Fetch comments if not already loaded
    if (!reviewComments[reviewId]) {
      setLoadingComments((prev) => ({ ...prev, [reviewId]: true }));
      try {
        const comments = await listReviewComments(reviewId);
        setReviewComments((prev) => ({ ...prev, [reviewId]: comments }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to load comments';
        setNotificationToast?.(msg);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [reviewId]: false }));
      }
    }
  };

  // Post a new comment
  const handlePostComment = async (reviewId: string) => {
    const text = (newCommentText[reviewId] || '').trim();
    if (!text) return;

    setPostingComment((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const created = await postReviewComment(reviewId, text);
      setReviewComments((prev) => ({
        ...prev,
        [reviewId]: [...(prev[reviewId] || []), created],
      }));
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, responsesCount: r.responsesCount + 1 } : r
        )
      );
      setNewCommentText((prev) => ({ ...prev, [reviewId]: '' }));
      setNotificationToast?.('Your response has been published!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      setNotificationToast?.(msg);
    } finally {
      setPostingComment((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  // Debounced show title search in composer with sequence counter and cache
  const handleComposerShowInputChange = (value: string) => {
    setComposerShowTitle(value);
    setComposerTmdbId(null);
    setSearchShowsError(null);
    setSelectedSuggestionIndex(-1);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const clean = value.trim();
    if (clean.length < 2) {
      setShowSearchSuggestions([]);
      setShowSuggestionsOpen(false);
      setIsSearchingShows(false);
      return;
    }

    // Check memory cache first to avoid redundant requests
    const cached = searchCacheRef.current.get(clean.toLowerCase());
    if (cached) {
      setShowSearchSuggestions(cached);
      setShowSuggestionsOpen(true);
      setIsSearchingShows(false);
      return;
    }

    setIsSearchingShows(true);
    const thisSequence = ++searchSequenceRef.current;

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchMedia(clean);
        // Discard out-of-order older responses
        if (thisSequence !== searchSequenceRef.current) return;
        const validResults = (res.results || []).slice(0, 6);
        searchCacheRef.current.set(clean.toLowerCase(), validResults);
        setShowSearchSuggestions(validResults);
        setShowSuggestionsOpen(true);
        setSearchShowsError(null);
      } catch (err: unknown) {
        if (thisSequence !== searchSequenceRef.current) return;
        const msg = err instanceof Error ? err.message : 'Unable to search titles';
        setSearchShowsError(msg);
        setShowSearchSuggestions([]);
      } finally {
        if (thisSequence === searchSequenceRef.current) {
          setIsSearchingShows(false);
        }
      }
    }, 280);
  };

  // Keyboard navigation for search suggestions
  const handleShowInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestionsOpen || showSearchSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && showSearchSuggestions.length > 0) {
        setShowSuggestionsOpen(true);
        setSelectedSuggestionIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < showSearchSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : showSearchSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < showSearchSuggestions.length) {
        e.preventDefault();
        handleSelectShowSuggestion(showSearchSuggestions[selectedSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestionsOpen(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleSelectShowSuggestion = (show: MediaItem) => {
    setComposerShowTitle(show.title);
    setComposerTmdbId(Number(show.id) || show.tmdbId || 0);
    setComposerMediaType(show.mediaType === 'movie' ? 'movie' : 'tv');
    setComposerPoster(show.posterPath || null);
    setComposerBackdrop(show.backdropPath || show.featuredImage || null);
    setShowSuggestionsOpen(false);
    setSelectedSuggestionIndex(-1);
    setSearchShowsError(null);
  };

  // Publish a new review with auto-resolution guarantee
  const handlePublishReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposerError(null);

    const titleInput = composerShowTitle.trim();
    if (!titleInput) {
      setComposerError('Please select or specify a show title.');
      return;
    }
    if (!composerHeadline.trim()) {
      setComposerError('Please enter a review headline.');
      return;
    }
    if (!composerBody.trim()) {
      setComposerError('Please provide your full critical review text.');
      return;
    }
    if (!user) {
      setComposerError('Please sign in to publish your review.');
      openAuthModal('signin');
      return;
    }

    setIsSubmittingReview(true);
    try {
      // Auto-resolve TMDB show metadata if user typed without selecting suggestion
      let finalTmdbId = composerTmdbId;
      let finalPoster = composerPoster;
      let finalBackdrop = composerBackdrop;
      let finalMediaType = composerMediaType;
      let finalTitle = titleInput;

      if (!finalTmdbId || finalTmdbId === 0) {
        try {
          const lookup = await searchMedia(titleInput, 1);
          if (lookup.results && lookup.results.length > 0) {
            const match = lookup.results[0];
            finalTmdbId = Number(match.id) || match.tmdbId || 0;
            finalPoster = match.posterPath || null;
            finalBackdrop = match.backdropPath || match.featuredImage || null;
            finalMediaType = match.mediaType === 'movie' ? 'movie' : 'tv';
            finalTitle = match.title || finalTitle;
          }
        } catch {
          // Graceful fallback to user input
        }
      }

      const created = await createPopchoReview({
        tmdbId: finalTmdbId || 0,
        mediaType: finalMediaType,
        showTitle: finalTitle,
        showPoster: finalPoster || undefined,
        showBackdrop: finalBackdrop || undefined,
        headline: composerHeadline.trim(),
        content: composerBody.trim(),
        rating: composerRating,
        essayType: composerEssayType,
        categoryTag: composerEssayType,
        hasSpoiler: composerSpoiler,
      });

      // Update feed immediately without requiring reload
      setReviews((prev) => [created, ...prev]);
      setIsComposerOpen(false);
      setComposerShowTitle('');
      setComposerTmdbId(null);
      setComposerPoster(null);
      setComposerBackdrop(null);
      setComposerHeadline('');
      setComposerBody('');
      setComposerSpoiler(false);
      setSelectedSuggestionIndex(-1);
      setNotificationToast?.('Your critical deep dive has been published to PopCho!');
      fetchCritics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish review';
      setComposerError(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Fetch live TMDB details and official reviews
  const handleFetchTmdbReviews = async (id: string, type: 'tv' | 'movie') => {
    const cleanId = id.trim();
    if (!cleanId) {
      setTmdbError('Please enter a TMDB ID (e.g. 1396 for Breaking Bad, 550 for Fight Club).');
      return;
    }
    if (!/^\d+$/.test(cleanId)) {
      setTmdbError('Invalid ID: TMDB ID must be a numeric value (e.g. 1396).');
      return;
    }

    setLoadingTmdb(true);
    setTmdbError(null);
    setLiveTmdbShow(null);
    setLiveTmdbReviews(null);

    try {
      const [showDetails, reviewsResponse] = await Promise.all([
        type === 'movie' ? getMovieDetails(cleanId) : getTvShowDetails(cleanId),
        getMediaReviews(cleanId, type),
      ]);

      setLiveTmdbShow(showDetails);
      setLiveTmdbReviews(reviewsResponse.results || []);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to fetch title or reviews from TMDB backend';
      setTmdbError(errorMsg);
    } finally {
      setLoadingTmdb(false);
    }
  };

  // Open composer with TMDB show prefilled
  const handleWriteReviewForShow = (show: MediaItem) => {
    setComposerShowTitle(show.title);
    setComposerTmdbId(Number(show.id) || 0);
    setComposerMediaType(show.mediaType === 'movie' ? 'movie' : 'tv');
    setComposerPoster(show.posterPath || null);
    setComposerBackdrop(show.backdropPath || show.featuredImage || null);
    setIsComposerOpen(true);
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
            <span className="text-[#e9bcb6]/80 text-xs">
              {reviews.length > 0 ? `${reviews.length} Verified Deep Dives` : 'Live Community Index'}
            </span>
          </div>

          {/* Main Headline Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#e5e2e1] tracking-tight">
                Community Reviews &amp; Deep Dives
              </h1>
              <p className="text-sm sm:text-base text-[#e9bcb6] mt-1.5 max-w-2xl leading-relaxed">
                Unfiltered, passionate critical analysis and essays written by television and cinema lovers, not algorithms.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setComposerError(null);
                setIsComposerOpen(true);
              }}
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
                <span className="w-8 h-8 rounded-lg bg-[#e50914]/20 text-[#e50914] flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-lg">sync_saved_locally</span>
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#e5e2e1]">Inspect Live TMDB Reviews</h4>
                  <p className="text-[11px] text-[#e9bcb6]/70">Query verified international title metadata and reviews via TMDB API</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="e.g. 1396 (Breaking Bad)"
                  value={tmdbLookupId}
                  onChange={(e) => setTmdbLookupId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFetchTmdbReviews(tmdbLookupId, tmdbMediaType);
                  }}
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
                  disabled={loadingTmdb}
                  onClick={() => handleFetchTmdbReviews(tmdbLookupId, tmdbMediaType)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#e50914] text-white text-xs font-bold hover:bg-[#b2000d] shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {loadingTmdb ? 'Fetching…' : 'Fetch'}
                </button>
              </div>
            </div>

            {/* Display Live TMDB Inspected Status & Content */}
            {loadingTmdb && (
              <div className="p-6 rounded-2xl bg-[#201f1f] border border-[#353534] text-center flex items-center justify-center gap-2 text-xs text-[#e9bcb6]">
                <span className="material-symbols-outlined text-sm animate-spin text-[#e50914]">progress_activity</span>
                <span>Fetching title metadata and reviews from TMDB secure backend proxy…</span>
              </div>
            )}

            {tmdbError && (
              <div className="p-4 rounded-2xl bg-[#93000a]/20 border border-[#93000a]/40 text-xs text-[#ffb4ab] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{tmdbError}</span>
              </div>
            )}

            {liveTmdbShow && (
              <div className="p-5 rounded-2xl bg-[#201f1f] border border-[#e50914]/40 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#353534] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#e50914] text-white text-[10px] font-bold">
                      TMDB OFFICIAL RESULT
                    </span>
                    <span className="text-xs font-bold text-[#e5e2e1]">
                      {liveTmdbReviews ? `${liveTmdbReviews.length} Verified Reviews` : 'Verified Media'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLiveTmdbShow(null);
                      setLiveTmdbReviews(null);
                    }}
                    className="text-xs text-[#e9bcb6] hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Show Preview Card */}
                <div className="flex flex-col sm:flex-row items-start gap-4 p-3 rounded-xl bg-[#131313] border border-[#353534]">
                  <img
                    src={getImageUrl(liveTmdbShow.posterPath, 'w200')}
                    alt={liveTmdbShow.title}
                    className="w-20 h-28 object-cover rounded-lg border border-[#353534] shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#2a2a2a] text-[#ffb4aa] font-bold uppercase">
                        {liveTmdbShow.mediaType === 'movie' ? 'Movie' : 'TV Series'}
                      </span>
                      {liveTmdbShow.releaseDate && (
                        <span className="text-[11px] text-[#e9bcb6]/70">
                          {liveTmdbShow.releaseDate.slice(0, 4)}
                        </span>
                      )}
                      {liveTmdbShow.voteAverage > 0 && (
                        <span className="text-[11px] font-bold text-[#e50914] flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                          {liveTmdbShow.voteAverage.toFixed(1)} / 10 ({liveTmdbShow.voteCount.toLocaleString()} TMDB votes)
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#e5e2e1] truncate">{liveTmdbShow.title}</h3>
                    <p className="text-xs text-[#e9bcb6]/80 line-clamp-2 mt-1 leading-relaxed">
                      {liveTmdbShow.overview || 'No overview available from TMDB.'}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleWriteReviewForShow(liveTmdbShow)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">rate_review</span>
                      <span>+ Write PopCho Deep Dive for this Title</span>
                    </button>
                  </div>
                </div>

                {/* Reviews List */}
                {liveTmdbReviews && liveTmdbReviews.length === 0 ? (
                  <p className="text-xs text-[#e9bcb6]/70 py-2">
                    No international user reviews have been submitted on TMDB for ID {liveTmdbShow.id}. Be the first to publish a review on PopCho!
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-[#e9bcb6] uppercase tracking-wider">
                      Verified TMDB Review Submissions
                    </h4>
                    {liveTmdbReviews?.slice(0, 3).map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-[#131313] border border-[#353534] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {r.avatarUrl ? (
                              <img
                                src={r.avatarUrl}
                                alt={r.author}
                                className="w-5 h-5 rounded-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                            <span className="font-bold text-[#e5e2e1]">@{r.author}</span>
                          </div>
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

            {/* Loading Reviews State */}
            {loadingReviews && (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-[#201f1f] rounded-2xl border border-[#353534]">
                <span className="material-symbols-outlined text-4xl text-[#e50914] animate-spin">
                  progress_activity
                </span>
                <p className="text-sm text-[#e9bcb6]/80">Loading community deep dives from PopCho database…</p>
              </div>
            )}

            {/* Error Loading Reviews State */}
            {!loadingReviews && reviewLoadError && (
              <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-3 bg-[#201f1f] rounded-2xl border border-[#93000a]/40">
                <span className="material-symbols-outlined text-4xl text-[#e50914]">cloud_off</span>
                <h3 className="text-base font-bold text-[#e5e2e1]">Unable to Connect to Review Database</h3>
                <p className="text-xs text-[#e9bcb6]/75 max-w-md">{reviewLoadError}</p>
                <button
                  type="button"
                  onClick={fetchReviews}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>Retry Connection</span>
                </button>
              </div>
            )}

            {/* Empty Feed State */}
            {!loadingReviews && !reviewLoadError && filteredReviews.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-[#201f1f] rounded-2xl border border-[#353534]">
                <span className="material-symbols-outlined text-5xl text-[#e50914]">rate_review</span>
                <h3 className="text-xl font-bold text-[#e5e2e1]">No Critical Reviews Found</h3>
                <p className="text-sm text-[#e9bcb6]/70 max-w-md">
                  {searchQuery || activeFilter !== 'All Reviews'
                    ? 'No reviews match your current search or filter criteria. Try clearing your filters.'
                    : 'The PopCho review archive is fresh. Be the pioneer critic to publish a deep dive!'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setComposerError(null);
                    setIsComposerOpen(true);
                  }}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold cursor-pointer"
                >
                  + Write a Deep Dive
                </button>
              </div>
            )}

            {/* Real PopCho Reviews Feed */}
            {!loadingReviews &&
              !reviewLoadError &&
              filteredReviews.map((rev) => {
                const isExpanded = Boolean(expandedBodies[rev.id]);
                const backdropUrl = rev.showBackdrop
                  ? getImageUrl(rev.showBackdrop, 'original')
                  : DEFAULT_BACKDROP;
                const posterUrl = rev.showPoster
                  ? getImageUrl(rev.showPoster, 'w300')
                  : DEFAULT_POSTER;
                const isCommentsOpen = activeCommentReviewId === rev.id;
                const comments = reviewComments[rev.id] || [];
                const isLoadingRevComments = Boolean(loadingComments[rev.id]);
                const isPostingRevComment = Boolean(postingComment[rev.id]);

                return (
                  <article
                    key={rev.id}
                    id={`rev-${rev.id}`}
                    className="bg-[#201f1f] rounded-2xl overflow-hidden hover:bg-[#252424] transition-colors border border-[#353534] group shadow-lg"
                  >
                    {/* Card Hero / Show Backdrop Banner with Poster Overlap */}
                    <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-[#0e0e0e]">
                      <div
                        className="bg-cover bg-center w-full h-full transform group-hover:scale-105 transition-transform duration-700"
                        style={{ backgroundImage: `url('${backdropUrl}')` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-[#201f1f]/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-transparent to-transparent" />

                      {/* Poster Inset & Media Info */}
                      <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3 sm:gap-4">
                        <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 shadow-2xl bg-[#0e0e0e] border border-[#353534]">
                          <img
                            src={posterUrl}
                            alt={rev.showTitle}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#e50914]/25 text-[#ffb4aa] uppercase tracking-wider mb-1 border border-[#e50914]/30">
                            {rev.categoryTag}
                          </span>
                          <h2 className="text-base sm:text-lg font-bold text-[#e5e2e1] truncate">
                            {rev.showTitle}
                          </h2>
                          <p className="text-xs text-[#e9bcb6]/80">
                            PopCho Community Review • {rev.mediaType === 'movie' ? 'Feature Film' : 'Television Series'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-4 sm:p-6 pt-3 sm:pt-4 flex flex-col gap-3">
                      {/* Author Meta & Ratings Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[#353534]/50">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {rev.userAvatar ? (
                              <img
                                src={rev.userAvatar}
                                alt={rev.userName}
                                className="w-10 h-10 rounded-full object-cover ring-1 ring-[#353534]"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center font-bold text-xs text-[#e50914]">
                                {rev.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#008442] ring-2 ring-[#201f1f]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-[#e5e2e1]">
                                @{rev.userName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#353534] text-[#ffb4aa] font-bold">
                                {rev.userRole}
                              </span>
                            </div>
                            <div className="text-xs text-[#e9bcb6]/70">
                              Published {formatTimeAgo(rev.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Rating Badge & Essay Type */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 text-[#e50914]">
                            <span
                              className="material-symbols-outlined text-base"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[#e5e2e1] ml-0.5">
                              {rev.rating.toFixed(1)} / 5.0
                            </span>
                          </div>
                          {rev.hasSpoiler ? (
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
                      <p
                        className={`text-xs sm:text-sm text-[#e9bcb6]/90 leading-relaxed whitespace-pre-line ${
                          isExpanded ? '' : 'line-clamp-3'
                        }`}
                      >
                        {rev.content}
                      </p>

                      {rev.content.length > 220 && (
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
                              style={{
                                fontVariationSettings: rev.isHelpfulLiked ? "'FILL' 1" : "'FILL' 0",
                              }}
                            >
                              thumb_up
                            </span>
                            <span>{rev.helpfulCount.toLocaleString()} Found Helpful</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleComments(rev.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              isCommentsOpen
                                ? 'bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/30'
                                : 'bg-[#2a2a2a] hover:bg-[#353534] text-[#e9bcb6] hover:text-[#e5e2e1]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">forum</span>
                            <span>
                              {rev.responsesCount}{' '}
                              {rev.responsesCount === 1 ? 'Fan Response' : 'Fan Responses'}
                            </span>
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
                              const shareUrl = `${window.location.origin}/reviews#rev-${rev.id}`;
                              navigator.clipboard?.writeText(shareUrl);
                              setNotificationToast?.('Critique link copied to clipboard!');
                            }}
                            className="p-2 rounded-xl text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                            title="Share critique"
                          >
                            <span className="material-symbols-outlined text-base">share</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Comments Drawer */}
                      {isCommentsOpen && (
                        <div className="mt-3 pt-3 border-t border-[#353534]/50 flex flex-col gap-3">
                          <h4 className="text-xs font-bold text-[#e5e2e1] flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#e50914]">
                              chat_bubble
                            </span>
                            <span>Fan Responses &amp; Commentary</span>
                          </h4>

                          {isLoadingRevComments && (
                            <div className="p-3 text-center text-xs text-[#e9bcb6]/70">
                              Loading responses…
                            </div>
                          )}

                          {!isLoadingRevComments && comments.length === 0 && (
                            <p className="text-xs text-[#e9bcb6]/60 italic py-1">
                              No responses yet. Be the first to share your perspective on this essay!
                            </p>
                          )}

                          {!isLoadingRevComments &&
                            comments.map((c) => (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-xl bg-[#171717] border border-[#353534]/50 flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-[#e5e2e1]">@{c.userName}</span>
                                  <span className="text-[10px] text-[#e9bcb6]/60">
                                    {formatTimeAgo(c.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-[#e9bcb6]/90 leading-relaxed">
                                  {c.content}
                                </p>
                              </div>
                            ))}

                          {/* Post comment input */}
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={newCommentText[rev.id] || ''}
                              onChange={(e) =>
                                setNewCommentText((prev) => ({
                                  ...prev,
                                  [rev.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePostComment(rev.id);
                              }}
                              placeholder="Add your voice to this critique..."
                              className="flex-1 h-9 px-3 bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs rounded-xl border border-[#353534] focus:outline-none focus:border-[#e50914]"
                            />
                            <button
                              type="button"
                              disabled={isPostingRevComment || !(newCommentText[rev.id] || '').trim()}
                              onClick={() => handlePostComment(rev.id)}
                              className="px-3.5 h-9 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer"
                            >
                              {isPostingRevComment ? 'Posting…' : 'Post'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
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
                onClick={() => {
                  setComposerError(null);
                  setIsComposerOpen(true);
                }}
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
                  <h3 className="text-sm font-bold text-[#e5e2e1]">Top Community Critics</h3>
                </div>
                <span className="text-[10px] text-[#e9bcb6]/70 uppercase tracking-wider font-semibold">
                  Live Rankings
                </span>
              </div>

              {loadingCritics ? (
                <div className="p-4 text-center text-xs text-[#e9bcb6]/70">Loading rankings…</div>
              ) : topCritics.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#1c1b1b] border border-[#353534]/50 text-center flex flex-col items-center justify-center gap-1.5 py-6">
                  <span className="material-symbols-outlined text-[#e50914] text-2xl">workspace_premium</span>
                  <h4 className="text-xs font-bold text-[#e5e2e1]">No Ranked Critics Yet</h4>
                  <p className="text-[11px] text-[#e9bcb6]/70 max-w-xs">
                    Rankings update automatically with published deep dives and helpful votes. Publish your review to take the #1 spot!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {topCritics.map((critic, idx) => (
                    <div
                      key={critic.userId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-bold w-4 text-center ${
                            idx === 0 ? 'text-[#e50914]' : 'text-[#e9bcb6]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        {critic.userAvatar ? (
                          <img
                            src={critic.userAvatar}
                            alt={critic.userName}
                            className="w-9 h-9 rounded-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center font-bold text-xs text-[#e50914]">
                            {critic.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-[#e5e2e1]">@{critic.userName}</h4>
                          <p className="text-[11px] text-[#e9bcb6]/70">
                            {critic.reviewsCount} {critic.reviewsCount === 1 ? 'review' : 'reviews'} • {critic.totalHelpful} helpful votes
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#e50914]/20 text-[#ffb4aa] font-bold">
                        {critic.reviewsCount >= 3 ? 'Master' : 'Contributor'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trending Review Discussions */}
            <div className="bg-[#201f1f] p-5 rounded-2xl border border-[#353534] shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#e50914] text-xl">trending_up</span>
                <h3 className="text-sm font-bold text-[#e5e2e1]">Trending Discussions</h3>
              </div>

              {trendingDiscussions.length === 0 ? (
                <p className="text-xs text-[#e9bcb6]/70 italic py-2">
                  Active critique threads will appear here as the community shares verdicts and debates.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {trendingDiscussions.map((td) => (
                    <div
                      key={td.id}
                      onClick={() => {
                        const el = document.getElementById(`rev-${td.id}`);
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="p-3 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                    >
                      <span className="text-[10px] text-[#ffb4aa] uppercase font-bold tracking-wider">
                        {td.showTitle}
                      </span>
                      <h4 className="text-xs font-bold text-[#e5e2e1] mt-0.5 truncate">
                        {td.headline}
                      </h4>
                      <p className="text-[11px] text-[#e9bcb6]/70 mt-1">
                        {td.responsesCount} fan {td.responsesCount === 1 ? 'response' : 'responses'} • {td.helpfulCount} found helpful
                      </p>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Interactive Write Review Composer Modal */}
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

            {/* Error Banner */}
            {composerError && (
              <div className="p-3 rounded-xl bg-[#93000a]/30 border border-[#93000a]/50 text-xs text-[#ffb4ab] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{composerError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handlePublishReview} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-[#e9bcb6] mb-1">
                  Target Show, Movie, or Season
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#e9bcb6]/60 text-sm">
                    {composerMediaType === 'movie' ? 'movie' : 'tv'}
                  </span>
                  <input
                    type="text"
                    required
                    value={composerShowTitle}
                    onChange={(e) => handleComposerShowInputChange(e.target.value)}
                    onKeyDown={handleShowInputKeyDown}
                    onFocus={() => {
                      if (showSearchSuggestions.length > 0) setShowSuggestionsOpen(true);
                    }}
                    placeholder="Type to search official title (e.g. Severance, Arcane, Breaking Bad)..."
                    className="w-full bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs sm:text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#353534] focus:outline-none focus:border-[#e50914]"
                    autoComplete="off"
                  />
                  {isSearchingShows && (
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#e50914] text-sm animate-spin">
                      progress_activity
                    </span>
                  )}
                </div>

                {/* Show Search Suggestions Dropdown */}
                {showSuggestionsOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[#1c1b1b] border border-[#353534] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#353534]/50 max-h-64 overflow-y-auto">
                    {isSearchingShows && showSearchSuggestions.length === 0 && (
                      <div className="p-3 text-center text-xs text-[#e9bcb6]/70 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm animate-spin text-[#e50914]">progress_activity</span>
                        <span>Searching TMDB catalog…</span>
                      </div>
                    )}

                    {searchShowsError && (
                      <div className="p-2.5 text-center text-xs text-[#ffb4ab] bg-[#93000a]/20">
                        {searchShowsError}
                      </div>
                    )}

                    {!isSearchingShows && !searchShowsError && showSearchSuggestions.length === 0 && composerShowTitle.trim().length >= 2 && (
                      <div className="p-3 text-center text-xs text-[#e9bcb6]/70 flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-base text-[#e50914]">search_off</span>
                        <span>No matching movie or TV show found for &quot;{composerShowTitle}&quot;</span>
                      </div>
                    )}

                    {showSearchSuggestions.map((item, idx) => {
                      const isHighlighted = selectedSuggestionIndex === idx;
                      const year = item.releaseDate
                        ? item.releaseDate.slice(0, 4)
                        : item.firstAirDate
                        ? item.firstAirDate.slice(0, 4)
                        : '';
                      return (
                        <button
                          key={`${item.mediaType}-${item.id}`}
                          type="button"
                          onClick={() => handleSelectShowSuggestion(item)}
                          onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                          className={`w-full p-2.5 flex items-center gap-3 transition-colors text-left cursor-pointer ${
                            isHighlighted ? 'bg-[#2a2a2a] border-l-2 border-[#e50914]' : 'hover:bg-[#252424]'
                          }`}
                        >
                          <img
                            src={getImageUrl(item.posterPath, 'w200')}
                            alt={item.title}
                            className="w-8 h-12 object-cover rounded bg-[#0e0e0e] shrink-0 border border-[#353534]"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#e5e2e1] truncate">{item.title}</h4>
                            <p className="text-[10px] text-[#e9bcb6]/70 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-[#0e0e0e] text-[#e50914] font-semibold text-[9px] uppercase">
                                {item.mediaType === 'movie' ? 'Film' : 'TV'}
                              </span>
                              {year && <span>{year}</span>}
                              {item.voteAverage > 0 && (
                                <span className="text-[#e9bcb6]">★ {item.voteAverage.toFixed(1)}</span>
                              )}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected TMDB Show Confirmation Preview Card */}
                {composerTmdbId && composerTmdbId > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-[#0e0e0e] border border-[#70dc8e]/40 flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getImageUrl(composerPoster, 'w200')}
                        alt={composerShowTitle}
                        className="w-8 h-12 object-cover rounded bg-[#201f1f] shrink-0 border border-[#353534]"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#e5e2e1] truncate">{composerShowTitle}</p>
                        <p className="text-[10px] text-[#70dc8e] font-semibold flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          <span>TMDB Canonical ID #{composerTmdbId} • {composerMediaType === 'movie' ? 'Movie' : 'TV Series'}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setComposerTmdbId(null);
                        setComposerPoster(null);
                        setComposerBackdrop(null);
                        setShowSuggestionsOpen(true);
                      }}
                      className="text-[11px] text-[#e9bcb6] hover:text-white px-2.5 py-1 rounded-lg bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#353534] shrink-0 transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}
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
                    <option>Season Finale</option>
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
                  placeholder="Elaborate on screenplay pacing, subtext, character arcs, visual direction, and thematic conclusions..."
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
                  disabled={isSubmittingReview}
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-6 py-2 bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Publishing…</span>
                    </>
                  ) : (
                    <span>Publish Review</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
