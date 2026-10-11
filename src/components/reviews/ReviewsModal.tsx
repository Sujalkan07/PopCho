import React, { useState, useEffect } from 'react';
import type { MediaItem, NormalizedTmdbReview } from '../../services/tmdb/types';
import { getMediaReviews } from '../../services/tmdb/reviews';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  show: MediaItem | null;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({ isOpen, onClose, show }) => {
  const [reviews, setReviews] = useState<NormalizedTmdbReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Fetch real reviews whenever the modal opens or selected show changes
  useEffect(() => {
    if (!isOpen || !show) {
      setReviews([]);
      setLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    const targetId = show.tmdbId ?? show.id;
    const targetMediaType = show.mediaType ?? 'tv';

    // Reset review state so previous show reviews never leak
    setReviews([]);
    setLoading(true);
    setError(null);

    getMediaReviews(targetId, targetMediaType)
      .then((data) => {
        if (!isCancelled) {
          setReviews(data.results || []);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!isCancelled) {
          console.error(`Failed to fetch reviews for ${show.title} (${targetId})`, err);
          setError(
            err.message || 'Unable to load reviews for this title. Please check your network connection.'
          );
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, show?.id, show?.tmdbId, show?.mediaType]);

  const handleRetry = () => {
    if (!show) return;
    const targetId = show.tmdbId ?? show.id;
    const targetMediaType = show.mediaType ?? 'tv';
    setLoading(true);
    setError(null);

    getMediaReviews(targetId, targetMediaType)
      .then((data) => {
        setReviews(data.results || []);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || 'Unable to load reviews for this title.');
        setLoading(false);
      });
  };

  if (!isOpen || !show) return null;

  const backdropSrc = show.featuredImage || show.backdropPath || show.posterPath;
  const rating10 =
    show.voteAverage && show.voteAverage > 0 ? `${show.voteAverage.toFixed(1)} / 10` : 'NR';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reviews-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl bg-[#201f1f] border border-[#353534] shadow-2xl flex flex-col overflow-hidden">
        {/* Header with show backdrop preview */}
        <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-[#0e0e0e] shrink-0">
          {backdropSrc && (
            <img
              src={backdropSrc}
              alt={show.title}
              className="w-full h-full object-cover object-center"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-[#201f1f]/70 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-[#e9bcb6] hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[#e50914] uppercase tracking-wider">
                {show.mediaType === 'movie' ? 'Official Movie Reviews' : 'Official TV Series Reviews'}
              </span>
              <h2
                id="reviews-modal-title"
                className="text-xl sm:text-2xl font-extrabold text-[#e5e2e1] truncate"
              >
                {show.title}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0e0e0e]/80 border border-[#353534] shrink-0">
              <span
                className="material-symbols-outlined text-base text-[#e50914]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span className="text-sm font-bold text-[#e5e2e1]">{rating10}</span>
              {show.voteCount > 0 && (
                <span className="text-[11px] text-[#e9bcb6]/60 hidden sm:inline">
                  ({show.voteCount.toLocaleString()} votes)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Loading State */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <span className="material-symbols-outlined text-3xl text-[#e50914] animate-spin">
                progress_activity
              </span>
              <p className="text-sm text-[#e9bcb6]/80 font-medium">
                Loading authentic reviews for {show.title}…
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#e50914]/15 border border-[#e50914]/40 flex items-center justify-center text-[#e50914]">
                <span className="material-symbols-outlined text-2xl">error_outline</span>
              </div>
              <h3 className="text-base font-bold text-[#e5e2e1]">Failed to Load Reviews</h3>
              <p className="text-xs text-[#e9bcb6]/75 max-w-md">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 px-4 py-2 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && reviews.length === 0 && (
            <div className="py-20 px-4 text-center flex flex-col items-center justify-center gap-3 bg-[#1c1b1b] rounded-xl border border-[#353534]/60">
              <div className="w-14 h-14 rounded-2xl bg-[#201f1f] border border-[#353534] flex items-center justify-center text-[#e9bcb6]/50">
                <span className="material-symbols-outlined text-3xl">rate_review</span>
              </div>
              <h3 className="text-lg font-bold text-[#e5e2e1]">No Reviews Available Yet</h3>
              <p className="text-xs sm:text-sm text-[#e9bcb6]/75 max-w-md leading-relaxed">
                No user or critic reviews have been published for{' '}
                <strong className="text-[#e5e2e1] font-semibold">{show.title}</strong> on TMDB yet.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#2a2a2a] text-[#e9bcb6]/80 text-xs border border-[#353534]">
                  {show.mediaType === 'movie' ? 'Feature Film' : 'Television Series'}
                </span>
                {show.releaseDate && (
                  <span className="px-2.5 py-1 rounded-full bg-[#2a2a2a] text-[#e9bcb6]/80 text-xs border border-[#353534]">
                    Released {show.releaseDate.slice(0, 4)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Real Reviews List */}
          {!loading && !error && reviews.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#e9bcb6]/70 pb-2 border-b border-[#353534]/50">
                <span>
                  Showing <strong className="text-[#e5e2e1]">{reviews.length}</strong> verified{' '}
                  {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
                <span className="text-[11px] text-[#e9bcb6]/60">Source: TMDB Archive</span>
              </div>

              {reviews.map((rev) => {
                const isExpanded = expandedIds[rev.id] ?? false;
                const isLong = rev.content.length > 420;
                const displayContent =
                  !isLong || isExpanded ? rev.content : rev.content.slice(0, 420) + '…';
                const formattedDate = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : undefined;

                return (
                  <article
                    key={rev.id}
                    className="p-4 sm:p-5 rounded-xl bg-[#1c1b1b] border border-[#353534] flex flex-col gap-3 shadow-md transition-colors hover:border-[#353534]/90"
                  >
                    {/* Author row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        {rev.avatarUrl ? (
                          <img
                            src={rev.avatarUrl}
                            alt={rev.author}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-[#353534]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center text-xs font-bold text-[#e50914]">
                            {rev.author.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-[#e5e2e1]">
                              {rev.author}
                            </span>
                            {rev.username && rev.username !== rev.author && (
                              <span className="text-xs text-[#e9bcb6]/60">@{rev.username}</span>
                            )}
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#2a2a2a] text-[#e9bcb6]/80 border border-[#353534]">
                              TMDB Reviewer
                            </span>
                          </div>
                          {formattedDate && (
                            <span className="text-[11px] text-[#e9bcb6]/70">{formattedDate}</span>
                          )}
                        </div>
                      </div>

                      {/* Source Rating on 10-point scale (only when provided!) */}
                      {rev.rating !== null && rev.rating !== undefined ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#201f1f] border border-[#353534]">
                          <span
                            className="material-symbols-outlined text-sm text-[#e50914]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span className="text-xs font-bold text-[#e5e2e1]">
                            {rev.rating} / 10
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#e9bcb6]/50 italic">
                          Unrated Review
                        </span>
                      )}
                    </div>

                    {/* Review Body */}
                    <div className="text-xs sm:text-sm text-[#e9bcb6]/90 leading-relaxed whitespace-pre-line">
                      {displayContent}
                    </div>

                    {isLong && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedIds((prev) => ({ ...prev, [rev.id]: !isExpanded }))
                        }
                        className="self-start text-xs font-semibold text-[#e50914] hover:underline cursor-pointer"
                      >
                        {isExpanded ? 'Show less' : 'Read full review'}
                      </button>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-[#353534]/50 flex items-center justify-between text-xs flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLikes((prev) => ({ ...prev, [rev.id]: (prev[rev.id] ?? 0) + 1 }))
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#353534] text-[#e9bcb6] hover:text-[#e5e2e1] transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">thumb_up</span>
                        <span>
                          {likes[rev.id] ? `${likes[rev.id]} Helpful` : 'Helpful'}
                        </span>
                      </button>

                      {rev.url && (
                        <a
                          href={rev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-[#e9bcb6]/70 hover:text-[#e50914] transition-colors"
                        >
                          <span>View on TMDB</span>
                          <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#1c1b1b] border-t border-[#353534] flex items-center justify-between">
          <span className="text-xs text-[#e9bcb6]/70">
            Official reviews for {show.title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-xs font-bold transition-all border border-[#353534] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
