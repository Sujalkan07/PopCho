import { useState, useMemo, useEffect } from 'react';
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
import type { MediaItem } from './services/tmdb/types';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'discover' | 'reviews' | 'communities'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // TMDB data state
  const [shows, setShows] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bookmarked show IDs with localStorage persistence
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string | number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('popcho_bookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load TMDB data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tv, movies] = await Promise.all([getTrendingTvShows(), getTrendingMovies()]);
        setShows([...tv, ...movies]);
      } catch (e) {
        console.error('Failed to fetch TMDB data', e);
        setError('Failed to load content from TMDB. Check that the backend server is running.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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

  // Filter and sort shows — uses live TMDB data
  const filteredShows = useMemo(() => {
    let result = [...shows];

    // 1. Search Query filter
    if (searchQuery.trim()) {
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
      result.sort((a, b) => (b.firstAirDate || '').localeCompare(a.firstAirDate || ''));
    } else if (sortBy === 'trending') {
      result.sort((a, b) => (b.activeOnlineCount || 0) - (a.activeOnlineCount || 0));
    } else {
      // default: most active
      result.sort((a, b) => (b.communityMembersCount || 0) - (a.communityMembersCount || 0));
    }

    return result;
  }, [searchQuery, selectedGenre, sortBy, shows]);

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
      {/* Fixed PopCho Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNotifications={() => alert('No new mentions. All 3 notifications marked read.')}
        onOpenFriends={() => alert('Friends list: 8 friends online in #upside-down-theories and #winden-quantum.')}
      />

      {/* Main Content Area */}
      <main className="w-full pt-[68px] min-h-screen bg-[#131313] flex-1">
        {/* Subtle Atmospheric Backdrop Glows */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 left-1/4 w-[600px] h-[340px] bg-gradient-to-br from-[#e50914]/15 via-[#b2000d]/5 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
          <div className="absolute top-10 right-10 w-[420px] h-[280px] bg-gradient-to-bl from-[#ffb4aa]/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />

          <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
            {/* Directory Hero Header */}
            <DirectoryHeader />

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-16 gap-3">
                <span className="material-symbols-outlined text-3xl text-[#e50914] animate-spin">
                  progress_activity
                </span>
                <span className="text-[#e9bcb6]/75 text-sm font-medium">Loading show hubs from TMDB…</span>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[#2a0a0a] border border-[#e50914]/40 text-[#e9bcb6]">
                <span className="material-symbols-outlined text-[#e50914] text-xl">error</span>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Omnibox Search, Genre Chips & View Controls — only shown when data is loaded */}
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
                  totalCount={shows.length}
                  onOpenAdvancedFilters={() =>
                    alert('Advanced filter options: Filter by Streaming Network (Netflix, HBO, Apple), Season Count, and Spoiler Tolerance.')
                  }
                />

                {/* Catalog Grid (Responsive 1-4 columns desktop) */}
                {filteredShows.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-[#1c1b1b] rounded-2xl border border-[#353534]">
                    <span className="material-symbols-outlined text-5xl text-[#e50914]">
                      search_off
                    </span>
                    <h3 className="text-xl font-bold text-[#e5e2e1]">No Show Hubs Match Your Search</h3>
                    <p className="text-sm text-[#e9bcb6]/75 max-w-md">
                      We couldn't find any show hubs matching "{searchQuery}". You can submit a fan petition to create one!
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRequestModalOpen(true)}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-[#e50914] text-white font-bold text-xs shadow-md"
                    >
                      Petition for "{searchQuery}"
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

                {/* Load More & Infinite Scroll Indicator */}
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      alert('24 additional curated fandom hubs loaded into active view stream!')
                    }
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e5e2e1] text-sm font-bold transition-all shadow-md border border-[#353534] group"
                  >
                    <span className="material-symbols-outlined text-lg group-hover:translate-y-0.5 transition-transform">
                      expand_more
                    </span>
                    <span>Load Next 24 Shows</span>
                  </button>
                  <span className="text-xs text-[#e9bcb6]/60">
                    Showing {filteredShows.length} of {shows.length} • TMDB Live Data
                  </span>
                </div>
              </>
            )}

            {/* Curated Franchise & Universe Clusters */}
            <UniverseClusters
              onSelectCluster={(clusterTitle) => {
                alert(`Viewing canonical universe lore tree for: ${clusterTitle}`);
              }}
            />

            {/* Request Hub Petition Banner Callout */}
            <PetitionBanner
              onRequestHubClick={() => setIsRequestModalOpen(true)}
              onViewRequestsClick={() =>
                alert('Viewing 34 active community petitions: Shōgun (48 votes), Fallout (46 votes), Severance S2 (49 votes).')
              }
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
          console.log('Petition submitted:', title);
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