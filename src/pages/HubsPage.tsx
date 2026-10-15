import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserHubs, leaveCommunity, type CommunityRecord } from '../services/community/api';
import type { MediaItem } from '../services/tmdb/types';
import { DEFAULT_POSTER } from '../services/tmdb/client';

interface HubsPageProps {
  onJoinHub: (show: MediaItem) => void;
  onViewReviews: (show: MediaItem) => void;
  setNotificationToast?: (msg: string | null) => void;
}

export const HubsPage: React.FC<HubsPageProps> = ({
  onJoinHub,
  onViewReviews,
  setNotificationToast,
}) => {
  const { user, getAuthHeaders, openAuthModal } = useAuth();

  const [hubs, setHubs] = useState<CommunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const fetchHubs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getUserHubs(getAuthHeaders());
      setHubs(data.hubs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load your joined communities.');
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    fetchHubs();
  }, [fetchHubs]);

  const handleLeaveHub = async (hub: CommunityRecord) => {
    setLeavingId(hub.id);
    try {
      await leaveCommunity(hub.id);
      setHubs((prev) => prev.filter((h) => h.id !== hub.id));
      setNotificationToast?.(`Left the ${hub.title} community.`);
    } catch (err) {
      console.error('Failed to leave community:', err);
      setNotificationToast?.('Failed to leave community. Please try again.');
    } finally {
      setLeavingId(null);
    }
  };

  const toMediaItem = (hub: CommunityRecord): MediaItem => ({
    id: hub.tmdbId,
    tmdbId: hub.tmdbId,
    title: hub.title,
    mediaType: (hub.mediaType as 'movie' | 'tv') || 'tv',
    posterPath: hub.posterPath || '',
    backdropPath: hub.backdropPath || '',
    featuredImage: hub.backdropPath || '',
    overview: hub.description || '',
    voteAverage: 8.5,
    voteCount: hub.memberCount || 1,
    genres: [],
    communityMembersCount: hub.memberCount || 1,
    activeOnlineCount: Math.max(1, Math.floor(hub.memberCount * 0.2)),
  });

  const filteredHubs = hubs.filter((hub) =>
    hub.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#353534]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e50914]/20 border border-[#e50914]/40 flex items-center justify-center text-[#e50914]">
              <span className="material-symbols-outlined text-2xl">forum</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#e5e2e1] tracking-tight">
                My Hubs
              </h1>
              <p className="text-xs text-[#e9bcb6]/70 mt-0.5">
                Communities you have joined with active discussions and real-time chat.
              </p>
            </div>
          </div>
        </div>

        {user && hubs.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#e9bcb6]/60 text-sm">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search joined hubs..."
                className="h-9 pl-9 pr-3 bg-[#201f1f] text-xs text-[#e5e2e1] placeholder:text-[#e9bcb6]/40 rounded-xl border border-[#353534] focus:border-[#e50914] focus:outline-none transition-colors"
              />
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
          <h2 className="text-xl font-bold text-white mb-2">Sign In to View Your Hubs</h2>
          <p className="text-xs text-[#e9bcb6]/70 leading-relaxed mb-6">
            Join fandom channels, read theories, share episode reactions, and keep up with communities you have joined.
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
        /* Loading Skeletons */
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-[#201f1f] animate-pulse border border-[#353534]"
            />
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="my-auto py-12 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-4xl text-[#e50914] mb-3">
            error_outline
          </span>
          <p className="text-sm font-semibold text-white mb-2">{error}</p>
          <button
            type="button"
            onClick={fetchHubs}
            className="px-4 py-2 bg-[#201f1f] hover:bg-[#282828] border border-[#353534] rounded-xl text-xs text-white font-bold transition-all"
          >
            Retry
          </button>
        </div>
      ) : filteredHubs.length === 0 ? (
        /* Empty State */
        <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#201f1f] border border-[#353534] flex items-center justify-center text-[#e9bcb6]/50 mb-4 shadow-xl">
            <span className="material-symbols-outlined text-3xl">groups</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">You Haven't Joined Any Hubs</h2>
          <p className="text-xs text-[#e9bcb6]/70 leading-relaxed mb-6">
            {searchQuery
              ? 'No joined hubs match your search.'
              : 'Browse trending fandoms, join spoiler-free or theory channels, and start discussing with other fans.'}
          </p>
          <Link
            to="/communities"
            className="px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-xs shadow-[0_0_12px_rgba(229,9,20,0.4)] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">diversity_3</span>
            <span>Browse Communities</span>
          </Link>
        </div>
      ) : (
        /* Hubs Card List */
        <div className="py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHubs.map((hub) => {
            const media = toMediaItem(hub);
            const posterSrc = hub.posterPath
              ? `https://image.tmdb.org/t/p/w500${hub.posterPath}`
              : DEFAULT_POSTER;

            return (
              <article
                key={hub.id}
                className="group relative rounded-2xl overflow-hidden bg-[#201f1f] border border-[#353534] shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col"
              >
                <div className="p-5 flex gap-4">
                  {/* Poster Thumbnail */}
                  <img
                    src={posterSrc}
                    alt={hub.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                    }}
                    className="w-20 h-28 object-cover rounded-xl bg-[#0e0e0e] border border-[#353534] shrink-0"
                  />

                  {/* Hub Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/30">
                          {hub.mediaType === 'movie' ? 'Movie Hub' : 'TV Series'}
                        </span>
                        <span className="text-[11px] text-[#70dc8e] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e]" />
                          Active
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-white truncate group-hover:text-[#e50914] transition-colors">
                        {hub.title}
                      </h3>

                      <p className="text-xs text-[#e9bcb6]/70 mt-1 line-clamp-2">
                        {hub.description || `Official fan community for ${hub.title}.`}
                      </p>
                    </div>

                    {/* Member & Channel Stats */}
                    <div className="flex items-center gap-3 text-[11px] text-[#e9bcb6]/60 mt-3">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">groups</span>
                        {hub.memberCount} {hub.memberCount === 1 ? 'member' : 'members'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">chat</span>
                        {hub.channelCount || hub.channels?.length || 1} channels
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3 bg-[#181818] border-t border-[#353534] flex items-center justify-between gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => onJoinHub(media)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">forum</span>
                    <span>Enter Hub</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewReviews(media)}
                    className="p-2 rounded-xl bg-[#201f1f] hover:bg-[#282828] text-[#e9bcb6] hover:text-white border border-[#353534] transition-colors cursor-pointer"
                    title="View Reviews"
                  >
                    <span className="material-symbols-outlined text-base">rate_review</span>
                  </button>

                  <button
                    type="button"
                    disabled={leavingId === hub.id}
                    onClick={() => handleLeaveHub(hub)}
                    className="p-2 rounded-xl bg-[#201f1f] hover:bg-[#93000a]/20 text-[#ffb4ab] border border-[#353534] hover:border-[#e50914]/40 transition-colors cursor-pointer disabled:opacity-50"
                    title="Leave Hub"
                  >
                    <span className="material-symbols-outlined text-base">
                      {leavingId === hub.id ? 'sync' : 'logout'}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
