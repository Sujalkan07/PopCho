import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { MediaItem } from '../services/tmdb/types';
import { getPopularTvShows, getTrendingTvShows } from '../services/tmdb/tv';
import { getPopularMovies, getTrendingMovies } from '../services/tmdb/movies';
import { searchMedia } from '../services/tmdb/search';
import { ShowCard } from '../components/directory/ShowCard';
import { GENRE_FILTERS } from '../components/directory/DirectoryControls';
import { listCommunities, type CommunityRecord } from '../services/community/api';

interface CommunitiesPageProps {
  bookmarkedIds: Record<string | number, boolean>;
  onToggleBookmark: (showId: string | number) => void;
  onJoinHub: (show: MediaItem) => void;
  onViewReviews: (show: MediaItem) => void;
  onRequestHub?: () => void;
  setNotificationToast?: (msg: string | null) => void;
}

export const CommunitiesPage: React.FC<CommunitiesPageProps> = ({
  bookmarkedIds,
  onToggleBookmark,
  onJoinHub,
  onViewReviews,
  onRequestHub,
  setNotificationToast,
}) => {
  // Directory layout, search & filter state
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get('search') || searchParams.get('q') || '';

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState<'active' | 'rating' | 'recent' | 'trending'>('active');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'tv' | 'movie'>('all');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data fetching state
  const [catalogItems, setCatalogItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search results state
  const [searchResults, setSearchResults] = useState<MediaItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Persistent database communities state
  const [dbCommunities, setDbCommunities] = useState<Record<string, CommunityRecord>>({});

  useEffect(() => {
    let isMounted = true;
    listCommunities({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        const map: Record<string, CommunityRecord> = {};
        for (const c of res.results) {
          map[`${c.mediaType}-${c.tmdbId}`] = c;
        }
        setDbCommunities(map);
      })
      .catch((err) => {
        console.warn('Could not load database communities:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Initial load: fetch authentic trending & popular TV + Movies directly from TMDB
  const loadInitialCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settled = await Promise.allSettled([
        getTrendingTvShows(1),
        getPopularTvShows(1),
        getTrendingMovies(1),
        getPopularMovies(1),
      ]);

      const trendTv = settled[0].status === 'fulfilled' ? settled[0].value : [];
      const popTv = settled[1].status === 'fulfilled' ? settled[1].value : [];
      const trendMovies = settled[2].status === 'fulfilled' ? settled[2].value : [];
      const popMovies = settled[3].status === 'fulfilled' ? settled[3].value : [];

      const batch = [...trendTv, ...popTv, ...trendMovies, ...popMovies];

      if (batch.length === 0) {
        const firstRejection = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
        const msg = firstRejection?.reason instanceof Error ? firstRejection.reason.message : 'Unable to connect to TMDB directory service.';
        setError(`${msg} Click retry to fetch live shows.`);
        return;
      }

      const seenKeys = new Set<string>();
      const combined: MediaItem[] = [];

      for (const item of batch) {
        const key = `${item.mediaType}-${item.tmdbId || item.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combined.push(item);
        }
      }

      setCatalogItems(combined);
      setPage(1);
      setHasMore(true);
    } catch (err: unknown) {
      console.error('Failed to load communities directory catalog from TMDB:', err);
      const msg = err instanceof Error ? err.message : 'Unable to connect to TMDB directory service.';
      setError(`${msg} Click retry to fetch live shows.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialCatalog();
  }, [loadInitialCatalog]);

  // Load more pagination
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || searchResults !== null) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const settled = await Promise.allSettled([
        getPopularTvShows(nextPage),
        getPopularMovies(nextPage),
      ]);

      const newTv = settled[0].status === 'fulfilled' ? settled[0].value : [];
      const newMovies = settled[1].status === 'fulfilled' ? settled[1].value : [];
      const batch = [...newTv, ...newMovies];
      if (batch.length === 0) {
        setHasMore(false);
      } else {
        setCatalogItems((prev) => {
          const seenKeys = new Set(prev.map((i) => `${i.mediaType}-${i.tmdbId || i.id}`));
          const unique = batch.filter((i) => !seenKeys.has(`${i.mediaType}-${i.tmdbId || i.id}`));
          if (unique.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...prev, ...unique];
        });
        setPage(nextPage);
      }
    } catch (err: unknown) {
      console.error('Pagination error in communities directory:', err);
      setNotificationToast?.('Unable to load more shows at this time.');
    } finally {
      setLoadingMore(false);
    }
  };

  const catalogRef = useRef(catalogItems);
  useEffect(() => {
    catalogRef.current = catalogItems;
  }, [catalogItems]);

  // Sync external search query from URL (e.g. from Navbar omnibox)
  useEffect(() => {
    if (urlSearchQuery !== searchQuery) {
      setSearchQuery(urlSearchQuery);
    }
  }, [urlSearchQuery, searchQuery]);

  // Focus search input on ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search effect with race-condition cancellation
  useEffect(() => {
    const clean = searchQuery.trim();
    if (clean.length < 2) {
      const timer = setTimeout(() => {
        setSearchResults(null);
        setIsSearching(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let isSubscribed = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMedia(clean, 1);
        if (!isSubscribed) return;
        setSearchResults(res.results);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        console.error('Communities directory search failed:', err);
        // Local client search fallback over already-loaded items
        const term = clean.toLowerCase();
        const fallback = (catalogRef.current || []).filter(
          (item) =>
            item.title.toLowerCase().includes(term) ||
            item.overview.toLowerCase().includes(term) ||
            item.genres.some((g) => g.toLowerCase().includes(term))
        );
        setSearchResults(fallback);
      } finally {
        if (isSubscribed) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Genre matcher helper
  const matchesGenre = useCallback((item: MediaItem, genreId: string): boolean => {
    if (genreId === 'all') return true;
    const lowerId = genreId.toLowerCase();
    const itemGenres = item.genres.map((g) => g.toLowerCase());

    if (lowerId === 'sci-fi & fantasy') {
      return itemGenres.some((g) => g.includes('sci-fi') || g.includes('fantasy'));
    }
    if (lowerId === 'psychological thriller') {
      return itemGenres.some((g) => g.includes('thriller') || g.includes('mystery'));
    }
    if (lowerId === 'dark mystery') {
      return itemGenres.some((g) => g.includes('mystery') || g.includes('horror'));
    }
    if (lowerId === 'crime & drama') {
      return itemGenres.some((g) => g.includes('crime') || g.includes('drama'));
    }
    if (lowerId === 'animation & anime') {
      return itemGenres.some((g) => g.includes('animation') || g.includes('anime'));
    }
    if (lowerId === 'dystopian') {
      return (
        itemGenres.some((g) => g.includes('sci-fi') || g.includes('dystopian')) ||
        item.overview.toLowerCase().includes('dystopian') ||
        item.overview.toLowerCase().includes('apocalypse')
      );
    }
    if (lowerId === 'comedy & satire') {
      return itemGenres.some((g) => g.includes('comedy'));
    }
    if (lowerId === 'action & adventure') {
      return itemGenres.some((g) => g.includes('action') || g.includes('adventure'));
    }

    return itemGenres.some((g) => g.includes(lowerId));
  }, []);

  // Compute genre counts over active base pool
  const basePool = searchResults !== null ? searchResults : catalogItems;

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const filter of GENRE_FILTERS) {
      if (filter.id === 'all') {
        counts[filter.id] = basePool.length;
      } else {
        counts[filter.id] = basePool.filter((item) => matchesGenre(item, filter.id)).length;
      }
    }
    return counts;
  }, [basePool, matchesGenre]);

  // Filtered and sorted items
  const displayedItems = useMemo(() => {
    let items = basePool.slice();

    // 1. Filter by Media Type (Advanced filter)
    if (mediaTypeFilter !== 'all') {
      items = items.filter((item) => item.mediaType === mediaTypeFilter);
    }

    // 2. Filter by Minimum Rating (Advanced filter)
    if (minRatingFilter > 0) {
      items = items.filter((item) => item.voteAverage >= minRatingFilter);
    }

    // 3. Filter by Selected Genre Chip
    if (selectedGenre !== 'all') {
      items = items.filter((item) => matchesGenre(item, selectedGenre));
    }

    // 4. Sort
    items.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.voteAverage || 0) - (a.voteAverage || 0);
      }
      if (sortBy === 'recent') {
        const dateA = a.releaseDate || a.firstAirDate || '';
        const dateB = b.releaseDate || b.firstAirDate || '';
        return dateB.localeCompare(dateA);
      }
      if (sortBy === 'trending') {
        return (b.voteCount || 0) - (a.voteCount || 0);
      }
      // 'active' / 'popular' default: prioritizes communityMembersCount or voteCount
      const scoreA = (a.communityMembersCount || 0) * 10 + (a.voteCount || 0);
      const scoreB = (b.communityMembersCount || 0) * 10 + (b.voteCount || 0);
      return scoreB - scoreA;
    });

    return items;
  }, [basePool, mediaTypeFilter, minRatingFilter, selectedGenre, sortBy, matchesGenre]);

  const activeAdvancedFilterCount =
    (mediaTypeFilter !== 'all' ? 1 : 0) + (minRatingFilter > 0 ? 1 : 0);

  return (
    <div className="w-full min-h-screen bg-[#131313] text-[#e5e2e1] -mt-[68px]">
      {/* Subtle Cinematic Atmospheric Glow */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[340px] bg-gradient-to-br from-[#e50914]/15 via-[#b2000d]/5 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
        <div className="absolute top-10 right-10 w-[420px] h-[280px] bg-gradient-to-bl from-[#ffb4aa]/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 flex flex-col gap-6">
          {/* Directory Controls Box */}
          <div className="flex flex-col gap-4 bg-[#1c1b1b] p-4 sm:p-5 rounded-2xl border border-[#353534] shadow-xl">
            {/* Search Row */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#e9bcb6]/70 pointer-events-none text-xl">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim()) {
                      setSearchParams({ search: val.trim() }, { replace: true });
                    } else {
                      setSearchParams({}, { replace: true });
                    }
                  }}
                  placeholder="Search by show title, network, creator, or sub-fandom (e.g. Severance, Lumon, HBO, Duffer Brothers)..."
                  className="w-full h-12 pl-12 pr-28 rounded-xl bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-sm sm:text-base border border-[#353534]/60 focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchParams({}, { replace: true });
                      }}
                      className="text-xs text-[#e9bcb6]/60 hover:text-white px-1.5 py-0.5 rounded hover:bg-[#201f1f]"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                  {isSearching ? (
                    <span className="w-4 h-4 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[#2a2a2a] text-[#e9bcb6] text-xs font-mono font-medium border border-[#353534]">
                      ⌘K
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-start">
                {/* Advanced Filters Button */}
                <button
                  type="button"
                  onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                  className={`flex items-center gap-2 h-12 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    isAdvancedFiltersOpen || activeAdvancedFilterCount > 0
                      ? 'bg-[#e50914]/20 border-[#e50914] text-white'
                      : 'bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e5e2e1] border-[#353534]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">tune</span>
                  <span>Advanced Filters</span>
                  {activeAdvancedFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#e50914] text-white text-xs font-bold flex items-center justify-center">
                      {activeAdvancedFilterCount}
                    </span>
                  )}
                </button>

                {/* Grid/List Layout Switcher */}
                <div className="flex items-center bg-[#0e0e0e] p-1 rounded-xl border border-[#353534]/80">
                  <button
                    type="button"
                    aria-label="Grid layout"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[#2a2a2a] text-[#e5e2e1] shadow-sm'
                        : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">grid_view</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Compact list layout"
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-[#2a2a2a] text-[#e5e2e1] shadow-sm'
                        : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">view_agenda</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Advanced Filters Drawer */}
            {isAdvancedFiltersOpen && (
              <div className="p-4 rounded-xl bg-[#0e0e0e] border border-[#353534] flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-200">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Media Type filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#e9bcb6]/70">Format:</span>
                    <div className="flex items-center bg-[#201f1f] rounded-lg p-0.5 border border-[#353534]">
                      {(['all', 'tv', 'movie'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setMediaTypeFilter(fmt)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                            mediaTypeFilter === fmt
                              ? 'bg-[#e50914] text-white shadow'
                              : 'text-[#e9bcb6] hover:text-white'
                          }`}
                        >
                          {fmt === 'all' ? 'All' : fmt === 'tv' ? 'TV Shows' : 'Movies'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#e9bcb6]/70">Min Rating:</span>
                    <select
                      value={minRatingFilter}
                      onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                      className="bg-[#201f1f] text-[#e5e2e1] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#353534] focus:outline-none cursor-pointer"
                    >
                      <option value={0}>Any Score</option>
                      <option value={7}>7.0+ ★ High Quality</option>
                      <option value={8}>8.0+ ★ Masterpiece</option>
                    </select>
                  </div>
                </div>

                {/* Reset Filters button */}
                <button
                  type="button"
                  onClick={() => {
                    setMediaTypeFilter('all');
                    setMinRatingFilter(0);
                    setSelectedGenre('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#ffb4ab] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Filter Chips / Genre Pills Scrollable Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {GENRE_FILTERS.map((genre) => {
                const isActive =
                  genre.id === 'all'
                    ? selectedGenre === 'all' || !selectedGenre
                    : selectedGenre === genre.id;

                const count = genreCounts[genre.id];

                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => setSelectedGenre(genre.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-[#e50914] text-white border-[#e50914] shadow-[0_0_10px_rgba(229,9,20,0.35)]'
                        : 'bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] border-[#353534]'
                    }`}
                  >
                    {genre.label}
                    {typeof count === 'number' && ` (${count})`}
                  </button>
                );
              })}
            </div>

            {/* Sorting & Results Count Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#353534]/50">
              <div className="flex items-center gap-2 text-[#e9bcb6]/80 text-xs sm:text-sm font-medium">
                <span>
                  Showing{' '}
                  <strong className="text-[#e5e2e1] font-bold">{displayedItems.length}</strong> of{' '}
                  <strong className="text-[#e5e2e1] font-bold">
                    {basePool.length.toLocaleString()}
                  </strong>{' '}
                  show hubs
                </span>
                <span className="text-[#353534]">•</span>
                <span className="text-[#70dc8e] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e] animate-pulse" />
                  Live Watchrooms Active
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <label
                  htmlFor="catalogSortSelect"
                  className="text-xs uppercase font-bold text-[#e9bcb6]/70 tracking-wider"
                >
                  Sort By
                </label>
                <div className="relative">
                  <select
                    id="catalogSortSelect"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'active' | 'rating' | 'recent' | 'trending')}
                    className="appearance-none bg-[#0e0e0e] text-[#e5e2e1] text-xs font-semibold py-1.5 pl-3 pr-8 rounded-xl border border-[#353534] focus:outline-none focus:border-[#e50914] cursor-pointer"
                  >
                    <option value="active">Most Popular &amp; Active</option>
                    <option value="rating">Highest Rated (All-Time)</option>
                    <option value="recent">Newest Releases</option>
                    <option value="trending">Trending This Week</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#e9bcb6]/70 pointer-events-none text-base">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Notice if any */}
          {error && (
            <div className="p-4 rounded-xl bg-[#201f1f] border border-[#e50914]/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[#ffdad6]">
                <span className="material-symbols-outlined text-[#e50914] text-base">warning</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={loadInitialCatalog}
                className="px-3 py-1 rounded-lg bg-[#e50914] text-white text-xs font-bold hover:bg-[#b2000d]"
              >
                Retry
              </button>
            </div>
          )}

          {/* Main Hub Catalog Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[16/10] rounded-2xl bg-[#201f1f] animate-pulse border border-[#353534]"
                />
              ))}
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#1c1b1b] border border-[#353534] text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-[#e9bcb6]/40">search_off</span>
              <h3 className="text-lg font-bold text-[#e5e2e1]">No show communities found</h3>
              <p className="text-xs text-[#e9bcb6]/70 max-w-md">
                No titles matched your current search or filters. Try adjusting your query or submit a petition to unlock a new community hub.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenre('all');
                    setMediaTypeFilter('all');
                    setMinRatingFilter(0);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2a2a2a] text-[#e5e2e1] text-xs font-bold hover:bg-[#353534]"
                >
                  Clear All Filters
                </button>
                {onRequestHub && (
                  <button
                    type="button"
                    onClick={onRequestHub}
                    className="px-4 py-2 rounded-xl bg-[#e50914] text-white text-xs font-bold hover:bg-[#b2000d]"
                  >
                    Request a Show Hub
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full'
                  : 'flex flex-col gap-4 w-full'
              }
            >
              {displayedItems.map((show) => {
                const key = `${show.mediaType}-${show.tmdbId || show.id}`;
                const dbRecord = dbCommunities[key];
                const enrichedShow: MediaItem = dbRecord
                  ? {
                      ...show,
                      communityMembersCount: dbRecord.memberCount || show.communityMembersCount,
                      channelsCount: dbRecord.channelCount || show.channelsCount,
                    }
                  : show;

                return (
                  <ShowCard
                    key={key}
                    show={enrichedShow}
                    viewMode={viewMode}
                    isBookmarked={Boolean(bookmarkedIds[show.id])}
                    isMember={Boolean(dbRecord?.isMember)}
                    onToggleBookmark={onToggleBookmark}
                    onJoinHub={onJoinHub}
                    onViewReviews={onViewReviews}
                  />
                );
              })}
            </div>
          )}

          {/* Load More Pagination */}
          {!loading && hasMore && searchResults === null && (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-sm font-bold transition-all shadow-md group border border-[#353534] cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading more shows...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg group-hover:translate-y-0.5 transition-transform">
                      expand_more
                    </span>
                    <span>Load More Show Hubs</span>
                  </>
                )}
              </button>
              <span className="text-xs text-[#e9bcb6]/60">
                Page {page} • Live TMDB Infinite Catalog
              </span>
            </div>
          )}

          {/* Curated Franchise & Cinematic Universes Bento Section (Stitch 4f6346944b7849b883e8343e530d09c5) */}
          <section className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#e50914]" />
                  <span className="text-xs uppercase tracking-wider text-[#e50914] font-bold">
                    Curated Hub Clusters
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl text-[#e5e2e1] font-extrabold tracking-tight">
                  Franchise &amp; Cinematic Universes
                </h3>
              </div>
              <p className="text-xs text-[#e9bcb6]/70">
                Discover interconnected lore trees across multi-show canons
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Spotlight 1: Winden */}
              <div
                onClick={() => setSelectedGenre('Sci-Fi & Fantasy')}
                className="relative group p-4 rounded-2xl bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#353534] overflow-hidden transition-all shadow-md flex flex-col justify-between min-h-[160px] cursor-pointer"
              >
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#e50914]/10 blur-xl pointer-events-none group-hover:bg-[#e50914]/20 transition-all" />
                <div className="flex items-start justify-between">
                  <span className="material-symbols-outlined text-[#e50914] text-2xl">cyclone</span>
                  <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[#e9bcb6] text-xs font-semibold">
                    6 Show Hubs
                  </span>
                </div>
                <div className="flex flex-col gap-1 z-10">
                  <h4 className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors">
                    Winden Time-Loop &amp; Dark Sci-Fi
                  </h4>
                  <p className="text-xs text-[#e9bcb6]/70">Dark, 1899, Bodies, Counterpart</p>
                </div>
              </div>

              {/* Spotlight 2: Upside Down */}
              <div
                onClick={() => setSelectedGenre('Sci-Fi & Fantasy')}
                className="relative group p-4 rounded-2xl bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#353534] overflow-hidden transition-all shadow-md flex flex-col justify-between min-h-[160px] cursor-pointer"
              >
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#b2000d]/10 blur-xl pointer-events-none group-hover:bg-[#b2000d]/20 transition-all" />
                <div className="flex items-start justify-between">
                  <span className="material-symbols-outlined text-[#e50914] text-2xl">theater_comedy</span>
                  <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[#e9bcb6] text-xs font-semibold">
                    12 Show Hubs
                  </span>
                </div>
                <div className="flex flex-col gap-1 z-10">
                  <h4 className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors">
                    Upside Down &amp; Hawkins Lore
                  </h4>
                  <p className="text-xs text-[#e9bcb6]/70">
                    Stranger Things, Beyond Stranger Things, Animated Spinoffs
                  </p>
                </div>
              </div>

              {/* Spotlight 3: Dystopian Arenas */}
              <div
                onClick={() => setSelectedGenre('Dystopian')}
                className="relative group p-4 rounded-2xl bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#353534] overflow-hidden transition-all shadow-md flex flex-col justify-between min-h-[160px] cursor-pointer"
              >
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#70dc8e]/10 blur-xl pointer-events-none group-hover:bg-[#70dc8e]/20 transition-all" />
                <div className="flex items-start justify-between">
                  <span className="material-symbols-outlined text-[#70dc8e] text-2xl">sports_score</span>
                  <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[#e9bcb6] text-xs font-semibold">
                    9 Show Hubs
                  </span>
                </div>
                <div className="flex flex-col gap-1 z-10">
                  <h4 className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors">
                    Dystopian Arenas &amp; Games
                  </h4>
                  <p className="text-xs text-[#e9bcb6]/70">Squid Game, Alice in Borderland, Silo, 3%</p>
                </div>
              </div>

              {/* Spotlight 4: Prestige TV */}
              <div
                onClick={() => setSelectedGenre('Crime & Drama')}
                className="relative group p-4 rounded-2xl bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#353534] overflow-hidden transition-all shadow-md flex flex-col justify-between min-h-[160px] cursor-pointer"
              >
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#ffb4aa]/10 blur-xl pointer-events-none group-hover:bg-[#ffb4aa]/20 transition-all" />
                <div className="flex items-start justify-between">
                  <span className="material-symbols-outlined text-[#ffb4aa] text-2xl">movie</span>
                  <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[#e9bcb6] text-xs font-semibold">
                    14 Show Hubs
                  </span>
                </div>
                <div className="flex flex-col gap-1 z-10">
                  <h4 className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors">
                    A24 &amp; Prestige Television
                  </h4>
                  <p className="text-xs text-[#e9bcb6]/70">Beef, Euphoria, The Curse, Succession</p>
                </div>
              </div>
            </div>
          </section>

          {/* Request Hub Banner Callout (Stitch 4f6346944b7849b883e8343e530d09c5) */}
          <div className="relative overflow-hidden rounded-2xl bg-[#201f1f] border border-[#353534] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4 z-10">
              <div className="w-12 h-12 rounded-xl bg-[#0e0e0e] flex items-center justify-center shrink-0 text-[#e50914] border border-[#353534]">
                <span className="material-symbols-outlined text-2xl">add_circle</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-lg sm:text-xl font-bold text-[#e5e2e1]">
                  Can&apos;t find your show or limited series?
                </h4>
                <p className="text-xs sm:text-sm text-[#e9bcb6]/80">
                  Submit a community hub petition. Hubs unlock automatically once 50 fans pledge interest.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 z-10 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setNotificationToast?.('There are currently 34 show petitions in voting.')}
                className="w-full md:w-auto px-4 py-3 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-xs sm:text-sm font-semibold transition-all border border-[#353534] cursor-pointer"
              >
                View Community Requests (34)
              </button>
              <button
                type="button"
                onClick={onRequestHub}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">campaign</span>
                <span>Request New Show Hub</span>
              </button>
            </div>

            {/* Ambient Background Flare */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
