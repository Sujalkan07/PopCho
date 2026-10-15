import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MediaItem, ChatMessage, CommunityChannel } from '../../services/tmdb/types';
import { useAuth } from '../../contexts/AuthContext';
import {
  lookupCommunity,
  getMessages,
  sendMessage,
  toggleReaction,
  joinCommunity,
  leaveCommunity,
  type CommunityRecord,
} from '../../services/community/api';
import {
  joinChannelRoom,
  leaveChannelRoom,
  subscribeToMessages,
  subscribeToReactions,
  subscribeToPresence,
  emitSendMessage,
  emitToggleReaction,
  subscribeToConnection,
  isSocketConnected as checkSocketConnected,
} from '../../services/community/socket';

function generateShowFallbackChannels(show: MediaItem): CommunityChannel[] {
  const isTv = show.mediaType === 'tv';
  const prefix = show.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16).replace(/-$/, '') || 'hub';
  if (isTv) {
    return [
      { id: 'ch-general', communityId: 'default', name: `general-${prefix}`, topic: `General fan chatter, cast news, and meetups for ${show.title}`, isSpoilerSafe: false },
      { id: 'ch-theories', communityId: 'default', name: `${prefix}-theories`, topic: `Deep-dive theories, hidden clues, and lore analysis for ${show.title}`, isSpoilerSafe: true },
      { id: 'ch-episodes', communityId: 'default', name: 'episode-reactions', topic: `Live reactions, episode recaps, and season breakdowns for ${show.title}`, isSpoilerSafe: true },
      { id: 'ch-spoilers', communityId: 'default', name: 'spoilers-and-leaks', topic: `Spoiler-masked room for leaks, endings, and future developments`, isSpoilerSafe: true },
      { id: 'ch-fanart', communityId: 'default', name: 'fan-art-and-media', topic: `Fan creations, artwork, edits, and soundtrack appreciation`, isSpoilerSafe: false },
    ];
  }
  return [
    { id: 'ch-movie', communityId: 'default', name: `${prefix}-discussion`, topic: `Cinema reactions, reviews, and general discussion for ${show.title}`, isSpoilerSafe: false },
    { id: 'ch-theories', communityId: 'default', name: 'plot-theories', topic: `Storyline analysis, lore, and sequel predictions for ${show.title}`, isSpoilerSafe: true },
    { id: 'ch-ending', communityId: 'default', name: 'ending-breakdown', topic: `Spoiler-masked discussion of the climax, post-credits, and ending`, isSpoilerSafe: true },
    { id: 'ch-cinematography', communityId: 'default', name: 'cinematography-soundtrack', topic: `Visuals, score, directing, and behind-the-scenes discussion`, isSpoilerSafe: false },
    { id: 'ch-fanart', communityId: 'default', name: 'fan-art-and-edits', topic: `Fan creations, posters, wallpapers, and edits for ${show.title}`, isSpoilerSafe: false },
  ];
}

interface CommunityChatWorkspaceProps {
  show: MediaItem;
  initialChannelId?: string;
  onBackToDashboard?: () => void;
}

