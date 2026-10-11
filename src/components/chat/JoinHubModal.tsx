import React from 'react';
import type { MediaItem } from '../../services/tmdb/types';
import { MOCK_CHANNELS } from '../../services/tmdb/mockData';

interface JoinHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  show: MediaItem | null;
  onEnterCommunityChat?: (show: MediaItem, channelId: string) => void;
}

export const JoinHubModal: React.FC<JoinHubModalProps> = ({
  isOpen,
  onClose,
  show,
  onEnterCommunityChat,
}) => {
  if (!isOpen || !show) return null;

  const onlineFormatted =
    show.activeOnlineCount && show.activeOnlineCount >= 1000
      ? `${(show.activeOnlineCount / 1000).toFixed(1)}k`
      : `${show.activeOnlineCount || 1200}`;
  const membersFormatted =
    show.communityMembersCount && show.communityMembersCount >= 1000
      ? `${(show.communityMembersCount / 1000).toFixed(1)}k`
      : `${show.communityMembersCount || 45000}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#201f1f] border border-[#353534] shadow-2xl flex flex-col overflow-hidden">
        {/* Banner with Show Backdrop */}
        <div className="relative h-40 w-full overflow-hidden bg-[#0e0e0e]">
          <img
            src={show.featuredImage || show.backdropPath}
            alt={show.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#201f1f] via-[#201f1f]/60 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-[#e9bcb6] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#e50914] font-bold uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                Verified Show Hub
              </div>
              <h2 className="text-2xl font-extrabold text-[#e5e2e1] drop-shadow-md">
                {show.title} Hub
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0e0e0e]/80 text-[#70dc8e] text-xs font-semibold border border-[#353534]">
              <span className="w-2 h-2 rounded-full bg-[#70dc8e] animate-pulse" />
              <span>{onlineFormatted} online</span>
            </div>
          </div>
        </div>

        {/* Channels & Info Section */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between text-xs text-[#e9bcb6]/80 pb-2 border-b border-[#353534]">
            <span>{membersFormatted} Active Fans</span>
            <span>{show.channelsCount || 36} Channels Available</span>
            <span className="text-[#e50914] font-semibold">Spoiler Safe Rooms Included</span>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e9bcb6]/70 mb-2.5">
              Select Channel to Join
            </h4>
            <div className="space-y-2">
              {MOCK_CHANNELS.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => onEnterCommunityChat?.(show, ch.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] border border-[#353534] cursor-pointer transition-all hover:border-[#e50914]/40 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#e50914]/15 flex items-center justify-center text-[#e50914]">
                      <span className="material-symbols-outlined text-lg">tag</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors">
                          #{ch.name}
                        </span>
                        {ch.isSpoilerSafe && (
                          <span className="px-1.5 py-0.2 rounded bg-[#0e0e0e] text-[#e50914] text-[10px] font-bold">
                            Spoiler Masked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#e9bcb6]/70 line-clamp-1">{ch.topic}</p>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-[#e9bcb6]/50 group-hover:text-[#e50914] group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#353534]/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onEnterCommunityChat?.(show, MOCK_CHANNELS[0].id)}
              className="px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>Enter Live Lounge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
