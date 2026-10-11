import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { DirectoryHeader } from './components/directory/DirectoryHeader';
import { DirectoryControls } from './components/directory/DirectoryControls';
import { ShowCard } from './components/directory/ShowCard';
import { UniverseClusters } from './components/directory/UniverseClusters';
import { PetitionBanner } from './components/directory/PetitionBanner';
import { RequestHubModal } from './components/directory/RequestHubModal';
import { ReviewsModal } from './components/reviews/ReviewsModal';
import { JoinHubModal } from './components/chat/JoinHubModal';
import { CommunityChatWorkspace } from './components/chat/CommunityChatWorkspace';
import { getTrendingTvShows } from './services/tmdb/tv';
import { getTrendingMovies } from './services/tmdb/movies';
import { searchMedia } from './services/tmdb/search';
import type { MediaItem } from './services/tmdb/types';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'discover' | 'reviews' | 'communities'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // TMDB data state & pagination
  const [shows, setShows] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live search state
  const [searchResults, setSearchResults] = useState<MediaItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Notification and friends popover states
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [activeFilterNotice, setActiveFilterNotice] = useState(false);

  // Bookmarked show IDs with localStorage persistence
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string | number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('popcho_bookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load initial TMDB data on mount
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tv, movies] = await Promise.all([
        getTrendingTvShows(1),
        getTrendingMovies(1)
      ]);
      // Deduplicate initial TV and Movie list
      const combined = [...tv];
      const seen = new Set(tv.map((item) => String(item.id)));
      for (const m of movies) {
        if (!seen.has(String(m.id))) {
          combined.push(m);
          seen.add(String(m.id));
        }
      }
      setShows(combined);
      setPage(1);
      setHasMore(true);
    } catch (e: any) {
      console.error('Failed to fetch TMDB data', e);
      setError(e.message || 'Failed to connect to TMDB via backend proxy. Please verify the server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Load More (Pagination)
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const [tv, movies] = await Promise.all([
        getTrendingTvShows(nextPage),
        getTrendingMovies(nextPage)
      ]);
      const newBatch = [...tv, ...movies];

      if (newBatch.length === 0) {
        setHasMore(false);
      } else {
        setShows((prev) => {
          const seen = new Set(prev.map((s) => String(s.id)));
          const uniqueNew = newBatch.filter((s) => !seen.has(String(s.id)));
          if (uniqueNew.length === 0) {
            setHasMore(false);
            return prev;
          }
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Failed to paginate TMDB shows', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Real-time debounced TMDB Search
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
        const resp = await searchMedia(clean);
        // Deduplicate search results by ID
        const seen = new Set<string>();
        const uniqueResults = resp.results.filter((item) => {
          const id = String(item.id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setSearchResults(uniqueResults);
      } catch (err) {
        console.error('TMDB search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal & Workspace States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedReviewShow, setSelectedReviewShow] = useState<MediaItem | null>(null);
  const [selectedJoinShow, setSelectedJoinShow] = useState<MediaItem | null>(null);
  const [activeWorkspaceShow, setActiveWorkspaceShow] = useState<MediaItem | null>(null);

  // Toggle bookmark handler
  const handleToggleBookmark = (showId: string | number) => {
    setBookmarkedIds((prev) => {
      const next = { ...prev, [showId]: !prev[showId] };
      try {
        localStorage.setItem('popcho_bookmarks', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Dynamic genre frequency computed from loaded catalog
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const dataset = searchResults !== null ? searchResults : shows;
    dataset.forEach((item) => {
      item.genres.forEach((g) => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    return counts;
  }, [shows, searchResults]);

  // Filter and sort shows — operates on live search or catalog
  const filteredShows = useMemo(() => {
    let result = searchResults !== null ? [...searchResults] : [...shows];

    // 1. Client query refinement if searching
    if (searchResults === null && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.overview.toLowerCase().includes(q) ||
          (s.network && s.network.toLowerCase().includes(q)) ||
          s.genres.some((g) => g.toLowerCase().includes(q))
      );
    }

    // 2. Genre Filter
    if (selectedGenre && selectedGenre !== 'all') {
      result = result.filter((s) => s.genres.includes(selectedGenre));
    }

    // 3. Sort Order
    if (sortBy === 'rating') {
      result.sort((a, b) => b.voteAverage - a.voteAverage);
    } else if (sortBy === 'recent') {
      result.sort((a, b) => (b.firstAirDate || b.releaseDate || '').localeCompare(a.firstAirDate || a.releaseDate || ''));
    } else if (sortBy === 'trending') {
      result.sort((a, b) => (b.activeOnlineCount || 0) - (a.activeOnlineCount || 0));
    } else {
      // default: most active
      result.sort((a, b) => (b.communityMembersCount || 0) - (a.communityMembersCount || 0));
    }

    return result;
  }, [searchQuery, selectedGenre, sortBy, shows, searchResults]);

  // Toast auto-clear
  useEffect(() => {
    if (!notificationToast) return;
    const t = setTimeout(() => setNotificationToast(null), 4000);
    return () => clearTimeout(t);
  }, [notificationToast]);

  // If user opened the full interactive community workspace
  if (activeWorkspaceShow) {
    return (
      <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="pt-[68px]">
          <CommunityChatWorkspace
            show={activeWorkspaceShow}
            onBackToDashboard={() => setActiveWorkspaceShow(null)}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col antialiased selection:bg-[#e50914] selection:text-white">
      {/* Toast Notification */}
      {notificationToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#201f1f] text-[#e5e2e1] border border-[#e50914]/40 shadow-2xl animate-fade-in text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-[#e50914] text-lg">info</span>
          <span>{notificationToast}</span>
        </aside>
      )}

      {/* Fixed PopCho Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNotifications={() => setNotificationToast('3 unread mentions in #upside-down-theories.')}
        onOpenFriends={() => setNotificationToast('8 friends online across PopCho community hubs.')}
      />

      {/* Main Content Area */}
      <main className="w-full pt-[68px] min-h-screen bg-[#131313] flex-1">
        {/* Subtle Atmospheric Backdrop Glows */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 left-1/4 w-[600px] h-[340px] bg-gradient-to-br from-[#e50914]/15 via-[#b2000d]/5 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
          <div className="absolute top-10 right-10 w-[420px] h-[280px] bg-gradient-to-bl from-[#ffb4aa]/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />

          <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
            {/* Directory Hero Header */}
            <DirectoryHeader
              totalHubsCount={searchResults !== null ? searchResults.length : shows.length}
              isLiveSync={!error}
            />

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20 gap-3">
                <span className="material-symbols-outlined text-3xl text-[#e50914] animate-spin">
                  progress_activity
                </span>
                <span className="text-[#e9bcb6]/75 text-sm font-medium">
                  Connecting to TMDB via backend proxy…
                </span>
              </div>
            )}

            {/* Error State with Retry Button */}
            {!loading && error && (
              <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-[#2a0a0a] border border-[#e50914]/40 text-[#e9bcb6]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#e50914] text-xl">error</span>
                  <span className="text-sm">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={loadInitialData}
                  className="px-4 py-2 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>Try Again</span>
                </button>
              </div>
            )}

            {/* Omnibox Search, Genre Chips & View Controls */}
            {!loading && !error && (
              <>
                <DirectoryControls
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedGenre={selectedGenre}
                  onSelectGenre={setSelectedGenre}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  viewMode={viewMode}
                  onToggleViewMode={setViewMode}
                  showingCount={filteredShows.length}
                  totalCount={searchResults !== null ? searchResults.length : shows.length}
                  genreCounts={genreCounts}
                  onOpenAdvancedFilters={() => setActiveFilterNotice(!activeFilterNotice)}
                />

                {/* Advanced Filter Collapsible Panel */}
                {activeFilterNotice && (
                  <div className="p-4 rounded-xl bg-[#1c1b1b] border border-[#353534] flex flex-wrap items-center justify-between gap-3 text-xs text-[#e9bcb6]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#e50914] text-lg">tune</span>
                      <span>
                        Filter by streaming network (Netflix, Apple TV+, HBO) &amp; spoiler tolerance in active development.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFilterNotice(false)}
                      className="px-3 py-1 rounded-lg bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Live Search Indicator */}
                {isSearching && (
                  <div className="flex items-center gap-2 py-2 text-xs text-[#e9bcb6]/75">
                    <span className="material-symbols-outlined text-sm text-[#e50914] animate-spin">
                      progress_activity
                    </span>
                    <span>Searching TMDB movies and TV shows for "{searchQuery}"…</span>
                  </div>
                )}

                {/* Catalog Grid (Responsive 1-4 columns desktop) */}
                {filteredShows.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-[#1c1b1b] rounded-2xl border border-[#353534]">
                    <span className="material-symbols-outlined text-5xl text-[#e50914]">
                      search_off
                    </span>
                    <h3 className="text-xl font-bold text-[#e5e2e1]">No Show Hubs Found</h3>
                    <p className="text-sm text-[#e9bcb6]/75 max-w-md">
                      {searchQuery
                        ? `We couldn't find any titles matching "${searchQuery}". Submit a community petition to build a dedicated hub!`
                        : 'No show hubs found in this genre category.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRequestModalOpen(true)}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-[#e50914] text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                    >
                      Petition for {searchQuery ? `"${searchQuery}"` : 'New Show Hub'}
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full'
                        : 'flex flex-col gap-4 w-full'
                    }
                  >
                    {filteredShows.map((show) => (
                      <ShowCard
                        key={show.id}
                        show={show}
                        viewMode={viewMode}
                        isBookmarked={Boolean(bookmarkedIds[show.id])}
                        onToggleBookmark={handleToggleBookmark}
                        onJoinHub={(s) => setSelectedJoinShow(s)}
                        onViewReviews={(s) => setSelectedReviewShow(s)}
                      />
                    ))}
                  </div>
                )}

                {/* Load More & Infinite Scroll Indicator (only when not searching) */}
                {searchResults === null && (
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
                            <span>Loading Next 20 Hubs…</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-lg group-hover:translate-y-0.5 transition-transform text-[#e50914]">
                              expand_more
                            </span>
                            <span>Load Next 20 Shows</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-[#e9bcb6]/60 font-medium">
                        All curated TMDB titles loaded ({shows.length} shows active in catalog)
                      </span>
                    )}
                    <span className="text-xs text-[#e9bcb6]/60">
                      Showing {filteredShows.length} of {shows.length} Loaded • Page {page}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Curated Franchise & Universe Clusters */}
            <UniverseClusters
              onSelectCluster={(clusterTitle) => {
                // Filter the catalog by universe keyword dynamically
                const keyword = clusterTitle.split(' ')[0];
                setSearchQuery(keyword);
                setNotificationToast(`Filtered catalog for "${clusterTitle}" universe.`);
              }}
            />

            {/* Request Hub Petition Banner Callout */}
            <PetitionBanner
              onRequestHubClick={() => setIsRequestModalOpen(true)}
              onViewRequestsClick={() => {
                setIsRequestModalOpen(true);
                setNotificationToast('Open community petitions: Shōgun, Fallout, Severance S2.');
              }}
            />
          </div>
        </div>
      </main>

      {/* PopCho Global Footer */}
      <Footer />

      {/* Interactive Modals */}
      <RequestHubModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmitPetition={(title) => {
          setNotificationToast(`Petition for "${title}" successfully submitted!`);
        }}
      />

      <ReviewsModal
        isOpen={Boolean(selectedReviewShow)}
        onClose={() => setSelectedReviewShow(null)}
        show={selectedReviewShow}
      />

      <JoinHubModal
        isOpen={Boolean(selectedJoinShow)}
        onClose={() => setSelectedJoinShow(null)}
        show={selectedJoinShow}
        onEnterCommunityChat={(show) => {
          setSelectedJoinShow(null);
          setActiveWorkspaceShow(show);
        }}
      />
    </div>
  );
}

export default App;