export const CommunityChatWorkspace: React.FC<CommunityChatWorkspaceProps> = ({
  show,
  initialChannelId,
  onBackToDashboard,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'theories' | 'reviews'>('chat');
  const [communityRecord, setCommunityRecord] = useState<CommunityRecord | null>(null);
  const initialChannels = generateShowFallbackChannels(show);
  const [channels, setChannels] = useState<CommunityChannel[]>(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId || initialChannels[0]?.id || 'ch-general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSpoilerMode, setIsSpoilerMode] = useState(false);
  const [unmaskedSpoilers, setUnmaskedSpoilers] = useState<Record<string, boolean>>({});
  const [userJoined, setUserJoined] = useState(false);
  const [memberCount, setMemberCount] = useState<number>(show.communityMembersCount || 0);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(checkSocketConnected());

  // Watch party countdown state
  const [countdown, setCountdown] = useState({ days: 2, hours: 14, mins: 38, secs: 52 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
        if (prev.mins > 0) return { ...prev, mins: prev.mins - 1, secs: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, mins: 59, secs: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, mins: 59, secs: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const chatStreamRef = useRef<HTMLDivElement>(null);

  // Subscribe to live socket connection status
  useEffect(() => {
    const unsub = subscribeToConnection((connected) => {
      setIsSocketConnected(connected);
    });
    return () => unsub();
  }, []);

  // 1. Load community & channels from backend database
  useEffect(() => {
    let isMounted = true;
    lookupCommunity(show)
      .then((res) => {
        if (!isMounted) return;
        setCommunityRecord(res.community);
        setUserJoined(res.isMember);
        if (typeof res.community.memberCount === 'number') {
          setMemberCount(res.community.memberCount);
        }

        if (res.community.channels && res.community.channels.length > 0) {
          const mappedChannels: CommunityChannel[] = res.community.channels.map((c) => ({
            id: c.id,
            communityId: c.communityId,
            name: c.name,
            topic: c.description || `#${c.name} discussion`,
            isSpoilerSafe: Boolean(c.isSpoilerSafe),
          }));
          setChannels(mappedChannels);

          // Select matching channel or first channel
          const found = mappedChannels.find(
            (ch) => ch.id === initialChannelId || ch.name === initialChannelId
          );
          if (found) {
            setActiveChannelId(found.id);
          } else if (mappedChannels.length > 0) {
            setActiveChannelId(mappedChannels[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend community lookup error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [show, initialChannelId]);

  // 2. Load messages from database whenever active channel or community changes
  const loadChannelMessages = useCallback(async () => {
    if (!communityRecord?.id || !activeChannelId) return;
    setIsLoadingMessages(true);
    setMessagesError(null);
    try {
      const dbMessages = await getMessages(communityRecord.id, activeChannelId, 50);
      setMessages(dbMessages || []);
    } catch (err) {
      console.warn('Could not load channel messages from DB:', err);
      setMessagesError('Failed to load message history from database.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [communityRecord, activeChannelId]);

  useEffect(() => {
    setMessages([]);
    loadChannelMessages();
  }, [activeChannelId, loadChannelMessages]);

  // 3. Connect Socket.IO channel room for real-time messages & reactions
  useEffect(() => {
    if (!activeChannelId) return;

    joinChannelRoom(activeChannelId);

    const unsubMsg = subscribeToMessages((incoming) => {
      if (incoming.channelId === activeChannelId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        setTimeout(() => {
          if (chatStreamRef.current) {
            chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
          }
        }, 50);
      }
    });

    const unsubReact = subscribeToReactions((data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    });

    const unsubPres = subscribeToPresence((data) => {
      if (data.channelId === activeChannelId) {
        setOnlineCount(data.onlineCount);
      }
    });

    return () => {
      leaveChannelRoom(activeChannelId);
      unsubMsg();
      unsubReact();
      unsubPres();
    };
  }, [activeChannelId]);

  const toggleSpoilerMask = (id: string) => {
    setUnmaskedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 4. Send message handler (Sockets with REST fallback & draft preservation on error)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    const isSpoiler = isSpoilerMode || trimmed.startsWith('[SPOILER]');
    const cleanContent = trimmed.replace(/^\[SPOILER\]\s*/, '');

    setIsSending(true);
    setSendError(null);

    try {
      let savedMessage: ChatMessage | null = null;

      // Primary: Real-time Socket.IO emission
      if (isSocketConnected) {
        const socketRes = await emitSendMessage(activeChannelId, cleanContent, isSpoiler);
        if (socketRes.success && socketRes.message) {
          savedMessage = socketRes.message;
        } else {
          throw new Error(socketRes.error || 'Real-time send error');
        }
      } else if (communityRecord?.id) {
        // Fallback: REST API
        const restMsg = await sendMessage(communityRecord.id, activeChannelId, cleanContent, isSpoiler);
        savedMessage = restMsg;
      }

      if (savedMessage) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === savedMessage!.id)) return prev;
          return [...prev, savedMessage!];
        });
        // Clear input draft only after successful persistence
        setInputText('');
        setIsSpoilerMode(false);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setSendError(msg);
      // Draft preserved in inputText
    } finally {
      setIsSending(false);
      setTimeout(() => {
        if (chatStreamRef.current) {
          chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  // 5. Add / Toggle reaction handler with rollback on error
  const handleAddReaction = async (messageId: string, emoji: string) => {
    const previousMessages = messages;
    const currentUserId = user?.id || 'guest';

    // Optimistic local update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          const userAlreadyReacted = existing.users.includes(currentUserId);
          if (userAlreadyReacted) {
            const nextCount = Math.max(0, existing.count - 1);
            return {
              ...m,
              reactions:
                nextCount === 0
                  ? m.reactions.filter((r) => r.emoji !== emoji)
                  : m.reactions.map((r) =>
                      r.emoji === emoji
                        ? {
                            ...r,
                            count: nextCount,
                            users: r.users.filter((u) => u !== currentUserId),
                          }
                        : r
                    ),
            };
          }
          return {
            ...m,
            reactions: m.reactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] } : r
            ),
          };
        }
        return {
          ...m,
          reactions: [...m.reactions, { emoji, count: 1, users: [currentUserId] }],
        };
      })
    );

    try {
      const socketRes = await emitToggleReaction(messageId, activeChannelId, emoji);
      if (socketRes.success && socketRes.reactions) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: socketRes.reactions! } : m))
        );
      } else if (communityRecord?.id) {
        const restRes = await toggleReaction(communityRecord.id, activeChannelId, messageId, emoji);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: restRes.reactions } : m))
        );
      } else {
        setMessages(previousMessages);
      }
    } catch (err) {
      console.warn('Reaction update error, rolling back:', err);
      setMessages(previousMessages);
    }
  };

  // 6. Join / Leave Community handler
  const handleToggleJoin = async () => {
    if (!communityRecord?.id) return;
    try {
      if (!userJoined) {
        const res = await joinCommunity(communityRecord.id);
        setUserJoined(true);
        setMemberCount(res.memberCount);
      } else {
        const res = await leaveCommunity(communityRecord.id);
        setUserJoined(false);
        setMemberCount(res.memberCount);
      }
    } catch (err) {
      console.error('Failed to toggle community membership:', err);
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0] || initialChannels[0];

  return (
    <div className="w-full min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col animate-fadeIn">
      {/* Top Banner Navigation & Breadcrumb */}
      <div className="w-full bg-[#0e0e0e] border-b border-[#353534] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex items-center gap-2 text-xs font-semibold text-[#e9bcb6] hover:text-[#e5e2e1] transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to All Show Hubs</span>
        </button>
        <span className={`text-xs flex items-center gap-1.5 font-medium ${isSocketConnected ? 'text-[#70dc8e]' : 'text-[#ffb4aa]'}`}>
          <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-[#70dc8e] animate-pulse' : 'bg-[#e50914]'}`} />
          {isSocketConnected ? 'Live Real-time Socket Synchronized' : 'Connecting to Live Sync...'}
        </span>
      </div>

      {/* Cinematic Header Backdrop */}
      <div className="relative w-full overflow-hidden bg-[#0e0e0e]">
        <div
          className="relative w-full h-[320px] sm:h-[360px] bg-cover bg-center"
          style={{ backgroundImage: `url('${show.featuredImage || show.backdropPath}')` }}
        >
          {/* Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e] via-[#0e0e0e]/50 to-transparent" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Content Container */}
          <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-5">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
              {/* Left Identity & Metadata */}
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e50914]/20 text-[#ffb4aa] text-xs font-bold uppercase tracking-wider border border-[#e50914]/30">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                    Official Hub • Verified Fandom {memberCount > 0 || show.communityMembersCount ? `• ${(memberCount > 0 ? memberCount : show.communityMembersCount!).toLocaleString()} Fans` : ''}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#201f1f] text-[#e9bcb6] text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e]" />
                    {show.statusText || 'Active Fandom'}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-[#e5e2e1] drop-shadow-md">
                    {show.title}
                  </h1>
                  <span className="text-xs uppercase tracking-widest text-[#ffb4aa] font-bold">
                    {show.network || 'Fandom Core'}
                  </span>
                </div>

                {/* Metadata Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#e9bcb6]/80 pt-0.5">
                  {show.genres.map((g) => (
                    <span key={g} className="px-2 py-0.5 rounded bg-[#201f1f] text-[#e5e2e1] font-semibold">
                      {g}
                    </span>
                  ))}
                  <span>•</span>
                  <span>
                    {show.numberOfSeasons
                      ? `${show.numberOfSeasons} Seasons (${show.numberOfEpisodes || 0} Episodes)`
                      : show.mediaType === 'movie'
                      ? 'Feature Film'
                      : 'Series'}
                  </span>
                </div>

                {/* Quick Stats Ribbon */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1 text-xs text-[#e9bcb6]">
                  <div className="flex items-center gap-1.5 text-[#e5e2e1]">
                    <span className="material-symbols-outlined text-[#e50914] text-base">groups</span>
                    <strong>{(memberCount > 0 ? memberCount : show.communityMembersCount || 0).toLocaleString()}</strong> Members
                  </div>
                  <div className="flex items-center gap-1.5 text-[#e5e2e1]">
                    <span className="material-symbols-outlined text-[#e50914] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                    <strong>{show.voteAverage ? show.voteAverage.toFixed(1) : 'NR'}</strong> Rating
                  </div>
                  <div className="flex items-center gap-1.5 text-[#e5e2e1]">
                    <span className="material-symbols-outlined text-[#70dc8e] text-base">forum</span>
                    <strong className="text-[#70dc8e]">{channels.length > 0 ? channels.length : (show.channelsCount || 4)} Active</strong> Channels
                  </div>
                </div>
              </div>

              {/* Right CTA Buttons */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleToggleJoin}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md ${
                    userJoined
                      ? 'bg-[#2a2a2a] text-[#70dc8e] border border-[#70dc8e]/40'
                      : 'bg-[#e50914] text-white hover:bg-[#b2000d]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {userJoined ? 'check_circle' : 'person_add'}
                  </span>
                  <span>{userJoined ? 'Joined Hub' : 'Join Community'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Review modal triggered!')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e50914] text-white hover:bg-[#b2000d] text-xs sm:text-sm font-bold transition-all shadow-lg"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  <span>Write Review</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="w-full bg-[#0e0e0e] border-t border-[#353534]/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between overflow-x-auto">
            <nav className="flex items-center gap-1.5 py-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-[#e50914] text-white font-bold shadow-md'
                    : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                }`}
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'bg-[#e50914] text-white font-bold shadow-md'
                    : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                Live Community Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('theories')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'theories'
                    ? 'bg-[#e50914] text-white font-bold shadow-md'
                    : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                }`}
              >
                <span className="material-symbols-outlined text-base">psychology</span>
                Fan Theories &amp; Threads
                <span className="px-1.5 py-0.2 rounded-full bg-[#2a2a2a] text-[#e9bcb6] text-[10px]">840+</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'bg-[#e50914] text-white font-bold shadow-md'
                    : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                }`}
              >
                <span className="material-symbols-outlined text-base">reviews</span>
                Reviews (14.2k)
              </button>
            </nav>

            {/* Channel Quick Switch */}
            <div className="hidden md:flex items-center gap-2 py-2">
              <span className="text-xs text-[#e9bcb6]/70">Channel:</span>
              <select
                value={activeChannelId}
                onChange={(e) => setActiveChannelId(e.target.value)}
                className="bg-[#201f1f] text-[#e5e2e1] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#353534] focus:outline-none cursor-pointer"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Chat Workspace Area */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT CHAT VIEWPORT */}
          <section className="lg:col-span-8 xl:col-span-9 flex flex-col rounded-2xl bg-[#201f1f] border border-[#353534] overflow-hidden shadow-2xl min-w-0">
            {/* Chat Channel Header Bar */}
            <div className="px-5 py-3.5 bg-[#2a2a2a] border-b border-[#353534] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#e50914]/20 flex items-center justify-center flex-shrink-0 text-[#e50914]">
                  <span className="material-symbols-outlined text-xl">tag</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#e5e2e1] tracking-tight truncate">
                      {activeChannel.name}
                    </span>
                    {activeChannel.isSpoilerSafe && (
                      <span className="px-2 py-0.5 rounded bg-[#0e0e0e] text-[#ffb4aa] text-[10px] font-bold uppercase tracking-wider border border-[#e50914]/30">
                        Spoiler Safe Area
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#e9bcb6]/75 truncate max-w-lg">
                    {activeChannel.topic}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  className="p-2 rounded-xl bg-[#201f1f] hover:bg-[#353534] text-[#e9bcb6] hover:text-[#e5e2e1] transition-all"
                  title="Pinned Messages"
                >
                  <span className="material-symbols-outlined text-base">push_pin</span>
                </button>
                <button
                  type="button"
                  className="p-2 rounded-xl bg-[#201f1f] hover:bg-[#353534] text-[#e9bcb6] hover:text-[#e5e2e1] transition-all"
                  title="Channel Notification Settings"
                >
                  <span className="material-symbols-outlined text-base">notifications</span>
                </button>
              </div>
            </div>

            {/* Chat Messages Canvas */}
            <div
              ref={chatStreamRef}
              className="p-4 sm:p-5 space-y-4 bg-[#201f1f] min-h-[500px] max-h-[680px] overflow-y-auto"
            >
              {/* System / Date Announcement Separator */}
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full bg-[#353534] h-[1px]" />
                </div>
                <div className="relative px-4 py-1 rounded-full bg-[#2a2a2a] text-[#e9bcb6] text-xs font-semibold flex items-center gap-2 border border-[#353534] shadow-sm">
                  <span className="material-symbols-outlined text-[#e50914] text-xs">calendar_today</span>
                  <span>Today — Live Community Watchstream &amp; Theories</span>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingMessages && (
                <div className="flex flex-col items-center justify-center py-16 text-[#e9bcb6]/70 gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-[#e50914] border-t-transparent animate-spin" />
                  <span className="text-xs font-medium">Synchronizing channel messages...</span>
                </div>
              )}

              {/* Error State */}
              {messagesError && !isLoadingMessages && (
                <div className="p-4 rounded-xl bg-[#2a1a1a] border border-[#e50914]/40 flex items-center justify-between text-xs text-[#ffdad6] my-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#e50914] text-base">error</span>
                    <span>{messagesError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadChannelMessages()}
                    className="px-3 py-1 rounded-lg bg-[#e50914] text-white font-bold hover:bg-[#b2000d]"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!isLoadingMessages && !messagesError && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[#e9bcb6]/70 gap-2">
                  <span className="material-symbols-outlined text-4xl text-[#353534]">forum</span>
                  <h3 className="text-sm font-bold text-[#e5e2e1]">#{activeChannel.name} is quiet</h3>
                  <p className="text-xs max-w-sm">No discussions have started here yet. Be the first fan to post a theory or breakdown!</p>
                </div>
              )}

              {/* Messages Feed */}
              {messages.map((msg) => {
                const isSpoilerMasked = msg.isSpoiler && !unmaskedSpoilers[msg.id];

                return (
                  <article
                    key={msg.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#2a2a2a]/60 transition-colors group"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={msg.userAvatar}
                        alt={msg.userName}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-[#353534]"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#70dc8e] ring-2 ring-[#201f1f]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs sm:text-sm font-bold text-[#e5e2e1] hover:underline cursor-pointer">
                          @{msg.userName}
                        </span>
                        {msg.userRole && (
                          <span className="px-2 py-0.5 rounded-full bg-[#2a2a2a] text-[#ffb4aa] text-[10px] font-bold flex items-center gap-1 border border-[#353534]">
                            {msg.userBadge && (
                              <span className="material-symbols-outlined text-xs">{msg.userBadge}</span>
                            )}
                            {msg.userRole}
                          </span>
                        )}
                        <span className="text-[11px] text-[#e9bcb6]/60 ml-auto">{msg.createdAt}</span>
                      </div>

                      {/* Message Content with Spoiler Support */}
                      {isSpoilerMasked ? (
                        <div
                          onClick={() => toggleSpoilerMask(msg.id)}
                          className="mt-1 cursor-pointer select-none rounded-xl bg-[#0e0e0e] p-3 border border-[#e50914]/40 hover:border-[#e50914] transition-all group/sp"
                        >
                          <div className="flex items-center justify-between text-[#e50914] text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              SPOILER WARNING: Click to reveal theory / leak details
                            </span>
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-[#e5e2e1] leading-relaxed">
                          {msg.content}
                          {msg.isSpoiler && (
                            <button
                              type="button"
                              onClick={() => toggleSpoilerMask(msg.id)}
                              className="block mt-1 text-[10px] text-[#e9bcb6]/60 hover:text-[#e50914]"
                            >
                              (Click to re-mask spoiler)
                            </button>
                          )}
                        </div>
                      )}

                      {/* Reactions Row */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {msg.reactions.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleAddReaction(msg.id, r.emoji)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2a2a2a] hover:bg-[#353534] text-xs font-bold text-[#e5e2e1] border border-[#353534] transition-all active:scale-95"
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}

                        {/* Quick Reaction Triggers */}
                        <button
                          type="button"
                          onClick={() => handleAddReaction(msg.id, '🔥')}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-xs text-[#e9bcb6] hover:bg-[#2a2a2a] transition-all"
                          title="React with 🔥"
                        >
                          +🔥
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddReaction(msg.id, '💡')}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-xs text-[#e9bcb6] hover:bg-[#2a2a2a] transition-all"
                          title="React with 💡"
                        >
                          +💡
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Persistent Message Composer Bar */}
            <div className="p-3 sm:p-4 bg-[#2a2a2a] border-t border-[#353534]">
              <div className="flex items-center justify-between pb-2 text-[11px] text-[#e9bcb6]/70">
                <span className={`flex items-center gap-1.5 ${isSocketConnected ? 'text-[#70dc8e]' : 'text-[#ffb4aa]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSocketConnected ? 'bg-[#70dc8e] animate-pulse' : 'bg-[#e50914]'}`} />
                  {isSocketConnected ? 'Channel connected' : 'Connecting live sync...'} ({onlineCount > 0 ? onlineCount : 1} active {onlineCount === 1 ? 'fan' : 'fans'})
                </span>
                {isSpoilerMode && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#e50914] text-white font-bold">
                    <span className="material-symbols-outlined text-xs">visibility_off</span>
                    Spoiler Mode Active
                  </span>
                )}
              </div>

              {sendError && (
                <div className="mb-2 px-3 py-1.5 rounded-lg bg-[#2a1a1a] border border-[#e50914]/40 text-[#ffdad6] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#e50914]">error</span>
                    <span>{sendError}</span>
                  </div>
                  <button type="button" onClick={() => setSendError(null)} className="text-[#ffb4ab] text-xs hover:underline">
                    Dismiss
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex flex-col gap-2 bg-[#0e0e0e] rounded-xl p-2 border border-[#353534] focus-within:border-[#e50914]">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message #${activeChannel.name}... (Click Spoiler button or type /spoiler)`}
                  className="w-full bg-transparent resize-none text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs sm:text-sm focus:outline-none p-1.5"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />

                <div className="flex items-center justify-between pt-1 border-t border-[#353534]/40">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsSpoilerMode(!isSpoilerMode)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isSpoilerMode
                          ? 'bg-[#e50914] text-white shadow-sm'
                          : 'bg-[#201f1f] text-[#e9bcb6] hover:text-[#e50914]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">visibility_off</span>
                      <span>Spoiler</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputText((p) => p + ' 🔥 ')}
                      className="p-1.5 rounded-lg text-[#e9bcb6] hover:bg-[#201f1f]"
                      title="Insert emoji"
                    >
                      <span className="material-symbols-outlined text-base">mood</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95 ${
                      isSending || !inputText.trim()
                        ? 'bg-[#353534] text-[#e9bcb6]/50 cursor-not-allowed'
                        : 'bg-[#e50914] hover:bg-[#b2000d]'
                    }`}
                  >
                    <span>{isSending ? 'Sending...' : 'Send'}</span>
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* RIGHT CONTEXTUAL SIDEBAR */}
          <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-5">
            {/* Pinned Fan Theory Card */}
            <div className="rounded-2xl bg-[#201f1f] border border-[#353534] p-4 sm:p-5 shadow-lg flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#e50914] text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm">push_pin</span>
                  Theory of the Week
                </span>
                <span className="px-2 py-0.5 rounded bg-[#2a2a2a] text-[#e9bcb6] text-[10px] font-semibold">
                  4.2k Upvotes
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#e5e2e1] leading-snug">
                "Will Byers Created the Architectural Terrain Layout of the Upside Down in 1983"
              </h3>
              <p className="text-xs text-[#e9bcb6]/80 line-clamp-3 leading-relaxed">
                Analytical breakdown comparing Will's original Castle Byers crayon drawings with the exact terrain boundaries of the S4 rift lines...
              </p>
              <a
                href="#theory-full"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Full 24-page analytical theory breakdown previewed!');
                }}
                className="text-xs text-[#e50914] font-bold hover:underline flex items-center gap-1 pt-1"
              >
                <span>Read Complete Breakdown</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </a>
            </div>

            {/* Upcoming Watch Party Card */}
            <div className="rounded-2xl bg-[#201f1f] border border-[#353534] p-4 sm:p-5 shadow-lg flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[#e50914] text-xs font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e50914] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e50914]" />
                </span>
                Upcoming Fan Watch Party
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#e5e2e1]">
                  Hawkins S1–S4 Global Sync
                </h4>
                <p className="text-xs text-[#e9bcb6]/80 mt-0.5">
                  Live synchronized playback with director commentary trivia.
                </p>
              </div>

              {/* Countdown grid */}
              <div className="grid grid-cols-4 gap-2 py-1 text-center">
                <div className="p-2 rounded-xl bg-[#0e0e0e] border border-[#353534]">
                  <span className="text-base font-extrabold text-[#e5e2e1]">{countdown.days}</span>
                  <span className="block text-[9px] uppercase text-[#e9bcb6]/70">Days</span>
                </div>
                <div className="p-2 rounded-xl bg-[#0e0e0e] border border-[#353534]">
                  <span className="text-base font-extrabold text-[#e5e2e1]">{countdown.hours}</span>
                  <span className="block text-[9px] uppercase text-[#e9bcb6]/70">Hours</span>
                </div>
                <div className="p-2 rounded-xl bg-[#0e0e0e] border border-[#353534]">
                  <span className="text-base font-extrabold text-[#e5e2e1]">{countdown.mins}</span>
                  <span className="block text-[9px] uppercase text-[#e9bcb6]/70">Mins</span>
                </div>
                <div className="p-2 rounded-xl bg-[#0e0e0e] border border-[#353534]">
                  <span className="text-base font-extrabold text-[#e50914]">{countdown.secs}</span>
                  <span className="block text-[9px] uppercase text-[#e9bcb6]/70">Secs</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert('RSVP confirmed! You will receive notification before watch party streams.')}
                className="w-full py-2.5 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#353534]"
              >
                <span className="material-symbols-outlined text-base">event_available</span>
                <span>RSVP (3,842 Attending)</span>
              </button>
            </div>

            {/* Online Members List */}
            <div className="rounded-2xl bg-[#201f1f] border border-[#353534] p-4 sm:p-5 shadow-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#e5e2e1]">Online Members</h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#70dc8e]/20 text-[#70dc8e] text-xs font-bold">
                    {onlineCount > 0 ? onlineCount.toLocaleString() : (show.activeOnlineCount ? show.activeOnlineCount.toLocaleString() : '1')}
                  </span>
                </div>
                <span className="material-symbols-outlined text-sm text-[#e9bcb6]/70">filter_list</span>
              </div>

              {/* Admins & Mods */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#e9bcb6]/60">
                  Admins &amp; Mods — 3
                </span>
                <div className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80"
                      alt="Eleven"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-[#353534]"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#70dc8e]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#e50914] truncate">@ElevenEggos</p>
                    <p className="text-[10px] text-[#e9bcb6]/70 truncate">Managing Chapter 5 Leaks</p>
                  </div>
                </div>
              </div>

              {/* Top Theorists */}
              <div className="space-y-2 pt-2 border-t border-[#353534]/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#e9bcb6]/60">
                  Top Theorists — 8
                </span>
                <div className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80"
                      alt="Dustin"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-[#353534]"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#70dc8e]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#e5e2e1] truncate">@DustinHendersonHat</p>
                    <p className="text-[10px] text-[#e9bcb6]/70 truncate">Analyzing Creel grandfather clock</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
