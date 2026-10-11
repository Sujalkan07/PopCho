import React, { useState } from 'react';
import type { MediaItem, CommunityReview } from '../../services/tmdb/types';
import { MOCK_REVIEWS } from '../../services/tmdb/mockData';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  show: MediaItem | null;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({ isOpen, onClose, show }) => {
  const [likes, setLikes] = useState<Record<string, number>>({});

  if (!isOpen || !show) return null;

  // Filter reviews matching show id, or show default review if none
  const reviewsForShow = MOCK_REVIEWS.filter((r) => r.showId === show.id);
  const displayReviews: CommunityReview[] =
    reviewsForShow.length > 0
      ? reviewsForShow
      : [
          {
            id: `rev-default-${show.id}`,
            showId: show.id,
            showTitle: show.title,
            showBackdrop: show.backdropPath,
            showPoster: show.posterPath,
            authorUsername: 'FilmBuff42',
            authorAvatar:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            authorRole: 'Community Theorist',
            isVerifiedCritic: true,
            rating: 5,
            essayType: 'Comprehensive Review',
            headline: `Why ${show.title} is an Unrivaled Television Masterpiece`,
            content:
              show.overview +
              ' The visual direction, tonal consistency, and thematic depth make this required viewing for any serious television buff. The online community discussion brings a whole new dimension to rewatching.',
            helpfulCount: 418,
            responsesCount: 62,
            tags: ['Masterpiece', 'Directing', 'Community Favorite'],
            createdAt: '2 days ago',
          },
        ];

  const handleLike = (id: string, currentCount: number) => {
    setLikes((prev) => ({
      ...prev,
      [id]: (prev[id] ?? currentCount) + 1,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl bg-[#201f1f] border border-[#353534] shadow-2xl flex flex-col overflow-hidden">
        {/* Header with show backdrop preview */}
        <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-[#0e0e0e] shrink-0">
          <img
            src={show.featuredImage || show.backdropPath}
            alt={show.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-[#201f1f]/70 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-[#e9bcb6] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[#e50914] uppercase tracking-wider">
                Community Reviews Hub
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#e5e2e1] truncate">
                {show.title}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0e0e0e]/80 border border-[#353534]">
              <span className="material-symbols-outlined text-base text-[#e50914]" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="text-sm font-bold text-[#e5e2e1]">{show.voteAverage.toFixed(1)} / 5.0</span>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {displayReviews.map((rev) => {
            const currentHelpful = likes[rev.id] ?? rev.helpfulCount;

            return (
              <article
                key={rev.id}
                className="p-4 sm:p-5 rounded-xl bg-[#1c1b1b] border border-[#353534] flex flex-col gap-3"
              >
                {/* Author row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={rev.authorAvatar}
                      alt={rev.authorUsername}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-[#353534]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-[#e5e2e1]">
                          @{rev.authorUsername}
                        </span>
                        {rev.isVerifiedCritic && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#353534] text-[#e50914] font-bold">
                            Verified Critic
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#e9bcb6]/70">{rev.createdAt}</span>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-[#e50914]">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: i < rev.rating ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    ))}
                    <span className="text-xs font-bold text-[#e5e2e1] ml-1">{rev.rating}.0</span>
                  </div>
                </div>

                {/* Headline & Body */}
                <h4 className="text-sm sm:text-base font-bold text-[#e5e2e1] leading-snug">
                  {rev.headline}
                </h4>
                <p className="text-xs sm:text-sm text-[#e9bcb6]/85 leading-relaxed">
                  {rev.content}
                </p>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {rev.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-lg bg-[#2a2a2a] text-[#e9bcb6]/80 text-[10px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Interactions */}
                <div className="pt-2 border-t border-[#353534]/50 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleLike(rev.id, rev.helpfulCount)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#353534] text-[#e9bcb6] hover:text-[#e5e2e1] transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">thumb_up</span>
                    <span>{currentHelpful} Found Helpful</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-[#e9bcb6]/70">
                    <span className="material-symbols-outlined text-base">forum</span>
                    <span>{rev.responsesCount} Responses</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#1c1b1b] border-t border-[#353534] flex items-center justify-between">
          <span className="text-xs text-[#e9bcb6]/70">
            Have thoughts on {show.title}?
          </span>
          <button
            type="button"
            onClick={() => alert(`Review composer for ${show.title} opened! You can write and publish your essay.`)}
            className="px-4 py-2 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">edit_note</span>
            <span>Write a Review</span>
          </button>
        </div>
      </div>
    </div>
  );
};
