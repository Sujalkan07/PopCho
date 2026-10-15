import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { CommunityReviewsPage } from './pages/CommunityReviewsPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { RequestHubModal } from './components/directory/RequestHubModal';
import { ReviewsModal } from './components/reviews/ReviewsModal';
import { JoinHubModal } from './components/chat/JoinHubModal';
import { CommunityChatWorkspace } from './components/chat/CommunityChatWorkspace';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { WatchlistPage } from './pages/WatchlistPage';
import { HubsPage } from './pages/HubsPage';
import type { MediaItem } from './services/tmdb/types';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

export function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const { user, getAuthHeaders } = useAuth();

  // Bookmarked show IDs strictly scoped to authenticated user or guest to prevent cross-account leaks
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string | number, boolean>>(() => {
    try {
      const storageKey = user ? `popcho_bookmarks_${user.id}` : 'popcho_bookmarks_guest';
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal & Workspace States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedReviewShow, setSelectedReviewShow] = useState<MediaItem | null>(null);
  const [selectedJoinShow, setSelectedJoinShow] = useState<MediaItem | null>(null);
  const [activeWorkspaceShow, setActiveWorkspaceShow] = useState<MediaItem | null>(null);
  const [activeWorkspaceChannelId, setActiveWorkspaceChannelId] = useState<string | undefined>(undefined);

  // Sync saved items from database when user changes or authenticates (clears on logout/switch)
  useEffect(() => {
    let isMounted = true;

    if (!user) {
      try {
        const saved = localStorage.getItem('popcho_bookmarks_guest');
        setBookmarkedIds(saved ? JSON.parse(saved) : {});
      } catch {
        setBookmarkedIds({});
      }
      return;
    }

    // Immediately isolate to current user's cache
    try {
      const saved = localStorage.getItem(`popcho_bookmarks_${user.id}`);
      setBookmarkedIds(saved ? JSON.parse(saved) : {});
    } catch {
      setBookmarkedIds({});
    }

    fetch(`${API_BASE_URL}/api/watchlist/ids`, {
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.items) return;
        const fresh: Record<string | number, boolean> = {};
        for (const item of data.items) {
          fresh[item.tmdbId] = true;
          fresh[`${item.mediaType}-${item.tmdbId}`] = true;
        }
        setBookmarkedIds(fresh);
        try {
          localStorage.setItem(`popcho_bookmarks_${user.id}`, JSON.stringify(fresh));
        } catch {
          // ignore storage errors
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user, getAuthHeaders]);

  // Toggle bookmark handler with user-scoped storage & server persistence
  const handleToggleBookmark = (showId: string | number, mediaItem?: MediaItem) => {
    const numericId = Number(showId);
    const willBookmark = !bookmarkedIds[showId];

    setBookmarkedIds((prev) => {
      const next = { ...prev, [showId]: willBookmark };
      if (mediaItem) {
        next[`${mediaItem.mediaType}-${numericId}`] = willBookmark;
      }
      try {
        const storageKey = user ? `popcho_bookmarks_${user.id}` : 'popcho_bookmarks_guest';
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });

    if (user && !isNaN(numericId)) {
      fetch(`${API_BASE_URL}/api/watchlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          tmdbId: numericId,
          mediaType: mediaItem?.mediaType || 'tv',
          title: mediaItem?.title || `Show #${showId}`,
          posterPath: mediaItem?.posterPath || null,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to update watchlist');
          return res.json();
        })
        .then((result) => {
          setNotificationToast(
            result.inWatchlist ? 'Added to your Watchlist' : 'Removed from your Watchlist'
          );
        })
        .catch(() => {
          // Revert on network failure
          setBookmarkedIds((prev) => ({ ...prev, [showId]: !willBookmark }));
          setNotificationToast('Could not sync Watchlist change. Please try again.');
        });
    } else if (!user && willBookmark) {
      setNotificationToast('Saved locally. Sign in to sync across devices!');
    }
  };

  // Toast auto-clear
  useEffect(() => {
    if (!notificationToast) return;
    const t = setTimeout(() => setNotificationToast(null), 4000);
    return () => clearTimeout(t);
  }, [notificationToast]);

  // If user opened the full interactive community chat workspace
  if (activeWorkspaceShow) {
    return (
      <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNotifications={() => setNotificationToast('No unread notifications.')}
          onOpenFriends={() => setNotificationToast('Community channels are active. Join a fandom hub to chat with fans live!')}
        />
        <main className="pt-[108px] lg:pt-[68px]">
          <CommunityChatWorkspace
            show={activeWorkspaceShow}
            initialChannelId={activeWorkspaceChannelId}
            onBackToDashboard={() => {
              setActiveWorkspaceShow(null);
              setActiveWorkspaceChannelId(undefined);
            }}
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
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#201f1f] text-[#e5e2e1] text-xs font-semibold shadow-2xl border border-[#353534] animate-bounce"
        >
          <span className="material-symbols-outlined text-[#e50914] text-base">info</span>
          <span>{notificationToast}</span>
          <button
            type="button"
            onClick={() => setNotificationToast(null)}
            className="text-[#e9bcb6] hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </aside>
      )}

      {/* PopCho Sticky Header Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNotifications={() => setNotificationToast('No unread notifications.')}
        onOpenFriends={() => setNotificationToast('Community channels are active. Join a fandom hub to chat with fans live!')}
      />

      {/* Routed Main Page Area */}
      <div className="pt-[108px] lg:pt-[68px] flex-1 flex flex-col">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
                onJoinHub={(s) => setSelectedJoinShow(s)}
                onViewReviews={(s) => setSelectedReviewShow(s)}
                onRequestHub={() => setIsRequestModalOpen(true)}
                setNotificationToast={setNotificationToast}
              />
            }
          />
          <Route
            path="/discover"
            element={
              <DiscoverPage
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
                onJoinHub={(s) => setSelectedJoinShow(s)}
                onViewReviews={(s) => setSelectedReviewShow(s)}
              />
            }
          />
          <Route
            path="/reviews"
            element={
              <CommunityReviewsPage
                onJoinHub={(s) => setSelectedJoinShow(s)}
                onOpenGlobalReviewModal={(s) => setSelectedReviewShow(s)}
                setNotificationToast={setNotificationToast}
              />
            }
          />
          <Route
            path="/communities"
            element={
              <CommunitiesPage
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
                onJoinHub={(s) => setSelectedJoinShow(s)}
                onViewReviews={(s) => setSelectedReviewShow(s)}
                onRequestHub={() => setIsRequestModalOpen(true)}
                setNotificationToast={setNotificationToast}
              />
            }
          />
          <Route
            path="/community-reviews"
            element={<Navigate to="/reviews" replace />}
          />
          <Route
            path="/watchlist"
            element={
              <WatchlistPage
                onJoinHub={(s) => setSelectedJoinShow(s)}
                onViewReviews={(s) => setSelectedReviewShow(s)}
              />
            }
          />
          <Route
            path="/hubs"
            element={
              <HubsPage
                onJoinHub={(s) => setSelectedJoinShow(s)}
                onViewReviews={(s) => setSelectedReviewShow(s)}
                setNotificationToast={setNotificationToast}
              />
            }
          />
          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* PopCho Global Footer */}
      <Footer />

      {/* Global Modals */}
      <AuthModal />

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
        onEnterCommunityChat={(show, channelId) => {
          setSelectedJoinShow(null);
          setActiveWorkspaceShow(show);
          setActiveWorkspaceChannelId(channelId);
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;