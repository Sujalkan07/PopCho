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
import type { MediaItem } from './services/tmdb/types';

export function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Bookmarked show IDs with localStorage persistence
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string | number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('popcho_bookmarks');
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
          onOpenFriends={() => setNotificationToast('8 friends currently active across fandoms.')}
        />
        <main className="pt-[108px] lg:pt-[68px]">
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
        onOpenFriends={() => setNotificationToast('8 friends currently active across fandoms.')}
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
          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* PopCho Global Footer */}
      <Footer />

      {/* Global Modals */}
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

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;