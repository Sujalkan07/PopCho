import React, { useState, useEffect, useCallback } from 'react';
import type { MediaItem } from '../../services/tmdb/types';
import { getMovieDetails } from '../../services/tmdb/movies';
import { getTvShowDetails } from '../../services/tmdb/tv';

// In-memory cache for show details to avoid duplicate requests across navigation
const showMetadataCache = new Map<string, MediaItem>();

export interface ShowDescriptionCardProps {
  show: MediaItem;
  communityOverview?: string | null;
}

export const ShowDescriptionCard: React.FC<ShowDescriptionCardProps> = ({
  show,
  communityOverview,
}) => {
  const targetId = show.tmdbId ?? show.id;
  const mediaType = show.mediaType === 'movie' ? 'movie' : 'tv';
  const cacheKey = `${mediaType}-${targetId}`;

  // Determine if overview is already present in show or cached
  const initialOverview = (
    show.overview ||
    communityOverview ||
    showMetadataCache.get(cacheKey)?.overview ||
    ''
  ).trim();

  const [overview, setOverview] = useState<string | null>(initialOverview || null);
  const [fetchedMetadata, setFetchedMetadata] = useState<MediaItem | null>(
    () => showMetadataCache.get(cacheKey) || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !initialOverview && Boolean(targetId) && !isNaN(Number(targetId))
  );
  const [error, setError] = useState<string | null>(
    () => (!initialOverview && Boolean(targetId) && isNaN(Number(targetId)) ? 'Invalid show identifier' : null)
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const fetchDetails = useCallback(async () => {
    if (!targetId) return;

    // Check in-memory cache first to avoid duplicate network requests
    if (showMetadataCache.has(cacheKey)) {
      const cached = showMetadataCache.get(cacheKey)!;
      setFetchedMetadata(cached);
      setOverview(cached.overview?.trim() || '');
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const numericId = typeof targetId === 'number' ? targetId : parseInt(String(targetId), 10);
      if (isNaN(numericId)) {
        throw new Error('Invalid show identifier');
      }

      const details =
        mediaType === 'movie'
          ? await getMovieDetails(numericId)
          : await getTvShowDetails(numericId);

      showMetadataCache.set(cacheKey, details);
      setFetchedMetadata(details);
      setOverview(details.overview?.trim() || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load show synopsis.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, mediaType, targetId]);

  // Fetch from TMDB only if overview is not already present from props or cache
  useEffect(() => {
    const directOverview = (
      show.overview ||
      communityOverview ||
      showMetadataCache.get(cacheKey)?.overview ||
      ''
    ).trim();

    if (directOverview || !targetId) {
      return;
    }

    let isCancelled = false;
    const numericId = typeof targetId === 'number' ? targetId : parseInt(String(targetId), 10);
    if (isNaN(numericId)) {
      return;
    }

    const fetchPromise =
      mediaType === 'movie'
        ? getMovieDetails(numericId)
        : getTvShowDetails(numericId);

    fetchPromise
      .then((details) => {
        if (!isCancelled) {
          showMetadataCache.set(cacheKey, details);
          setFetchedMetadata(details);
          setOverview(details.overview?.trim() || '');
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Unable to load show synopsis.';
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, communityOverview, mediaType, show.overview, targetId]);

  // Handle invalid / missing show
  if (!show || (!show.title && !targetId)) {
    return (
      <div className="rounded-2xl bg-[#201f1f] border border-[#353534] p-4 sm:p-5 shadow-lg flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[#e50914] text-xs font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-sm">info</span>
          About This Show
        </div>
        <p className="text-xs text-[#e9bcb6]/60 italic">Show details unavailable.</p>
      </div>
    );
  }

  // Display title from show or fetched metadata
  const title = show.title || fetchedMetadata?.title || 'Selected Title';

  // Extract release year from releaseDate or firstAirDate
  const rawDate =
    show.releaseDate ||
    show.firstAirDate ||
    fetchedMetadata?.releaseDate ||
    fetchedMetadata?.firstAirDate;

  let releaseYear: string | null = null;
  if (rawDate && typeof rawDate === 'string') {
    const match = rawDate.match(/^(\d{4})/);
    if (match) {
      releaseYear = match[1];
    }
  }

  // Media type label
  const resolvedMediaType = show.mediaType || fetchedMetadata?.mediaType || mediaType;
  const mediaTypeLabel = resolvedMediaType === 'movie' ? 'Movie' : 'TV Show';

  // Genre labels
  const allGenres =
    show.genres && show.genres.length > 0
      ? show.genres
      : fetchedMetadata?.genres && fetchedMetadata.genres.length > 0
      ? fetchedMetadata.genres
      : [];
  const validGenres = allGenres.filter(
    (g): g is string => typeof g === 'string' && g.trim().length > 0
  );

  // Loading skeleton state
  if (isLoading) {
    return (
      <div
        data-testid="show-description-loading"
        className="rounded-2xl bg-[#201f1f] border border-[#353534] p-4 sm:p-5 shadow-lg flex flex-col gap-3 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#e50914]">info</span>
            <span className="text-[#e50914] text-xs font-bold uppercase tracking-wider">
              About This Show
            </span>
          </div>
          <div className="h-4 w-14 bg-[#2a2a2a] rounded" />
        </div>
        <div className="h-5 w-3/4 bg-[#2a2a2a] rounded" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-[#2a2a2a] rounded" />
          <div className="h-4 w-16 bg-[#2a2a2a] rounded" />
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-3 w-full bg-[#2a2a2a] rounded" />
          <div className="h-3 w-5/6 bg-[#2a2a2a] rounded" />
          <div className="h-3 w-4/6 bg-[#2a2a2a] rounded" />
        </div>
      </div>
    );
  }

  // API failure / error state with retry
  if (error && !overview) {
    return (
      <div
        data-testid="show-description-error"
        className="rounded-2xl bg-[#201f1f] border border-[#353534] p-4 sm:p-5 shadow-lg flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#e50914] text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">info</span>
            About This Show
          </span>
          <span className="px-2 py-0.5 rounded bg-[#2a2a2a] text-[#e9bcb6] text-[10px] font-semibold">
            {mediaTypeLabel}
          </span>
        </div>
        <h3 className="text-base font-bold text-[#e5e2e1] leading-snug">
          {title}
        </h3>
        <div className="p-3 rounded-xl bg-[#2a2a2a]/60 border border-[#353534] flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-[#ffb4aa]">
            <span className="material-symbols-outlined text-sm text-[#e50914]">error_outline</span>
            <span>Unable to load show synopsis.</span>
          </div>
          <button
            type="button"
            onClick={fetchDetails}
            className="self-start px-3 py-1.5 rounded-lg bg-[#201f1f] hover:bg-[#353534] text-[#e5e2e1] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#353534] cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">refresh</span>
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const isLongDescription = Boolean(overview && overview.length > 180);

  return (
    <div
      data-testid="show-description-card"
      className="rounded-2xl bg-[#201f1f] border border-[#353534] p-4 sm:p-5 shadow-lg flex flex-col gap-3"
    >
      {/* A. Section heading */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[#e50914] text-xs font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-sm">info</span>
          About This Show
        </span>
        <span className="px-2 py-0.5 rounded bg-[#2a2a2a] text-[#e9bcb6] text-[10px] font-semibold">
          {mediaTypeLabel}
        </span>
      </div>

      {/* B. Show identity */}
      <h3 className="text-base sm:text-lg font-bold text-[#e5e2e1] leading-snug">
        {title}
      </h3>

      {/* D. Restrained metadata row */}
      {(releaseYear || validGenres.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {releaseYear && (
            <span className="px-2 py-0.5 rounded-md bg-[#2a2a2a] text-[#e5e2e1] text-[11px] font-medium border border-[#353534]/60">
              {releaseYear}
            </span>
          )}
          {validGenres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="px-2 py-0.5 rounded-md bg-[#181818] text-[#e9bcb6]/80 text-[10px] font-medium border border-[#353534]/40"
            >
              {genre}
            </span>
          ))}
        </div>
      )}

      {/* C. Brief description / synopsis */}
      {overview ? (
        <div className="flex flex-col gap-2">
          <p
            className={`text-xs text-[#e9bcb6]/85 leading-relaxed ${
              isExpanded ? '' : 'line-clamp-4'
            }`}
          >
            {overview}
          </p>
          {isLongDescription && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="text-xs text-[#e50914] font-bold hover:underline flex items-center gap-1 self-start cursor-pointer transition-colors focus-visible:outline-none"
            >
              <span>{isExpanded ? 'Show Less' : 'Read More'}</span>
              <span className="material-symbols-outlined text-xs">
                {isExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}
        </div>
      ) : (
        /* Missing overview state */
        <p className="text-xs text-[#e9bcb6]/60 italic leading-relaxed">
          Description is not available for this title yet.
        </p>
      )}
    </div>
  );
};
