import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { MediaItem } from '../services/tmdb/types';
import { getTrendingTvShows } from '../services/tmdb/tv';
import { DEFAULT_BACKDROP, DEFAULT_POSTER } from '../services/tmdb/client';
import { ShowCard } from '../components/directory/ShowCard';
import { useAuth } from '../contexts/AuthContext';
import {
  getPulseDiscussions,
  getDiscussionReplies,
  postDiscussionReply,
  togglePulseDiscussionLike,
  deletePulseDiscussion,
  getTheoristLeaderboard,
  type PulseDiscussion,
  type DiscussionReply,
  type LeaderboardTheorist,
} from '../services/community/api';
import {
  subscribeToPulseReactions,
  subscribeToPulseReplies,
  subscribeToPulseDeletions,
} from '../services/community/socket';
import {
  listPopchoReviews,
  toggleReviewHelpful,
  type PopchoReview,
} from '../services/review/api';

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
  // TMDB Trending TV Shows State
  const [trendingShows, setTrendingShows] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Hero Slide Index (0 to 4) & Hover state for autoplay
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isHeroHovered, setIsHeroHovered] = useState<boolean>(false);

  // Genre & Reviews Tabs State
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [activeReviewTab, setActiveReviewTab] = useState<'week' | 'all' | 'helpful'>('week');

  // Carousel Scrolling State & Ref (for section 3)
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Ref tracking mounted status across async operations
  const isMountedRef = useRef(true);
  // Monotonic request ID counter to prevent stale out-of-order responses from overwriting fresh state
  const requestIdRef = useRef(0);

  // Fetch Trending TV Shows from API service layer (for manual retry)
  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    const thisRequestId = ++requestIdRef.current;

    getTrendingTvShows(1, true)
      .then((shows) => {
        if (!isMountedRef.current || thisRequestId !== requestIdRef.current) return;
        const validShows = (shows || []).filter((s) => s && s.id && s.title);
        setTrendingShows(validShows);
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current || thisRequestId !== requestIdRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to reach the PopCho media service. Please ensure the backend is running.';
        setError(msg);
      })
      .finally(() => {
        if (isMountedRef.current && thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const thisRequestId = ++requestIdRef.current;

    getTrendingTvShows(1, false)
      .then((shows) => {
        if (!isMountedRef.current || thisRequestId !== requestIdRef.current) return;
        const validShows = (shows || []).filter((s) => s && s.id && s.title);
        setTrendingShows(validShows);
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current || thisRequestId !== requestIdRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to reach the PopCho media service. Please ensure the backend is running.';
        setError(msg);
      })
      .finally(() => {
        if (isMountedRef.current && thisRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update carousel navigation buttons on scroll/resize
  const updateScrollButtons = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const rafId = requestAnimationFrame(updateScrollButtons);
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, trendingShows, isLoading]);

  const handleScroll = (direction: 'prev' | 'next') => {
    const el = carouselRef.current;
    if (!el) return;
    // Calculate card step dynamically from first rendered card + flex gap
    const firstCard = el.firstElementChild as HTMLElement | null;
    const cardStep = firstCard ? firstCard.offsetWidth + 16 : 256;
    // 1 card step on mobile (< 768px), 2 card steps on tablet & desktop
    const multiplier = window.innerWidth < 768 ? 1 : 2;
    const scrollDistance = direction === 'prev' ? -cardStep * multiplier : cardStep * multiplier;
    el.scrollBy({ left: scrollDistance, behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleScroll('prev');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleScroll('next');
    }
  };

  const { user, openAuthModal } = useAuth();

  // =========================================================================
  // LIVE FAN PULSE REAL STATE & INTERACTIONS
  // =========================================================================
  const [discussions, setDiscussions] = useState<PulseDiscussion[]>([]);
  const [isLoadingPulse, setIsLoadingPulse] = useState<boolean>(true);
  const [pulseError, setPulseError] = useState<string | null>(null);
  const [pendingLikes, setPendingLikes] = useState<Record<string, boolean>>({});
  const [activeOverflowMenuId, setActiveOverflowMenuId] = useState<string | null>(null);

  // Reply Drawer / Modal State
  const [activeReplyDiscussion, setActiveReplyDiscussion] = useState<PulseDiscussion | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState<boolean>(false);
  const [replyInputText, setReplyInputText] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const fetchPulse = useCallback(() => {
    setIsLoadingPulse(true);
    setPulseError(null);
    getPulseDiscussions({ limit: 4, sortBy: 'likes' })
      .then((data) => {
        if (!isMountedRef.current) return;
        setDiscussions((data.discussions || []).slice(0, 4));
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Unable to load community discussions.';
        setPulseError(msg);
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoadingPulse(false);
        }
      });
  }, []);

  useEffect(() => {
    fetchPulse();

    // Real-time Socket.IO subscriptions for Live Fan Pulse
    const unsubLikes = subscribeToPulseReactions(({ discussionId, isLiked, likeCount }) => {
      setDiscussions((prev) =>
        prev.map((d) => (d.id === discussionId ? { ...d, isLiked: user ? isLiked : false, likeCount } : d))
      );
    });

    const unsubReplies = subscribeToPulseReplies(({ discussionId, reply, replyCount }) => {
      setDiscussions((prev) =>
        prev.map((d) => (d.id === discussionId ? { ...d, replyCount } : d))
      );
      if (activeReplyDiscussion?.id === discussionId && reply) {
        setReplies((prev) => {
          if (prev.some((r) => r.id === (reply as DiscussionReply).id)) return prev;
          return [...prev, reply as DiscussionReply];
        });
      }
    });

    const unsubDeletions = subscribeToPulseDeletions(({ discussionId }) => {
      setDiscussions((prev) => prev.filter((d) => d.id !== discussionId));
      if (activeReplyDiscussion?.id === discussionId) {
        setActiveReplyDiscussion(null);
      }
    });

    return () => {
      unsubLikes();
      unsubReplies();
      unsubDeletions();
    };
  }, [fetchPulse, user, activeReplyDiscussion?.id]);

  const handleTogglePulseLike = async (discussion: PulseDiscussion) => {
    if (!user) {
      openAuthModal();
      setNotificationToast?.('Please sign in to react to discussions.');
      return;
    }
    if (pendingLikes[discussion.id]) return;

    setPendingLikes((prev) => ({ ...prev, [discussion.id]: true }));
    const willBeLiked = !discussion.isLiked;
    const nextCount = willBeLiked ? discussion.likeCount + 1 : Math.max(0, discussion.likeCount - 1);

    // Optimistic UI update
    setDiscussions((prev) =>
      prev.map((d) => (d.id === discussion.id ? { ...d, isLiked: willBeLiked, likeCount: nextCount } : d))
    );

    try {
      const res = await togglePulseDiscussionLike(discussion.id);
      setDiscussions((prev) =>
        prev.map((d) => (d.id === discussion.id ? { ...d, isLiked: res.isLiked, likeCount: res.likeCount } : d))
      );
    } catch {
      // Revert on error
      setDiscussions((prev) =>
        prev.map((d) => (d.id === discussion.id ? { ...d, isLiked: discussion.isLiked, likeCount: discussion.likeCount } : d))
      );
      setNotificationToast?.('Failed to update like. Please try again.');
    } finally {
      setPendingLikes((prev) => ({ ...prev, [discussion.id]: false }));
    }
  };

  const handleOpenReplies = async (discussion: PulseDiscussion) => {
    setActiveReplyDiscussion(discussion);
    setIsLoadingReplies(true);
    setReplyError(null);
    try {
      const list = await getDiscussionReplies(discussion.id);
      setReplies(list);
    } catch {
      setReplyError('Could not load replies. Please try again.');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      setNotificationToast?.('Please sign in to reply.');
      return;
    }
    if (!activeReplyDiscussion) return;
    const clean = replyInputText.trim();
    if (!clean || isSubmittingReply) return;

    setIsSubmittingReply(true);
    setReplyError(null);

    try {
      const res = await postDiscussionReply(activeReplyDiscussion.id, clean);
      setReplies((prev) => [...prev, res.reply]);
      setDiscussions((prev) =>
        prev.map((d) => (d.id === activeReplyDiscussion.id ? { ...d, replyCount: res.replyCount } : d))
      );
      setReplyInputText('');
      setNotificationToast?.('Reply posted!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post reply.';
      setReplyError(msg);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleShareDiscussion = async (discussion: PulseDiscussion) => {
    const shareUrl = `${window.location.origin}/discover?q=${encodeURIComponent(discussion.show.title)}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${discussion.show.title} Discussion on PopCho`,
          text: `"${discussion.content.slice(0, 120)}..."`,
          url: shareUrl,
        });
        setNotificationToast?.('Discussion shared!');
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotificationToast?.('Discussion link copied to clipboard!');
    } catch {
      setNotificationToast?.('Could not copy link automatically.');
    }
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
    setActiveOverflowMenuId(null);
    try {
      await deletePulseDiscussion(discussionId);
      setDiscussions((prev) => prev.filter((d) => d.id !== discussionId));
      setNotificationToast?.('Discussion deleted.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete discussion.';
      setNotificationToast?.(msg);
    }
  };

  // Close overflow menu when clicking elsewhere
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.discussion-overflow-container')) {
        setActiveOverflowMenuId(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // =========================================================================
  // WEEKLY TOP THEORISTS REAL LEADERBOARD STATE
  // =========================================================================
  const [theorists, setTheorists] = useState<LeaderboardTheorist[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(true);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'all'>('week');

  useEffect(() => {
    let isSubscribed = true;
    setIsLoadingLeaderboard(true);

    getTheoristLeaderboard(leaderboardPeriod, 5)
      .then((data) => {
        if (!isSubscribed) return;
        setTheorists(data.theorists || []);
      })
      .catch((err) => {
        console.warn('Leaderboard error:', err);
        if (isSubscribed) setTheorists([]);
      })
      .finally(() => {
        if (isSubscribed) setIsLoadingLeaderboard(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [leaderboardPeriod]);

  // =========================================================================
  // FEATURED FAN REVIEWS REAL DATABASE STATE & FILTERING
  // =========================================================================
  const [featuredReviews, setFeaturedReviews] = useState<PopchoReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [helpfulLikedIds, setHelpfulLikedIds] = useState<Record<string, boolean>>({});

  const fetchReviews = useCallback((tab: 'week' | 'all' | 'helpful') => {
    setIsLoadingReviews(true);
    setReviewsError(null);

    listPopchoReviews({ limit: 3, filter: tab })
      .then((data) => {
        if (!isMountedRef.current) return;
        setFeaturedReviews(data.results || []);
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Unable to load reviews.';
        setReviewsError(msg);
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoadingReviews(false);
        }
      });
  }, []);

  useEffect(() => {
    fetchReviews(activeReviewTab);
  }, [activeReviewTab, fetchReviews]);

  const handleToggleReviewHelpful = async (reviewId: string) => {
    if (!user) {
      openAuthModal();
      setNotificationToast?.('Please sign in to vote on reviews.');
      return;
    }

    try {
      const res = await toggleReviewHelpful(reviewId);
      setHelpfulLikedIds((prev) => ({ ...prev, [reviewId]: res.isHelpfulLiked }));
      setFeaturedReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpfulCount: res.helpfulCount, isHelpfulLiked: res.isHelpfulLiked } : r
        )
      );
      setNotificationToast?.(
        res.isHelpfulLiked ? 'Marked review as helpful!' : 'Removed helpful vote.'
      );
    } catch {
      setNotificationToast?.('Failed to update helpful vote.');
    }
  };

  // Top 5 trending TV shows for the cinematic hero slider
  const topFiveTrending = trendingShows.slice(0, 5);
  const slideCount = topFiveTrending.length;
  const safeActiveIndex = slideCount > 0 ? Math.min(activeSlideIndex, slideCount - 1) : 0;
  const featuredShow = topFiveTrending[safeActiveIndex] || null;

  // Slide navigation callbacks
  const handlePrevSlide = useCallback(() => {
    if (slideCount <= 1) return;
    setActiveSlideIndex((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const handleNextSlide = useCallback(() => {
    if (slideCount <= 1) return;
    setActiveSlideIndex((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const handleSelectSlide = useCallback((index: number) => {
    setActiveSlideIndex(index);
  }, []);

  // Keyboard navigation for hero slider
  const handleHeroKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNextSlide();
    }
  };

  // Autoplay effect with pause-on-hover, document visibility, and prefers-reduced-motion guards
  useEffect(() => {
    if (slideCount <= 1 || isHeroHovered) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    let isDocumentVisible =
      typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
    const handleVisibilityChange = () => {
      isDocumentVisible = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (isDocumentVisible && !isHeroHovered) {
        setActiveSlideIndex((prev) => (prev + 1) % slideCount);
      }
    }, 6500);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [slideCount, isHeroHovered, activeSlideIndex]);

  return (
    <main className="w-full min-h-screen bg-[#131313] text-[#e5e2e1] -mt-[68px] overflow-x-clip">
      <div className="flex flex-col w-full">
        {/* ========================================================================= */}
        {/* 1. CINEMATIC TOP 5 TRENDING HERO SLIDER (STITCH REFERENCE)                */}
        {/* ========================================================================= */}
        <section
          id="hero-carousel-section"
          aria-label="Top 5 Trending Shows Hero Slider"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
          onKeyDown={handleHeroKeyDown}
          tabIndex={0}
          className="relative w-full overflow-hidden bg-[#0e0e0e] focus:outline-none"
        >
          {isLoading ? (
            /* Loading Hero Skeleton */
            <div className="w-full min-h-[620px] lg:min-h-[680px] bg-[#1a1a1a] relative flex items-end animate-pulse">
              <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-10 flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="h-7 w-36 bg-[#2a2a2a] rounded-full" />
                  <div className="h-7 w-32 bg-[#2a2a2a] rounded-full" />
                  <div className="h-7 w-24 bg-[#2a2a2a] rounded-full" />
                </div>
                <div className="h-12 sm:h-16 w-3/4 max-w-xl bg-[#2a2a2a] rounded-2xl mb-4" />
                <div className="h-4 w-72 bg-[#2a2a2a] rounded mb-3" />
                <div className="space-y-2 max-w-2xl mb-6">
                  <div className="h-3.5 w-full bg-[#2a2a2a] rounded" />
                  <div className="h-3.5 w-5/6 bg-[#2a2a2a] rounded" />
                  <div className="h-3.5 w-2/3 bg-[#2a2a2a] rounded" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-12 w-48 bg-[#2a2a2a] rounded-xl" />
                  <div className="h-12 w-40 bg-[#2a2a2a] rounded-xl" />
                  <div className="h-12 w-12 bg-[#2a2a2a] rounded-xl" />
                </div>
              </div>
            </div>
          ) : error && topFiveTrending.length === 0 ? (
            /* API Failure Hero State */
            <div className="w-full min-h-[460px] lg:min-h-[520px] bg-[#1a1a1a] relative flex items-center justify-center p-6 border-b border-[#353534]">
              <div className="max-w-md text-center flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[#e50914]/20 text-[#e50914] flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">cloud_off</span>
                </div>
                <h2 className="text-xl font-bold text-[#e5e2e1]">Unable to Load Trending Title</h2>
                <p className="text-xs text-[#e9bcb6]/80 leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          ) : topFiveTrending.length === 0 ? (
            /* Empty Results Hero State */
            <div className="w-full min-h-[460px] bg-[#1a1a1a] flex items-center justify-center p-6 border-b border-[#353534]">
              <div className="text-center">
                <p className="text-sm text-[#e9bcb6]">No trending TV titles found at this moment.</p>
                <a
                  href="/discover"
                  className="mt-3 inline-block px-5 py-2 rounded-xl bg-[#e50914] text-white text-xs font-bold"
                >
                  Browse Catalog
                </a>
              </div>
            </div>
          ) : (
            /* Dynamic Top 5 Trending Hero Slider */
            <>
              {/* Carousel Slides Container */}
              <div className="relative w-full min-h-[620px] lg:min-h-[680px]">
                {topFiveTrending.map((show, index) => {
                  const isActive = index === safeActiveIndex;
                  const backdrop = show.backdropPath || show.posterPath || DEFAULT_BACKDROP;
                  const isBookmarked = Boolean(bookmarkedIds[show.id]);
                  const ratingDisplay =
                    show.voteAverage && show.voteAverage > 0 ? show.voteAverage.toFixed(1) : 'NR';
                  const releaseYear = show.firstAirDate
                    ? show.firstAirDate.split('-')[0]
                    : show.releaseDate
                    ? show.releaseDate.split('-')[0]
                    : 'TV Series';
                  const genresDisplay =
                    show.genres && show.genres.length > 0
                      ? show.genres.slice(0, 3).join(' · ')
                      : 'Television Series';

                  return (
                    <div
                      key={show.id}
                      aria-hidden={!isActive}
                      className={`transition-opacity duration-700 ease-out flex items-center w-full min-h-[620px] lg:min-h-[680px] ${
                        isActive
                          ? 'opacity-100 relative z-10'
                          : 'opacity-0 pointer-events-none absolute inset-0 z-0'
                      }`}
                    >
                      {/* Backdrop Keyframe with Multi-stop Scrim Gradients */}
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                        style={{
                          backgroundImage: `url('${backdrop}')`,
                        }}
                      >
                        {/* Gradient overlays matching Stitch reference */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/60 to-[#0e0e0e]/40" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e] via-[#0e0e0e]/85 to-transparent w-full md:w-3/4" />
                        <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#0e0e0e]/80 to-transparent" />
                      </div>

                      {/* Slide Content */}
                      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[140px] pb-12 flex flex-col justify-end lg:justify-center">
                        <div className="max-w-2xl flex flex-col gap-3.5">
                          {/* Trending Tag & Metadata Signals */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#e50914] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#e50914]/30">
                              <span
                                className="material-symbols-outlined text-sm"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                local_fire_department
                              </span>
                              <span>#{index + 1} Trending on PopCho</span>
                            </span>

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#2a2a2a]/90 backdrop-blur-md text-[#e5e2e1] text-xs font-semibold border border-[#353534]/50">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#70dc8e] opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#008442]" />
                              </span>
                              <span>{show.hubBadge || 'Community Hub Active'}</span>
                            </div>

                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#201f1f]/80 text-[#e9bcb6] text-xs font-semibold border border-[#353534]/50">
                              <span
                                className="material-symbols-outlined text-sm text-[#ffb4aa]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                              <span className="font-bold text-[#e5e2e1]">{ratingDisplay}</span>
                              {show.voteCount > 0 && (
                                <span className="opacity-70 text-[11px]">
                                  ({show.voteCount.toLocaleString()} votes)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title & Metadata */}
                          <div>
                            <p className="text-xs uppercase tracking-widest text-[#ffb4aa] font-semibold mb-1">
                              {genresDisplay} • {releaseYear} • {show.statusText || 'TV Series'}
                            </p>
                            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#e5e2e1] tracking-tight uppercase leading-none drop-shadow-2xl select-none mb-1 break-words">
                              {show.title}
                            </h1>
                          </div>

                          {/* Overview */}
                          <p className="text-sm sm:text-base text-[#e9bcb6]/90 max-w-2xl leading-relaxed drop-shadow line-clamp-3">
                            {show.overview}
                          </p>

                          {/* Call-To-Action Row */}
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                              type="button"
                              tabIndex={isActive ? 0 : -1}
                              onClick={() => onJoinHub(show)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white font-bold text-sm shadow-xl shadow-[#e50914]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                              <span
                                className="material-symbols-outlined text-xl"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                forum
                              </span>
                              <span>Join Community Discussion</span>
                            </button>

                            <button
                              type="button"
                              tabIndex={isActive ? 0 : -1}
                              onClick={() => onViewReviews(show)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2a2a2a]/90 hover:bg-[#353534] text-[#e5e2e1] font-semibold text-sm backdrop-blur-md transition-all border border-[#353534] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                              <span className="material-symbols-outlined text-xl text-[#ffb4aa]">
                                rate_review
                              </span>
                              <span>Read Fan Reviews</span>
                            </button>

                            <button
                              type="button"
                              tabIndex={isActive ? 0 : -1}
                              onClick={() => {
                                onToggleBookmark(show.id);
                                setNotificationToast?.(
                                  isBookmarked
                                    ? `Removed ${show.title} from Watchlist`
                                    : `Added ${show.title} to Watchlist`
                                );
                              }}
                              className={`p-3 rounded-xl transition-all shadow-sm border border-[#353534] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                isBookmarked
                                  ? 'bg-[#e50914] text-white'
                                  : 'bg-[#2a2a2a]/80 hover:bg-[#353534] text-[#e9bcb6] hover:text-white'
                              }`}
                              title={isBookmarked ? `Remove ${show.title}` : `Bookmark ${show.title}`}
                              aria-label={
                                isBookmarked
                                  ? `Remove ${show.title} from Watchlist`
                                  : `Bookmark ${show.title}`
                              }
                            >
                              <span className="material-symbols-outlined text-xl">
                                {isBookmarked ? 'bookmark_added' : 'bookmark_border'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Floating Edge Prev & Next Arrow Controls */}
                {slideCount > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      aria-label="Previous trending show"
                      className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0e0e0e]/85 hover:bg-[#2a2a2a] text-[#e5e2e1] flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-2xl border border-[#353534]/70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                    >
                      <span className="material-symbols-outlined text-2xl">chevron_left</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextSlide}
                      aria-label="Next trending show"
                      className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0e0e0e]/85 hover:bg-[#2a2a2a] text-[#e5e2e1] flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-2xl border border-[#353534]/70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                    >
                      <span className="material-symbols-outlined text-2xl">chevron_right</span>
                    </button>
                  </>
                )}
              </div>

              {/* Carousel Bottom Thumbnails & Switcher Bar */}
              {slideCount > 0 && (
                <nav
                  aria-label="Top 5 Trending Shows selector"
                  className="relative z-20 w-full bg-[#0e0e0e]/95 backdrop-blur-md py-3 px-4 sm:px-6 lg:px-8 border-t border-[#353534]/60"
                >
                  <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {topFiveTrending.map((show, index) => {
                      const isActive = index === safeActiveIndex;
                      const thumbSrc = show.posterPath || show.backdropPath || DEFAULT_POSTER;
                      const year =
                        show.firstAirDate?.split('-')[0] || show.releaseDate?.split('-')[0] || 'TV';
                      const rating =
                        show.voteAverage && show.voteAverage > 0
                          ? `★ ${show.voteAverage.toFixed(1)}`
                          : 'Trending';

                      return (
                        <button
                          key={show.id}
                          type="button"
                          onClick={() => handleSelectSlide(index)}
                          aria-current={isActive ? 'true' : undefined}
                          aria-label={`Trending #${index + 1}: ${show.title}`}
                          className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all flex-shrink-0 group w-48 sm:w-56 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                            isActive
                              ? 'bg-[#201f1f] ring-1 ring-[#e50914] shadow-lg shadow-[#e50914]/15'
                              : 'bg-[#0e0e0e] hover:bg-[#1a1a1a] opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#2a2a2a] flex-shrink-0 relative">
                            <img
                              src={thumbSrc}
                              alt=""
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                              }}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <span
                              className={`absolute top-0.5 left-0.5 text-[9px] font-black px-1 rounded shadow-sm ${
                                isActive ? 'bg-[#e50914] text-white' : 'bg-[#2a2a2a] text-[#e5e2e1]'
                              }`}
                            >
                              #{index + 1}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[10px] sm:text-[11px] uppercase font-bold truncate transition-colors ${
                                isActive
                                  ? 'text-[#ffb4aa]'
                                  : 'text-[#e9bcb6]/60 group-hover:text-[#e9bcb6]'
                              }`}
                            >
                              Trending #{index + 1}
                            </p>
                            <p className="text-xs font-bold text-[#e5e2e1] truncate group-hover:text-white">
                              {show.title}
                            </p>
                            <p className="text-[10px] text-[#e9bcb6]/60 truncate">
                              {rating} • {year}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </nav>
              )}
            </>
          )}
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

              <a
                href="/discover"
                className="hidden lg:flex items-center gap-1.5 text-xs text-[#e9bcb6] hover:text-[#e5e2e1] shrink-0 px-3 py-1 rounded-full bg-[#201f1f] border border-[#353534]/50 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span>All Filters</span>
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. TOP-FIVE TRENDING TV SHOWS CAROUSEL (DYNAMIC FROM TMDB WEEKLY)        */}
        {/* ========================================================================= */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <h2 className="text-2xl font-bold text-[#e5e2e1]">Top 5 Trending TV Shows</h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Functional Carousel Prev/Next Controls */}
              <div className="flex items-center gap-1.5 bg-[#201f1f] p-1 rounded-xl border border-[#353534]/60">
                <button
                  type="button"
                  onClick={() => handleScroll('prev')}
                  disabled={!canScrollLeft}
                  aria-label="Previous trending shows"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#e5e2e1] hover:bg-[#2a2a2a] transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('next')}
                  disabled={!canScrollRight}
                  aria-label="Next trending shows"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#e5e2e1] hover:bg-[#2a2a2a] transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>

              <a
                href="/discover"
                className="text-xs sm:text-sm font-semibold text-[#ffb4aa] hover:text-[#e5e2e1] flex items-center gap-0.5 transition-colors"
              >
                <span>Explore All Hubs</span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </a>
            </div>
          </div>

          {/* Carousel Viewport Container */}
          {isLoading ? (
            /* Carousel Loading Skeletons */
            <div className="flex items-stretch gap-4 sm:gap-5 overflow-hidden py-2 px-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-[220px] sm:w-[240px] md:w-[260px] aspect-[2/3] rounded-2xl bg-[#201f1f] border border-[#353534] animate-pulse shrink-0"
                />
              ))}
            </div>
          ) : error && topFiveTrending.length === 0 ? (
            /* Carousel Error State */
            <div className="p-8 rounded-2xl bg-[#201f1f] border border-[#353534] text-center">
              <p className="text-sm text-[#e9bcb6] mb-3">Unable to load trending TV shows right now.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl bg-[#e50914] text-white font-bold text-xs hover:bg-[#b2000d] transition-all cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : topFiveTrending.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#201f1f] border border-[#353534] text-center text-xs text-[#e9bcb6]">
              No trending shows available.
            </div>
          ) : (
            /* Accessible, Scrollable Horizontal Carousel */
            <div
              ref={carouselRef}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="region"
              aria-label="Top 5 Trending TV Shows Carousel"
              className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto scroll-smooth scrollbar-none snap-x snap-mandatory py-2 px-1 focus:outline-none focus:ring-1 focus:ring-[#e50914]/40 rounded-2xl"
            >
              {topFiveTrending.map((show, index) => (
                <ShowCard
                  key={show.id}
                  show={show}
                  viewMode="carousel"
                  rank={index + 1}
                  isBookmarked={Boolean(bookmarkedIds[show.id])}
                  onToggleBookmark={onToggleBookmark}
                  onJoinHub={onJoinHub}
                  onViewReviews={onViewReviews}
                />
              ))}
            </div>
          )}
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
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#e5e2e1]">
                      Live Fan Pulse — Hot Discussions
                    </h2>
                    <p className="text-xs text-[#e9bcb6]/70">
                      Top 4 most-liked community discussions across all fandoms
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#e9bcb6]">
                  <span className="w-2 h-2 rounded-full bg-[#70dc8e] animate-pulse" />
                  <span>Real-time stream</span>
                </div>
              </div>

              {isLoadingPulse ? (
                /* Pulse Feed Loading Skeletons */
                <div className="flex flex-col gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={`pulse-skel-${i}`}
                      className="p-5 rounded-2xl bg-[#201f1f] border border-[#353534] animate-pulse"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#2a2a2a]" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-32 bg-[#2a2a2a] rounded" />
                          <div className="h-2.5 w-24 bg-[#2a2a2a] rounded" />
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="h-3 w-full bg-[#2a2a2a] rounded" />
                        <div className="h-3 w-4/5 bg-[#2a2a2a] rounded" />
                      </div>
                      <div className="h-4 w-28 bg-[#2a2a2a] rounded" />
                    </div>
                  ))}
                </div>
              ) : pulseError && discussions.length === 0 ? (
                /* Pulse Feed Error State */
                <div className="p-8 rounded-2xl bg-[#201f1f] border border-[#353534] text-center">
                  <p className="text-sm text-[#e9bcb6] mb-3">{pulseError}</p>
                  <button
                    type="button"
                    onClick={fetchPulse}
                    className="px-4 py-2 rounded-xl bg-[#e50914] text-white font-bold text-xs hover:bg-[#b2000d] transition-all cursor-pointer"
                  >
                    Retry Feed
                  </button>
                </div>
              ) : discussions.length === 0 ? (
                /* Pulse Feed Empty State */
                <div className="p-8 rounded-2xl bg-[#201f1f] border border-[#353534] text-center">
                  <span className="material-symbols-outlined text-3xl text-[#e9bcb6]/60 mb-2">forum</span>
                  <p className="text-sm font-semibold text-[#e5e2e1] mb-1">
                    No active community discussions found.
                  </p>
                  <p className="text-xs text-[#e9bcb6]/80 mb-4">
                    Join a show hub to start a live discussion with fellow fans!
                  </p>
                  <Link
                    to="/communities"
                    className="inline-block px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all shadow-md"
                  >
                    Browse Community Hubs
                  </Link>
                </div>
              ) : (
                /* Dynamic Persisted Community Discussions (Top 4 Most Liked) */
                discussions.slice(0, 4).map((discussion) => {
                  const isMenuOpen = activeOverflowMenuId === discussion.id;
                  const isAuthor = user?.id === discussion.author.id;
                  const formattedTime = new Date(discussion.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <article
                      key={discussion.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#201f1f] hover:bg-[#252424] transition-all border border-[#353534] shadow-sm relative group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-[#353534]"
                              alt={discussion.author.name}
                              src={discussion.author.avatar || DEFAULT_POSTER}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw';
                              }}
                            />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#70dc8e] ring-2 ring-[#201f1f]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-[#e5e2e1] truncate">
                                {discussion.author.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#e50914]/20 text-[#ffb4aa] text-[10px] font-bold shrink-0">
                                {discussion.author.badge}
                              </span>
                              <span className="text-xs text-[#e9bcb6] shrink-0">in</span>
                              <span className="text-xs font-semibold text-[#e5e2e1] truncate">
                                {discussion.show.title}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#e9bcb6]/70 block truncate">
                              {formattedTime} • #{discussion.channel.name}
                            </span>
                          </div>
                        </div>

                        {/* Overflow Actions Menu */}
                        <div className="relative discussion-overflow-container shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveOverflowMenuId(isMenuOpen ? null : discussion.id)
                            }
                            aria-label="Discussion options"
                            className="text-[#e9bcb6] hover:text-white p-1 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-lg">more_horiz</span>
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#1c1b1b] border border-[#353534] rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveOverflowMenuId(null);
                                  handleShareDiscussion(discussion);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs text-[#e5e2e1] hover:bg-[#282727] flex items-center gap-2 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">share</span>
                                <span>Copy Link</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveOverflowMenuId(null);
                                  onJoinHub(discussion.show as unknown as MediaItem);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs text-[#e5e2e1] hover:bg-[#282727] flex items-center gap-2 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">forum</span>
                                <span>Open Fandom Hub</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveOverflowMenuId(null);
                                  setNotificationToast?.(
                                    'Discussion reported for community guidelines review.'
                                  );
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs text-[#e9bcb6] hover:bg-[#282727] flex items-center gap-2 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">flag</span>
                                <span>Report Thread</span>
                              </button>
                              {isAuthor && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDiscussion(discussion.id)}
                                  className="w-full px-3.5 py-2 text-left text-xs text-[#ffb4aa] hover:bg-[#e50914]/20 flex items-center gap-2 border-t border-[#353534]/50 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                  <span>Delete Post</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-[#e5e2e1] mb-3 leading-relaxed whitespace-pre-wrap">
                        {discussion.content}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-[#353534]/50 flex-wrap gap-2">
                        <div className="flex items-center gap-4 text-xs text-[#e9bcb6]">
                          {/* Heart / Like Action */}
                          <button
                            type="button"
                            onClick={() => handleTogglePulseLike(discussion)}
                            className={`flex items-center gap-1 transition-colors cursor-pointer ${
                              discussion.isLiked ? 'text-[#e50914]' : 'hover:text-[#e50914]'
                            }`}
                            aria-label={discussion.isLiked ? 'Unlike discussion' : 'Like discussion'}
                          >
                            <span
                              className="material-symbols-outlined text-base"
                              style={{
                                fontVariationSettings: discussion.isLiked ? "'FILL' 1" : "'FILL' 0",
                              }}
                            >
                              favorite
                            </span>
                            <span>{discussion.likeCount}</span>
                          </button>

                          {/* Replies Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenReplies(discussion)}
                            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                            aria-label={`View ${discussion.replyCount} replies`}
                          >
                            <span className="material-symbols-outlined text-base">chat_bubble</span>
                            <span>{discussion.replyCount} {discussion.replyCount === 1 ? 'reply' : 'replies'}</span>
                          </button>

                          {/* Share Action */}
                          <button
                            type="button"
                            onClick={() => handleShareDiscussion(discussion)}
                            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                            aria-label="Share discussion link"
                          >
                            <span className="material-symbols-outlined text-base">share</span>
                            <span>Share</span>
                          </button>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full bg-[#2a2a2a] text-[10px] font-semibold text-[#70dc8e] border border-[#353534]">
                          {discussion.categoryTag}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Secondary Right Sidebar: Synchronized Watch Parties & Fandom Leaderboard */}
            <aside className="lg:col-span-4 flex flex-col gap-4">
              {/* Synchronized Watchroom Card */}
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
                    FEATURE
                  </span>
                </div>

                {/* Watchroom Media Mini Hero */}
                <div
                  className="w-full h-36 rounded-xl bg-cover bg-center relative mb-3 overflow-hidden flex items-end p-3 border border-[#353534]"
                  style={{
                    backgroundImage: `url('${featuredShow?.backdropPath || featuredShow?.posterPath || DEFAULT_BACKDROP}')`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent" />
                  <div className="relative z-10">
                    <span className="text-[10px] text-[#ffb4aa] font-extrabold uppercase">
                      {featuredShow ? `${featuredShow.title} Hub` : 'Community Room'}
                    </span>
                    <h4 className="text-sm font-bold text-[#e5e2e1] line-clamp-1">
                      {featuredShow ? `Sync Playback: ${featuredShow.title}` : 'Live Watch Party'}
                    </h4>
                  </div>
                </div>

                {/* Feature Description */}
                <p className="text-xs text-[#e9bcb6]/80 mb-4 leading-relaxed">
                  Sync playback down to the millisecond with fellow fans, featuring real-time commentary and spoiler-protected chat channels.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (featuredShow) {
                      onJoinHub(featuredShow);
                    } else {
                      setNotificationToast?.('Select a trending title to join its watchroom.');
                    }
                  }}
                  disabled={isLoading || !featuredShow}
                  className="w-full py-2.5 rounded-xl bg-[#e50914] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#b2000d] transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_circle
                  </span>
                  <span>{isLoading ? 'Loading Watchroom...' : 'Join Watch Party'}</span>
                </button>
              </div>

              {/* Weekly Top Theorists Module */}
              <div className="p-5 rounded-2xl bg-[#201f1f] border border-[#353534] shadow-md">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-[#e5e2e1]">Top Theorists</h3>
                    <span className="text-[10px] text-[#e9bcb6]/70 uppercase font-semibold">
                      Ranked by Upvotes & Activity
                    </span>
                  </div>

                  {/* Period filter buttons */}
                  <div className="flex items-center gap-1 bg-[#131313] p-0.5 rounded-lg border border-[#353534]/50">
                    <button
                      type="button"
                      onClick={() => setLeaderboardPeriod('week')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        leaderboardPeriod === 'week'
                          ? 'bg-[#353534] text-white shadow-sm'
                          : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
                      }`}
                    >
                      Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaderboardPeriod('all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        leaderboardPeriod === 'all'
                          ? 'bg-[#353534] text-white shadow-sm'
                          : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isLoadingLeaderboard ? (
                    /* Skeletons */
                    [1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl animate-pulse">
                        <div className="flex items-center gap-2.5">
                          <div className="w-4 h-4 bg-[#2a2a2a] rounded" />
                          <div className="w-8 h-8 rounded-full bg-[#2a2a2a]" />
                          <div className="space-y-1">
                            <div className="w-24 h-3 bg-[#2a2a2a] rounded" />
                            <div className="w-16 h-2 bg-[#2a2a2a] rounded" />
                          </div>
                        </div>
                        <div className="w-14 h-3 bg-[#2a2a2a] rounded" />
                      </div>
                    ))
                  ) : theorists.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#e9bcb6]/70">
                      No theorist activity recorded yet for {leaderboardPeriod === 'week' ? 'this week' : 'all time'}.
                    </div>
                  ) : (
                    theorists.map((theorist) => (
                      <div
                        key={theorist.userId}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-[#2a2a2a] transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`text-xs font-bold w-4 text-center shrink-0 ${
                              theorist.rank === 1 ? 'text-[#e50914]' : 'text-[#e9bcb6]'
                            }`}
                          >
                            {theorist.rank}
                          </span>
                          <img
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#353534]"
                            alt={theorist.displayName}
                            src={theorist.avatarUrl || DEFAULT_POSTER}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://lh3.googleusercontent.com/aida-public/AB6AXuC3upIvtvlmHlQa683B9aMVf93Ml1X6cs0NyiUI-RA3yvU0sf23xWAB53k_DjoFPDhPWqGdBzTu54XNKBJnyyTy8gkOxHI_etWfUiCgCNxOR-f6Z6AzTFYkFK9oKyth8JACRxWTsznGLpOPjLbGtW79W0KtdYNBX_l4GW3omVo9vR3aTQFqjEuZnYy87YPlUBkNHi0qYkAxASXwpaBkpI2nuDLiCgMCMPiIGOhfpivh9Jom9FL5MDzdXA';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#e5e2e1] truncate">
                              @{theorist.username || theorist.displayName.replace(/\s+/g, '')}
                            </div>
                            <div className="text-[10px] text-[#e9bcb6]/70 truncate">
                              {theorist.activitySummary || theorist.badge || 'Active Theorist'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-[#70dc8e] font-bold shrink-0 ml-2">
                          +{theorist.formattedPoints || theorist.points.toLocaleString()} pts
                        </span>
                      </div>
                    ))
                  )}
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

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/reviews"
                className="text-xs sm:text-sm font-semibold text-[#ffb4aa] hover:text-[#e5e2e1] flex items-center gap-0.5 transition-colors"
              >
                <span>Explore All Reviews</span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </Link>

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
        </div>

          {/* 3-Column Reviews Grid */}
          {isLoadingReviews ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={`review-skel-${i}`}
                  className="flex flex-col justify-between p-5 rounded-2xl bg-[#201f1f] border border-[#353534] animate-pulse h-64"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-24 h-4 bg-[#2a2a2a] rounded" />
                      <div className="w-28 h-4 bg-[#2a2a2a] rounded" />
                    </div>
                    <div className="w-3/4 h-5 bg-[#2a2a2a] rounded mb-3" />
                    <div className="space-y-2">
                      <div className="w-full h-3 bg-[#2a2a2a] rounded" />
                      <div className="w-5/6 h-3 bg-[#2a2a2a] rounded" />
                      <div className="w-4/6 h-3 bg-[#2a2a2a] rounded" />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#353534]/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#2a2a2a]" />
                      <div className="space-y-1">
                        <div className="w-20 h-3 bg-[#2a2a2a] rounded" />
                        <div className="w-14 h-2 bg-[#2a2a2a] rounded" />
                      </div>
                    </div>
                    <div className="w-16 h-3 bg-[#2a2a2a] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviewsError && featuredReviews.length === 0 ? (
            /* Error State */
            <div className="p-8 rounded-2xl bg-[#201f1f] border border-[#353534] text-center">
              <p className="text-sm text-[#e9bcb6] mb-3">{reviewsError}</p>
              <button
                type="button"
                onClick={() => fetchReviews(activeReviewTab)}
                className="px-4 py-2 rounded-xl bg-[#e50914] text-white font-bold text-xs hover:bg-[#b2000d] transition-all cursor-pointer"
              >
                Retry Loading Reviews
              </button>
            </div>
          ) : featuredReviews.length === 0 ? (
            /* Empty State */
            <div className="p-8 rounded-2xl bg-[#201f1f] border border-[#353534] text-center">
              <span className="material-symbols-outlined text-3xl text-[#e9bcb6]/60 mb-2">rate_review</span>
              <p className="text-sm font-semibold text-[#e5e2e1] mb-1">
                No fan reviews found for {activeReviewTab === 'week' ? 'this week' : activeReviewTab === 'helpful' ? 'most helpful' : 'all time'}.
              </p>
              <p className="text-xs text-[#e9bcb6]/80 mb-4">
                Be the first to share an in-depth critique!
              </p>
              <Link
                to="/reviews"
                className="inline-block px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all shadow-md"
              >
                Write a Review
              </Link>
            </div>
          ) : (
            /* Dynamic Persisted Reviews Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredReviews.map((review) => {
                const fullStars = Math.floor(review.rating);
                const hasHalf = review.rating % 1 >= 0.5;
                const isLiked = Boolean(review.isHelpfulLiked || helpfulLikedIds[review.id]);

                return (
                  <article
                    key={review.id}
                    className="flex flex-col justify-between p-5 rounded-2xl bg-[#201f1f] hover:bg-[#252424] transition-all border border-[#353534] shadow-md group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        {/* Dynamic Star Ratings (0.5 to 5.0) */}
                        <div
                          className="flex items-center gap-0.5 text-[#e50914]"
                          aria-label={`Rating: ${review.rating} out of 5 stars`}
                        >
                          {[1, 2, 3, 4, 5].map((starIdx) => {
                            if (starIdx <= fullStars) {
                              return (
                                <span
                                  key={starIdx}
                                  className="material-symbols-outlined text-base"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  star
                                </span>
                              );
                            } else if (starIdx === fullStars + 1 && hasHalf) {
                              return (
                                <span
                                  key={starIdx}
                                  className="material-symbols-outlined text-base"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  star_half
                                </span>
                              );
                            } else {
                              return (
                                <span
                                  key={starIdx}
                                  className="material-symbols-outlined text-base text-[#353534]"
                                >
                                  star
                                </span>
                              );
                            }
                          })}
                        </div>

                        {/* Associated Show / Movie Badge */}
                        <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[10px] font-semibold text-[#e9bcb6] border border-[#353534]/50 truncate max-w-[150px]">
                          {review.showTitle}
                        </span>
                      </div>

                      <h3
                        onClick={() => {
                          onViewReviews({
                            id: review.tmdbId,
                            tmdbId: review.tmdbId,
                            title: review.showTitle,
                            overview: review.headline || '',
                            mediaType: review.mediaType,
                            posterPath: review.showPoster || '',
                            backdropPath: review.showBackdrop || '',
                            voteAverage: review.rating * 2,
                            voteCount: review.helpfulCount || 0,
                            genres: [],
                          });
                        }}
                        className="text-sm sm:text-base font-bold text-[#e5e2e1] mb-2 leading-snug line-clamp-2 hover:text-[#ffb4aa] cursor-pointer transition-colors"
                        title={review.headline}
                      >
                        "{review.headline}"
                      </h3>

                      <p className="text-xs text-[#e9bcb6]/85 line-clamp-4 mb-4 leading-relaxed whitespace-pre-wrap">
                        {review.content}
                      </p>
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-[#353534]/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#353534]"
                          alt={review.userName}
                          src={review.userAvatar || DEFAULT_POSTER}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://lh3.googleusercontent.com/aida-public/AB6AXuCPydkwqWNN6tj9GbMhzG6uSNXj31_cdN0JwnwekGiWcHRAEgq4t6TIFl-5gn9E22QdEfwNU4In0__bICGcEaYJOHdqq9yZDm4ICgoIs3ZvdyXHYivvd06N-ZeA_YCEU3W4BnYb2-gFH_Cb1szUT4En-x9B2Eyn7gAzADXcZr1o9msSwtkjkauCiD06thQHjRZquLDDtx8c45nsn2nACKyTBQXxt-qsPe69SInQEOAWUNg6eaLuEqfffw';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#e5e2e1] flex items-center gap-1 truncate">
                            <span className="truncate">{review.userName}</span>
                            <span
                              className="material-symbols-outlined text-xs text-[#e50914] shrink-0"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                          </div>
                          <span className="text-[10px] text-[#ffb4aa] block truncate">
                            {review.userRole || 'Community Reviewer'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#e9bcb6]/80 shrink-0 ml-2">
                        {/* Helpful Vote Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleReviewHelpful(review.id)}
                          className={`flex items-center gap-1 transition-colors cursor-pointer ${
                            isLiked ? 'text-[#e50914]' : 'hover:text-[#e50914]'
                          }`}
                          aria-label={isLiked ? 'Remove helpful vote' : 'Mark as helpful'}
                        >
                          <span
                            className="material-symbols-outlined text-sm"
                            style={{
                              fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0",
                            }}
                          >
                            thumb_up
                          </span>
                          <span>{review.helpfulCount}</span>
                        </button>

                        {/* Responses Count */}
                        <button
                          type="button"
                          onClick={() => {
                            onViewReviews({
                              id: review.tmdbId,
                              tmdbId: review.tmdbId,
                              title: review.showTitle,
                              overview: review.headline || '',
                              mediaType: review.mediaType,
                              posterPath: review.showPoster || '',
                              backdropPath: review.showBackdrop || '',
                              voteAverage: review.rating * 2,
                              voteCount: review.helpfulCount || 0,
                              genres: [],
                            });
                          }}
                          className="flex items-center gap-1 hover:text-[#e5e2e1] transition-colors cursor-pointer"
                          aria-label={`View discussion for ${review.showTitle}`}
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          <span>{review.responsesCount}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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

        {/* ========================================================================= */}
        {/* 7. LIVE FAN PULSE REPLIES DRAWER / MODAL                                  */}
        {/* ========================================================================= */}
        {activeReplyDiscussion && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reply-modal-title"
            onClick={() => setActiveReplyDiscussion(null)}
          >
            <div
              className="bg-[#1c1b1b] border border-[#353534] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-[#353534] flex items-center justify-between gap-3 bg-[#201f1f]">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-[#353534]"
                    alt={activeReplyDiscussion.author.name}
                    src={activeReplyDiscussion.author.avatar || DEFAULT_POSTER}
                  />
                  <div className="min-w-0">
                    <h3 id="reply-modal-title" className="text-sm font-bold text-[#e5e2e1] truncate">
                      Discussion Thread
                    </h3>
                    <p className="text-xs text-[#e9bcb6]/70 truncate">
                      Started by {activeReplyDiscussion.author.name} in {activeReplyDiscussion.show.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveReplyDiscussion(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#e9bcb6] hover:text-white hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                  aria-label="Close replies drawer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Original Discussion Excerpt */}
              <div className="p-4 bg-[#141414] border-b border-[#353534]/50">
                <p className="text-xs sm:text-sm text-[#e5e2e1] leading-relaxed whitespace-pre-wrap">
                  {activeReplyDiscussion.content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#2a2a2a] text-[10px] font-semibold text-[#70dc8e] border border-[#353534]">
                    {activeReplyDiscussion.categoryTag}
                  </span>
                  <span className="text-[11px] text-[#e9bcb6]/60">
                    #{activeReplyDiscussion.channel.name}
                  </span>
                </div>
              </div>

              {/* Replies List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#e9bcb6]/60 mb-2">
                  Replies ({replies.length})
                </div>

                {isLoadingReplies ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#201f1f] animate-pulse space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#2a2a2a]" />
                          <div className="w-24 h-3 bg-[#2a2a2a] rounded" />
                        </div>
                        <div className="w-full h-3 bg-[#2a2a2a] rounded" />
                      </div>
                    ))}
                  </div>
                ) : replyError && replies.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#ffb4aa] bg-[#e50914]/10 rounded-xl border border-[#e50914]/20">
                    {replyError}
                  </div>
                ) : replies.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#e9bcb6]/70">
                    No replies yet. Be the first to join the conversation!
                  </div>
                ) : (
                  replies.map((reply) => {
                    const replyTime = new Date(reply.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={reply.id}
                        className="p-3.5 rounded-xl bg-[#201f1f] border border-[#353534]/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-[#353534]"
                              alt={reply.author.name}
                              src={reply.author.avatar || DEFAULT_POSTER}
                            />
                            <span className="text-xs font-bold text-[#e5e2e1] truncate">
                              {reply.author.name}
                            </span>
                            <span className="text-[10px] text-[#ffb4aa] bg-[#e50914]/20 px-1.5 py-0.5 rounded font-semibold shrink-0">
                              {reply.author.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#e9bcb6]/60 shrink-0">
                            {replyTime}
                          </span>
                        </div>
                        <p className="text-xs text-[#e5e2e1] leading-relaxed whitespace-pre-wrap pl-8">
                          {reply.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Form */}
              <div className="p-4 border-t border-[#353534] bg-[#201f1f]">
                {replyError && (
                  <p className="text-xs text-[#ffb4aa] mb-2">{replyError}</p>
                )}

                {user ? (
                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      value={replyInputText}
                      onChange={(e) => setReplyInputText(e.target.value)}
                      placeholder="Write a constructive reply..."
                      disabled={isSubmittingReply}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#131313] border border-[#353534] text-xs text-[#e5e2e1] placeholder-[#e9bcb6]/50 focus:outline-none focus:border-[#e50914] transition-colors"
                      maxLength={500}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingReply || !replyInputText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#e50914] text-white font-bold text-xs hover:bg-[#b2000d] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      {isSubmittingReply ? 'Sending...' : 'Reply'}
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#131313] border border-[#353534]/50">
                    <span className="text-xs text-[#e9bcb6]">
                      Sign in to reply to this discussion.
                    </span>
                    <button
                      type="button"
                      onClick={() => openAuthModal()}
                      className="px-3.5 py-1.5 rounded-lg bg-[#e50914] text-white text-xs font-bold hover:bg-[#b2000d] transition-all cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
