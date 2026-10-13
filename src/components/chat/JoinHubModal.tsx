import React, { useState, useEffect } from 'react';
import type { MediaItem } from '../../services/tmdb/types';
import { lookupCommunity, type ChannelRecord } from '../../services/community/api';

interface JoinHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  show: MediaItem | null;
  onEnterCommunityChat?: (show: MediaItem, channelId: string) => void;
}

interface DisplayChannel {
  id: string;
  name: string;
  description?: string | null;
  topic?: string;
  isSpoilerSafe?: boolean;
}

function generateShowFallbackChannels(show: MediaItem): DisplayChannel[] {
  const isTv = show.mediaType === 'tv';
  const prefix = show.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16).replace(/-$/, '');
  if (isTv) {
    return [
      { id: 'ch-general', name: `general-${prefix || 'hub'}`, description: `General fan chatter, cast news, and meetups for ${show.title}`, isSpoilerSafe: false },
      { id: 'ch-theories', name: `${prefix || 'show'}-theories`, description: `Deep-dive theories, hidden clues, and lore analysis for ${show.title}`, isSpoilerSafe: true },
      { id: 'ch-episodes', name: 'episode-reactions', description: `Live reactions, episode recaps, and season breakdowns`, isSpoilerSafe: true },
      { id: 'ch-spoilers', name: 'spoilers-and-leaks', description: `Spoiler-masked room for leaks, endings, and future developments`, isSpoilerSafe: true },
      { id: 'ch-fanart', name: 'fan-art-and-media', description: `Fan creations, artwork, edits, and soundtrack appreciation`, isSpoilerSafe: false },
    ];
  }
  return [
    { id: 'ch-movie', name: `${prefix || 'movie'}-discussion`, description: `Cinema reactions, reviews, and general discussion for ${show.title}`, isSpoilerSafe: false },
    { id: 'ch-theories', name: 'plot-theories', description: `Storyline analysis, lore, and sequel predictions for ${show.title}`, isSpoilerSafe: true },
    { id: 'ch-ending', name: 'ending-breakdown', description: `Spoiler-masked discussion of the climax, post-credits, and ending`, isSpoilerSafe: true },
    { id: 'ch-cinematography', name: 'cinematography-soundtrack', description: `Visuals, score, directing, and behind-the-scenes discussion`, isSpoilerSafe: false },
    { id: 'ch-fanart', name: 'fan-art-and-edits', description: `Fan creations, posters, wallpapers, and edits for ${show.title}`, isSpoilerSafe: false },
  ];
}

export const JoinHubModal: React.FC<JoinHubModalProps> = ({
  isOpen,
  onClose,
  show,
  onEnterCommunityChat,
}) => {
  const [channels, setChannels] = useState<DisplayChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !show) {
      setChannels([]);
      setIsLoadingChannels(true);
      return;
    }

    let isMounted = true;
    setIsLoadingChannels(true);

    lookupCommunity(show)
      .then((data) => {
        if (!isMounted) return;
        const comm = data.community;
        if (comm.channels && comm.channels.length > 0) {
          const mapped: DisplayChannel[] = comm.channels.map((c: ChannelRecord) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            isSpoilerSafe: Boolean(c.name.includes('spoiler') || c.name.includes('ending') || c.name.includes('theories')),
          }));
          setChannels(mapped);
        } else {
          setChannels(generateShowFallbackChannels(show));
        }
        if (typeof comm.memberCount === 'number') {
          setMemberCount(comm.memberCount);
        }
      })
      .catch((err) => {
        console.warn('Failed to load community details for modal:', err);
        if (isMounted) {
          setChannels(generateShowFallbackChannels(show));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingChannels(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, show]);

  if (!isOpen || !show) return null;

  const currentMembers = memberCount ?? show.communityMembersCount ?? 0;
  const onlineFormatted =
    show.activeOnlineCount && show.activeOnlineCount >= 1000
      ? `${(show.activeOnlineCount / 1000).toFixed(1)}k`
      : `${show.activeOnlineCount || 1}`;
  const membersFormatted =
    currentMembers >= 1000
      ? `${(currentMembers / 1000).toFixed(1)}k`
      : `${currentMembers}`;

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
            <span>{currentMembers > 0 ? `${membersFormatted} Active Fans` : 'Active Fan Hub'}</span>
            <span>{channels.length} Channels Available</span>
            <span className="text-[#e50914] font-semibold">Spoiler Safe Rooms Included</span>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#e9bcb6]/70 mb-2.5">
              Select Channel to Join
            </h4>
            {isLoadingChannels ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <span className="w-6 h-6 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[#e9bcb6]/80 font-medium">Syncing verified community channels for {show.title}...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {channels.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => onEnterCommunityChat?.(show, ch.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#1c1b1b] hover:bg-[#2a2a2a] border border-[#353534] cursor-pointer transition-all hover:border-[#e50914]/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#e50914]/15 flex items-center justify-center text-[#e50914] shrink-0">
                        <span className="material-symbols-outlined text-lg">tag</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors truncate">
                            #{ch.name}
                          </span>
                          {ch.isSpoilerSafe && (
                            <span className="px-1.5 py-0.2 rounded bg-[#0e0e0e] text-[#e50914] text-[10px] font-bold shrink-0">
                              Spoiler Masked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#e9bcb6]/70 line-clamp-1">
                          {ch.description || ch.topic || 'Fan discussions & real-time chat'}
                        </p>
                      </div>
                    </div>

                    <span className="material-symbols-outlined text-[#e9bcb6]/50 group-hover:text-[#e50914] group-hover:translate-x-1 transition-all shrink-0 ml-2">
                      arrow_forward
                    </span>
                  </div>
                ))}
              </div>
            )}
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
              disabled={isLoadingChannels || channels.length === 0}
              onClick={() => onEnterCommunityChat?.(show, channels[0]?.id || '')}
              className="px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
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
