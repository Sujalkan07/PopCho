import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MediaItem } from '../services/tmdb/types';
import { getTrendingTvShows } from '../services/tmdb/tv';
import { DEFAULT_BACKDROP, DEFAULT_POSTER } from '../services/tmdb/client';
import { ShowCard } from '../components/directory/ShowCard';

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
                    setNotificationToast?.(
                      featuredShow
                        ? `Synchronized watchroom initialized for "${featuredShow.title}".`
                        : 'Synchronized watchroom session initialized.'
                    );
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

            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="/reviews"
                className="text-xs sm:text-sm font-semibold text-[#ffb4aa] hover:text-[#e5e2e1] flex items-center gap-0.5 transition-colors"
              >
                <span>Explore All Reviews</span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </a>

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
