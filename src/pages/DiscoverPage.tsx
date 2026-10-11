import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { MediaItem } from '../services/tmdb/types';
import { getTrendingMovies, getPopularMovies } from '../services/tmdb/movies';
import { getTrendingTvShows, getPopularTvShows } from '../services/tmdb/tv';
import { searchMedia } from '../services/tmdb/search';
import { ShowCard } from '../components/directory/ShowCard';
import { DEFAULT_POSTER } from '../services/tmdb/client';

interface DiscoverPageProps {
  bookmarkedIds: Record<string | number, boolean>;
  onToggleBookmark: (showId: string | number) => void;
  onJoinHub: (show: MediaItem) => void;
  onViewReviews: (show: MediaItem) => void;
}

const GENRE_OPTIONS = [
  'All',
  'Sci-Fi',
  'Action',
  'Drama',
  'Comedy',
  'Crime',
  'Mystery',
  'Animation',
  'Horror',
  'Thriller',
];

export const DiscoverPage: React.FC<DiscoverPageProps> = ({
  bookmarkedIds,
  onToggleBookmark,
  onJoinHub,
  onViewReviews,
}) => {
  // Discover category & search state
  const [mediaFilter, setMediaFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Data states
  const [trendingItems, setTrendingItems] = useState<MediaItem[]>([]);
  const [popularItems, setPopularItems] = useState<MediaItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: fetch trending & popular
  const loadDiscoveryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendTv, trendMovies, popTv, popMovies] = await Promise.all([
        getTrendingTvShows(1),
        getTrendingMovies(1),
        getPopularTvShows(1),
        getPopularMovies(1),
      ]);

      // Combine trending
      const combinedTrending = [...trendTv, ...trendMovies];
      setTrendingItems(combinedTrending);

      // Combine popular
      const combinedPopular = [...popTv, ...popMovies];
      setPopularItems(combinedPopular);

      // Unique discovery catalog pool
      const seen = new Set<string>();
      const combinedCatalog: MediaItem[] = [];
      for (const item of [...combinedTrending, ...combinedPopular]) {
        const id = String(item.id);
        if (!seen.has(id)) {
          seen.add(id);
          combinedCatalog.push(item);
        }
      }

      setCatalogItems(combinedCatalog);
      setPage(1);
      setHasMore(true);
    } catch (err: unknown) {
      console.error('Failed to load discovery data:', err);
      const msg = err instanceof Error ? err.message : 'Unable to load TMDB discovery feed. Please ensure the backend is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiscoveryData();
  }, [loadDiscoveryData]);

  // Load more pagination
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const [newTv, newMovies] = await Promise.all([
        getPopularTvShows(nextPage),
        getPopularMovies(nextPage),
      ]);
      const newBatch = [...newTv, ...newMovies];

      if (newBatch.length === 0) {
        setHasMore(false);
      } else {
        setCatalogItems((prev) => {
          const seen = new Set(prev.map((i) => String(i.id)));
          const unique = newBatch.filter((i) => !seen.has(String(i.id)));
          if (unique.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...prev, ...unique];
        });
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Failed to paginate discovery feed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Live search debounced
  useEffect(() => {
    const clean = searchQuery.trim();
    if (clean.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMedia(clean);
        setSearchResults(res.results);
      } catch (err) {
        console.error('Discovery search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Spotlight featured title (first trending item)
  const spotlightShow = useMemo(() => {
    return trendingItems.length > 0 ? trendingItems[0] : null;
  }, [trendingItems]);

  // Filtered and sorted discovery list
  const filteredCatalog = useMemo(() => {
    let list = searchResults !== null ? [...searchResults] : [...catalogItems];

    // Filter by media type
    if (mediaFilter !== 'all') {
      list = list.filter((item) => item.mediaType === mediaFilter);
    }

    // Filter by genre
    if (selectedGenre !== 'All') {
      list = list.filter((item) =>
        item.genres.some((g) => g.toLowerCase().includes(selectedGenre.toLowerCase()))
      );
    }

    // Sort
    if (sortBy === 'rating') {
      list.sort((a, b) => b.voteAverage - a.voteAverage);
    } else if (sortBy === 'newest') {
      list.sort((a, b) =>
        (b.releaseDate || b.firstAirDate || '').localeCompare(a.releaseDate || a.firstAirDate || '')
      );
    } else {
      // most popular / vote count
      list.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    }

    return list;
  }, [searchResults, catalogItems, mediaFilter, selectedGenre, sortBy]);

  return (
    <main className="flex-1 w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col gap-8">
        {/* Header Breadcrumb & Overline */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#e9bcb6]/80">
            <span className="hover:text-[#e5e2e1] cursor-pointer flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">movie_filter</span>
              POPCHO
            </span>
            <span className="text-[#353534]">/</span>
            <span className="text-[#e50914] font-bold">DISCOVERY ENGINE</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#70dc8e]" />
            <span className="text-xs text-[#e9bcb6]/70">TMDB Real-Time Radar</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#e5e2e1] tracking-tight">
                Cinematic Discovery &amp; Trending Canon
              </h1>
              <p className="text-sm sm:text-base text-[#e9bcb6]/80 mt-1 max-w-2xl">
                Explore global trending television, box-office leaders, critic-acclaimed cinema, and hidden fan gems synced directly with TMDB.
              </p>
            </div>

            {/* Quick Stat Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-xl bg-[#201f1f] text-[#e5e2e1] text-xs font-semibold border border-[#353534] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#e50914]">local_fire_department</span>
                <span>Trending This Week</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[#201f1f] text-[#e5e2e1] text-xs font-semibold border border-[#353534] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#70dc8e]">verified</span>
                <span>Top Rated Canon</span>
              </span>
            </div>
          </div>
        </div>

        {/* Cinematic Hero Spotlight */}
        {spotlightShow && (
          <section className="relative w-full rounded-3xl overflow-hidden border border-[#353534] bg-[#0e0e0e] shadow-2xl group">
            <div className="relative h-80 sm:h-96 md:h-[420px] w-full overflow-hidden">
              <img
                src={spotlightShow.backdropPath || spotlightShow.posterPath || DEFAULT_POSTER}
                alt={spotlightShow.title}
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#131313]/90 via-[#131313]/40 to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 flex flex-col gap-3 max-w-3xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e50914] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-md">
                    #1 Spotlight
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#201f1f]/80 backdrop-blur text-[#e9bcb6] text-[11px] font-semibold border border-[#353534]">
                    {spotlightShow.mediaType === 'movie' ? 'Feature Film' : 'Television Series'}
                  </span>
                  <div className="flex items-center gap-1 text-[#e50914] font-bold text-xs bg-[#0e0e0e]/80 px-2.5 py-0.5 rounded-full border border-[#353534]">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                    <span className="text-[#e5e2e1]">{spotlightShow.voteAverage.toFixed(1)} / 10</span>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold text-[#e5e2e1] drop-shadow-md">
                  {spotlightShow.title}
                </h2>

                <p className="text-xs sm:text-sm text-[#e9bcb6]/85 line-clamp-2 sm:line-clamp-3 max-w-2xl leading-relaxed">
                  {spotlightShow.overview}
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onJoinHub(spotlightShow)}
                    className="px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">forum</span>
                    <span>Join Community Hub</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewReviews(spotlightShow)}
                    className="px-4 py-2.5 rounded-xl bg-[#201f1f]/90 hover:bg-[#2a2a2a] text-[#e5e2e1] text-xs sm:text-sm font-semibold transition-all border border-[#353534] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">rate_review</span>
                    <span>View Reviews</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleBookmark(spotlightShow.id)}
                    className={`p-2.5 rounded-xl transition-all border border-[#353534] cursor-pointer ${
                      bookmarkedIds[spotlightShow.id]
                        ? 'bg-[#e50914]/20 text-[#e50914] border-[#e50914]/40'
                        : 'bg-[#201f1f]/80 text-[#e9bcb6] hover:text-white'
                    }`}
                    title="Bookmark"
                  >
                    <span className="material-symbols-outlined text-base">
                      {bookmarkedIds[spotlightShow.id] ? 'bookmark_added' : 'bookmark'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Trending Horizontal Rail Section */}
        {trendingItems.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <h3 className="text-xl font-bold text-[#e5e2e1]">Trending Across Entertainment</h3>
              </div>
              <span className="text-xs text-[#e9bcb6]/60">Updated Live from TMDB</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
              {trendingItems.slice(0, 10).map((item, index) => (
                <div
                  key={`trending-${item.id}`}
                  className="group relative flex-shrink-0 w-44 sm:w-52 flex flex-col bg-[#201f1f] rounded-2xl overflow-hidden border border-[#353534] hover:border-[#e50914]/50 transition-all hover:-translate-y-1 shadow-md cursor-pointer"
                  onClick={() => onViewReviews(item)}
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0e0e0e]">
                    <img
                      src={item.posterPath || DEFAULT_POSTER}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-transparent to-transparent opacity-80" />

                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#e50914] text-white text-[11px] font-extrabold shadow">
                      #{index + 1}
                    </span>

                    <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[#e5e2e1] text-xs font-bold bg-[#0e0e0e]/80 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      <span className="material-symbols-outlined text-xs text-[#e50914]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                      {item.voteAverage.toFixed(1)}
                    </span>
                  </div>

                  <div className="p-3 flex flex-col justify-between flex-1 gap-1">
                    <h4 className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#e9bcb6]/70 truncate">
                      {item.genres.slice(0, 2).join(' • ') || (item.mediaType === 'movie' ? 'Movie' : 'TV Series')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Popular & Audience Favorites Section */}
        {popularItems.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#70dc8e] text-xl">stars</span>
                <h3 className="text-xl font-bold text-[#e5e2e1]">Popular &amp; High-Score Canon</h3>
              </div>
              <span className="text-xs text-[#e9bcb6]/60">TMDB Popularity Index</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
              {popularItems.slice(0, 10).map((item) => (
                <div
                  key={`popular-${item.id}`}
                  className="group relative flex-shrink-0 w-44 sm:w-52 flex flex-col bg-[#201f1f] rounded-2xl overflow-hidden border border-[#353534] hover:border-[#70dc8e]/50 transition-all hover:-translate-y-1 shadow-md cursor-pointer"
                  onClick={() => onViewReviews(item)}
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0e0e0e]">
                    <img
                      src={item.posterPath || DEFAULT_POSTER}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-transparent to-transparent opacity-80" />

                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#2a2a2a]/90 backdrop-blur-sm text-[#70dc8e] text-[11px] font-extrabold border border-[#353534]">
                      {item.voteAverage > 0 ? `${item.voteAverage.toFixed(1)} ★` : 'POPULAR'}
                    </span>

                    <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[#e5e2e1] text-[11px] font-semibold bg-[#0e0e0e]/80 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {item.voteCount.toLocaleString()} votes
                    </span>
                  </div>

                  <div className="p-3 flex flex-col justify-between flex-1 gap-1">
                    <h4 className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#70dc8e] transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#e9bcb6]/70 truncate">
                      {item.genres.slice(0, 2).join(' • ') || (item.mediaType === 'movie' ? 'Movie' : 'TV Series')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter & Search Bar */}
        <section className="flex flex-col gap-4 bg-[#201f1f] p-4 sm:p-5 rounded-2xl border border-[#353534] shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#e9bcb6]/70 text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, TV shows, directors…"
                className="w-full h-10 pl-10 pr-4 bg-[#131313] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs sm:text-sm rounded-xl border border-[#353534] focus:border-[#e50914] focus:outline-none transition-all"
              />
            </div>

            {/* Media Type & Sorting Controls */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
              {/* Media Type Filter */}
              <div className="flex items-center bg-[#131313] p-1 rounded-xl border border-[#353534]">
                <button
                  type="button"
                  onClick={() => setMediaFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mediaFilter === 'all'
                      ? 'bg-[#e50914] text-white shadow'
                      : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter('tv')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mediaFilter === 'tv'
                      ? 'bg-[#e50914] text-white shadow'
                      : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
                  }`}
                >
                  TV Series
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter('movie')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mediaFilter === 'movie'
                      ? 'bg-[#e50914] text-white shadow'
                      : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
                  }`}
                >
                  Movies
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#131313] px-3 py-1.5 rounded-xl border border-[#353534]">
                <span className="text-xs text-[#e9bcb6]/70 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'popular' | 'rating' | 'newest')}
                  className="bg-transparent text-[#e5e2e1] text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="popular" className="bg-[#201f1f]">Most Popular</option>
                  <option value="rating" className="bg-[#201f1f]">Highest Rated</option>
                  <option value="newest" className="bg-[#201f1f]">Newest Releases</option>
                </select>
              </div>
            </div>
          </div>

          {/* Genre Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {GENRE_OPTIONS.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-[#e50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.4)]'
                    : 'bg-[#131313] hover:bg-[#2a2a2a] text-[#e9bcb6] border border-[#353534]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        {/* Discovery Catalog Grid */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-[#e9bcb6]/70">
            <span>
              Showing <strong className="text-[#e5e2e1]">{filteredCatalog.length}</strong> titles
            </span>
            {isSearching && (
              <span className="flex items-center gap-1.5 text-[#e50914]">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Searching TMDB catalog…
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl text-[#e50914] animate-spin">
                progress_activity
              </span>
              <p className="text-sm text-[#e9bcb6]">Loading curated entertainment radar…</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3 bg-[#93000a]/15 rounded-2xl border border-[#93000a]/30 p-6">
              <span className="material-symbols-outlined text-4xl text-[#ffb4ab]">error</span>
              <p className="text-sm text-[#e5e2e1] font-semibold">{error}</p>
              <button
                type="button"
                onClick={loadDiscoveryData}
                className="mt-2 px-5 py-2 rounded-xl bg-[#e50914] text-white text-xs font-bold"
              >
                Retry Loading
              </button>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-[#201f1f] rounded-2xl border border-[#353534]">
              <span className="material-symbols-outlined text-5xl text-[#e50914]">search_off</span>
              <h3 className="text-lg font-bold text-[#e5e2e1]">No Titles Found</h3>
              <p className="text-xs text-[#e9bcb6]/70 max-w-sm">
                No titles matching "{searchQuery}" in category "{selectedGenre}". Try adjusting your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredCatalog.map((show) => (
                <ShowCard
                  key={`discover-${show.id}`}
                  show={show}
                  viewMode="grid"
                  isBookmarked={Boolean(bookmarkedIds[show.id])}
                  onToggleBookmark={onToggleBookmark}
                  onJoinHub={onJoinHub}
                  onViewReviews={onViewReviews}
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {searchResults === null && !loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              {hasMore ? (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] disabled:opacity-50 text-[#e5e2e1] text-sm font-bold transition-all shadow-md border border-[#353534] group active:scale-98 cursor-pointer"
                >
                  {loadingMore ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin text-[#e50914]">
                        progress_activity
                      </span>
                      <span>Loading more titles…</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg group-hover:translate-y-0.5 transition-transform text-[#e50914]">
                        expand_more
                      </span>
                      <span>Load Next Page of Titles</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="text-xs text-[#e9bcb6]/60">All discovery titles loaded</span>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
