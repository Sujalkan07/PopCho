import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShowCard } from '../components/directory/ShowCard';
import type { MediaItem } from '../services/tmdb/types';

interface WatchlistPageProps {
  onJoinHub: (show: MediaItem) => void;
  onViewReviews: (show: MediaItem) => void;
}

interface WatchlistItem {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  createdAt: string;
}

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  onJoinHub,
  onViewReviews,
}) => {
  const { user, getAuthHeaders, openAuthModal } = useAuth();

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('Authentication required to view your watchlist.');
          setItems([]);
          return;
        }
        throw new Error(`Failed to load watchlist: ${res.statusText}`);
      }

      const data = await res.json();
      setItems(data.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load watchlist items.');
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleRemoveItem = async (tmdbId: number, mediaType: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/watchlist/${tmdbId}/${mediaType}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (res.ok) {
        setItems((prev) =>
          prev.filter((i) => !(i.tmdbId === tmdbId && i.mediaType === mediaType))
        );
      }
    } catch (err) {
      console.error('Failed to remove item from watchlist:', err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterType !== 'all' && item.mediaType !== filterType) return false;
    if (searchQuery.trim() && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Convert WatchlistItem to MediaItem for ShowCard compatibility
  const toMediaItem = (item: WatchlistItem): MediaItem => ({
    id: item.tmdbId,
    tmdbId: item.tmdbId,
    title: item.title,
    mediaType: (item.mediaType as 'movie' | 'tv') || 'tv',
    posterPath: item.posterPath || '',
    backdropPath: '',
    genres: [],
    voteAverage: 8.0,
    voteCount: 1,
    overview: `Saved to your PopCho Watchlist.`,
    communityMembersCount: 42,
    activeOnlineCount: 12,
  });

  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#353534]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e50914]/20 border border-[#e50914]/40 flex items-center justify-center text-[#e50914]">
              <span className="material-symbols-outlined text-2xl">bookmark</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#e5e2e1] tracking-tight">
                My Watchlist
              </h1>
              <p className="text-xs text-[#e9bcb6]/70 mt-0.5">
                Saved shows, movies, and fan hubs synced to your account.
              </p>
            </div>
          </div>
        </div>

        {user && items.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter buttons */}
            <div className="flex items-center bg-[#201f1f] rounded-xl p-1 border border-[#353534]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filterType === 'all'
                    ? 'bg-[#e50914] text-white shadow'
                    : 'text-[#e9bcb6] hover:text-white'
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('tv')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filterType === 'tv'
                    ? 'bg-[#e50914] text-white shadow'
                    : 'text-[#e9bcb6] hover:text-white'
                }`}
              >
                TV Series
              </button>
              <button
                type="button"
                onClick={() => setFilterType('movie')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filterType === 'movie'
                    ? 'bg-[#e50914] text-white shadow'
                    : 'text-[#e9bcb6] hover:text-white'
                }`}
              >
                Movies
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#e9bcb6]/60 text-sm">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search watchlist..."
                className="h-9 pl-9 pr-8 bg-[#201f1f] text-xs text-[#e5e2e1] placeholder:text-[#e9bcb6]/40 rounded-xl border border-[#353534] focus:border-[#e50914] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#e9bcb6]/60 hover:text-white p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!user ? (
        /* Unauthenticated Gate */
        <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#201f1f] border border-[#353534] flex items-center justify-center text-[#e50914] mb-4 shadow-xl">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Sign In to View Watchlist</h2>
          <p className="text-xs text-[#e9bcb6]/70 leading-relaxed mb-6">
            Keep track of all your favorite fandoms, bookmark upcoming releases, and sync your watch queue across all devices.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('signin')}
            className="px-6 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-xs shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">login</span>
            <span>Sign In / Create Account</span>
          </button>
        </div>
      ) : loading ? (
        /* Loading skeleton */
        <div className="py-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-[#201f1f] animate-pulse border border-[#353534]"
            />
          ))}
        </div>
      ) : error ? (
        /* Error state with retry */
        <div className="my-auto py-12 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-4xl text-[#e50914] mb-3">
            error_outline
          </span>
          <p className="text-sm font-semibold text-white mb-2">{error}</p>
          <button
            type="button"
            onClick={fetchWatchlist}
            className="px-4 py-2 bg-[#201f1f] hover:bg-[#282828] border border-[#353534] rounded-xl text-xs text-white font-bold transition-all"
          >
            Retry
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#201f1f] border border-[#353534] flex items-center justify-center text-[#e9bcb6]/50 mb-4 shadow-xl">
            <span className="material-symbols-outlined text-3xl">bookmark_border</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Your Watchlist is Empty</h2>
          <p className="text-xs text-[#e9bcb6]/70 leading-relaxed mb-6">
            {searchQuery
              ? 'No titles match your search in your saved watchlist.'
              : 'Discover trending series, blockbuster movies, and community favorites, then click the bookmark button to save them.'}
          </p>
          <Link
            to="/discover"
            className="px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-xs shadow-[0_0_12px_rgba(229,9,20,0.4)] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">explore</span>
            <span>Explore Shows & Movies</span>
          </Link>
        </div>
      ) : (
        /* Watchlist Grid */
        <div className="py-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredItems.map((item) => {
            const media = toMediaItem(item);
            return (
              <ShowCard
                key={`${item.mediaType}-${item.tmdbId}`}
                show={media}
                isBookmarked={true}
                onToggleBookmark={() => handleRemoveItem(item.tmdbId, item.mediaType)}
                onJoinHub={onJoinHub}
                onViewReviews={onViewReviews}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
