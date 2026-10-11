import React from 'react';
import type { MediaItem } from '../../services/tmdb/types';
import { DEFAULT_POSTER } from '../../services/tmdb/client';

interface ShowCardProps {
  show: MediaItem;
  viewMode?: 'grid' | 'list';
  isBookmarked?: boolean;
  onToggleBookmark?: (showId: string | number) => void;
  onJoinHub?: (show: MediaItem) => void;
  onViewReviews?: (show: MediaItem) => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({
  show,
  viewMode = 'grid',
  isBookmarked = false,
  onToggleBookmark,
  onJoinHub,
  onViewReviews,
}) => {
  const imageSrc = show.featuredImage || show.backdropPath || show.posterPath || DEFAULT_POSTER;
  const ratingDisplay = show.voteAverage && show.voteAverage > 0 ? show.voteAverage.toFixed(1) : 'NR';
  const onlineFormatted =
    show.activeOnlineCount && show.activeOnlineCount >= 1000
      ? `${(show.activeOnlineCount / 1000).toFixed(1)}k`
      : `${show.activeOnlineCount || 120}`;
  const membersFormatted =
    show.communityMembersCount && show.communityMembersCount >= 1000
      ? `${(show.communityMembersCount / 1000).toFixed(1)}k`
      : `${show.communityMembersCount || 4500}`;

  const isRedBadge = show.hubBadgeType === 'secondary' || show.hubBadgeType === 'primary';

  if (viewMode === 'list') {
    return (
      <article className="group relative flex flex-col md:flex-row bg-[#201f1f] rounded-2xl overflow-hidden hover:bg-[#2a2a2a] transition-all duration-300 shadow-lg border border-[#353534]">
        {/* Thumbnail Stage */}
        <div className="relative md:w-72 lg:w-80 aspect-[16/10] md:aspect-auto shrink-0 overflow-hidden bg-[#0e0e0e]">
          <img
            src={imageSrc}
            alt={show.title}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
            }}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] md:from-transparent md:bg-gradient-to-r md:from-transparent md:to-[#201f1f]/80 via-transparent" />

          {show.hubBadge && (
            <div className="absolute top-3 left-3">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm ${
                  isRedBadge
                    ? 'bg-[#b2000d]/90 text-[#ffbdb5] border border-[#e50914]/40'
                    : 'bg-[#353534]/90 text-[#e5e2e1] border border-white/10'
                }`}
              >
                {show.hubBadge}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors">
                  {show.title}
                </h2>
                {show.network && (
                  <span className="hidden sm:inline px-2 py-0.5 rounded bg-[#0e0e0e]/80 text-[#e9bcb6]/80 text-xs border border-[#353534]">
                    {show.network}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[#e50914] font-bold shrink-0">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span className="text-sm text-[#e5e2e1]">{ratingDisplay}</span>
              </div>
            </div>

            <p className="text-sm text-[#e9bcb6]/80 line-clamp-2 leading-relaxed mb-3">
              {show.overview}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#e9bcb6]/70">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#70dc8e] animate-pulse" />
                <strong className="text-[#e5e2e1] font-semibold">{onlineFormatted} live</strong>
                <span>• {membersFormatted} members</span>
              </span>
              <span>•</span>
              <span>{show.channelsCount || 36} Active Channels</span>
              {show.statusText && (
                <>
                  <span>•</span>
                  <span>{show.statusText}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onJoinHub?.(show)}
              className="py-2.5 px-5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">forum</span>
              <span>Join Hub</span>
            </button>
            <button
              type="button"
              onClick={() => onViewReviews?.(show)}
              className="py-2.5 px-4 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-xs sm:text-sm font-semibold transition-all border border-[#353534] flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">rate_review</span>
              <span>Reviews</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleBookmark?.(show.id)}
              className={`p-2.5 rounded-xl transition-colors border border-[#353534] ${
                isBookmarked
                  ? 'bg-[#e50914]/20 text-[#e50914] border-[#e50914]/40'
                  : 'bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6]'
              }`}
              title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <span className="material-symbols-outlined text-base">
                {isBookmarked ? 'bookmark_added' : 'bookmark'}
              </span>
            </button>
          </div>
        </div>
      </article>
    );
  }

  // Default Grid Layout (4 columns on desktop)
  return (
    <article className="group relative flex flex-col bg-[#201f1f] rounded-2xl overflow-hidden hover:bg-[#2a2a2a] transition-all duration-300 shadow-lg border border-[#353534]/70 hover:border-[#e50914]/50 hover:-translate-y-1">
      {/* 16:10 Thumbnail Stage */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#0e0e0e]">
        <img
          src={imageSrc}
          alt={show.title}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
          }}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Directional Vignette Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-[#201f1f]/35 to-transparent pointer-events-none" />

        {/* Top-Left Hub Badge */}
        {show.hubBadge && (
          <div className="absolute top-3 left-3 z-10">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-md ${
                isRedBadge
                  ? 'bg-[#b2000d]/90 text-[#ffbdb5] border border-[#e50914]/40'
                  : 'bg-[#353534]/90 text-[#e5e2e1] border border-white/10'
              }`}
            >
              {show.hubBadge}
            </span>
          </div>
        )}

        {/* Top-Right Bookmark Button */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            aria-label={`Bookmark ${show.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark?.(show.id);
            }}
            className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              isBookmarked
                ? 'bg-[#e50914] text-white shadow-md'
                : 'bg-[#0e0e0e]/80 text-[#e5e2e1] hover:text-[#e50914] hover:bg-[#0e0e0e]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {isBookmarked ? 'bookmark_added' : 'bookmark'}
            </span>
          </button>
        </div>

        {/* Bottom-Left Metadata Tags */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5 flex-wrap z-10">
          {show.network && (
            <span className="px-2 py-0.5 rounded bg-[#0e0e0e]/85 backdrop-blur-sm text-[10px] font-medium text-[#e9bcb6] border border-[#353534]/60">
              {show.network}
            </span>
          )}
          {show.statusText && (
            <span className="px-2 py-0.5 rounded bg-[#0e0e0e]/85 backdrop-blur-sm text-[10px] font-medium text-[#e9bcb6] border border-[#353534]/60">
              {show.statusText}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors truncate">
              {show.title}
            </h2>
            <div className="flex items-center gap-1 text-[#e50914] shrink-0 font-bold">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="text-xs text-[#e5e2e1]">{ratingDisplay}</span>
            </div>
          </div>

          <p className="text-xs text-[#e9bcb6]/80 line-clamp-2 leading-relaxed">
            {show.overview}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          {/* Community Metrics */}
          <div className="flex items-center justify-between text-[#e9bcb6]/75 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#70dc8e] animate-pulse shrink-0" />
              <span className="text-[#e5e2e1] font-semibold">{onlineFormatted} live</span>
              <span className="truncate">• {membersFormatted} members</span>
            </div>
            <span className="shrink-0">{show.channelsCount || 36} Channels</span>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onJoinHub?.(show)}
              className="w-full py-2 px-3 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1 shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-base">forum</span>
              <span>Join Hub</span>
            </button>
            <button
              type="button"
              onClick={() => onViewReviews?.(show)}
              className="w-full py-2 px-3 rounded-xl bg-[#353534] hover:bg-[#393939] text-[#e5e2e1] text-xs font-semibold text-center transition-all flex items-center justify-center gap-1 border border-[#353534] hover:border-[#af8782]/40"
            >
              <span className="material-symbols-outlined text-base">rate_review</span>
              <span>Reviews</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
