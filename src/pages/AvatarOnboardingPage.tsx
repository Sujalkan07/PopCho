import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { INITIAL_CANON_AVATARS } from '../services/avatar/avatarCatalog';
import type { AvatarItem } from '../services/avatar/types';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

export const AvatarOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, updateAvatar, isLoading } = useAuth();

  const [catalog, setCatalog] = useState<AvatarItem[]>(INITIAL_CANON_AVATARS);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarItem>(() => {
    // If user already has an avatar that matches catalog, pick it, else default to first item (Eleven)
    if (profile?.avatarUrl) {
      const match = INITIAL_CANON_AVATARS.find((i) => i.imageUrl === profile.avatarUrl);
      if (match) return match;
    }
    return INITIAL_CANON_AVATARS[0];
  });

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'tv' | 'movies' | 'anime'>('all');
  const [selectedArchetype, setSelectedArchetype] = useState<'all' | 'protagonist' | 'anti-hero' | 'legend'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // If user is not authenticated, redirect to home
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [isLoading, user, navigate]);

  // Load server-side catalog updates if available
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/avatars/catalog`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.items && Array.isArray(data.items) && data.items.length > 0) {
          setCatalog(data.items);
        }
      })
      .catch(() => {
        // Fallback to INITIAL_CANON_AVATARS is already set
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute category counts
  const counts = useMemo(() => {
    return {
      all: catalog.length,
      tv: catalog.filter((i) => i.category === 'tv').length,
      movies: catalog.filter((i) => i.category === 'movies').length,
      anime: catalog.filter((i) => i.category === 'anime').length,
    };
  }, [catalog]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return catalog.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedArchetype !== 'all' && item.archetype !== selectedArchetype) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.origin.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q) ||
          item.quote.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [catalog, selectedCategory, selectedArchetype, searchQuery]);

  // Roll random character
  const handleRollRandom = () => {
    const pool = filteredRoster.length > 0 ? filteredRoster : catalog;
    if (pool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    setSelectedAvatar(pool[randomIndex]);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedArchetype('all');
    setSearchQuery('');
  };

  // Save selected avatar
  const handleSaveAvatar = async (avatarToSave: AvatarItem = selectedAvatar) => {
    if (!avatarToSave) return;
    setIsSaving(true);
    setSaveError(null);

    const result = await updateAvatar({
      avatarUrl: avatarToSave.imageUrl,
      avatarSource: avatarToSave.category,
      avatarMediaId: avatarToSave.id,
      avatarCharacter: avatarToSave.name,
      avatarTitle: avatarToSave.title,
    });

    setIsSaving(false);

    if (result.error) {
      setSaveError(result.error.message);
      return;
    }

    // Direct entry to application
    const destination = (location.state as { from?: string })?.from || '/';
    navigate(destination, { replace: true });
  };

  // Skip for now: assign default canon avatar (Eleven) so user profile is fully valid and not blocked
  const handleSkipForNow = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSaveAvatar(selectedAvatar || catalog[0]);
  };

  // Display name for chat preview
  const userDisplayName =
    profile?.displayName ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Alex Morgan';

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col font-sans antialiased selection:bg-[#e50914] selection:text-white">
      {/* Onboarding Context Progress Bar & Header */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-[#0e0e0e]/95 backdrop-blur-md border-b border-[#353534]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Logo & Onboarding Phase */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e50914] shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
              <span className="font-extrabold text-lg uppercase tracking-wider text-[#e5e2e1]">
                POP<span className="text-[#e50914]">CHO</span>
              </span>
            </Link>
            <span className="px-3 py-0.5 rounded-full bg-[#2a2a2a] text-[#e9bcb6] text-xs font-semibold tracking-wide border border-[#353534]/50">
              Profile Setup
            </span>
          </div>

          {/* Center: Step Progress Metric */}
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-[#e9bcb6]">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#e50914] text-white text-[11px] font-bold">
              1
            </span>
            <span className="text-[#e5e2e1] font-semibold">Fandom Identity</span>
            <span className="text-[#353534]">•</span>
            <span className="text-[#e9bcb6]/60">Enter PopCho</span>
          </div>

          {/* Right: Skip Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkipForNow}
              disabled={isSaving}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-[#e9bcb6] hover:text-[#e5e2e1] transition-colors py-1.5 px-3 rounded-lg hover:bg-[#201f1f] cursor-pointer"
            >
              <span>{isSaving ? 'Saving...' : 'Skip for now'}</span>
              <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport Studio Canvas */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 flex-1">
        {/* Editorial Introductory Block */}
        <header className="flex flex-col gap-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#ffb4aa] font-bold">
              Onboarding step 01
            </span>
            <span className="w-8 h-[1px] bg-[#e50914]/40" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#e5e2e1]">
            Choose your PopCho identity
          </h1>
          <p className="text-base text-[#e9bcb6]/90 max-w-2xl leading-relaxed">
            Pick an icon that speaks for you across discussion boards, watch parties, and theory rooms.
            Sourced directly from premier cinema, episodic lore, and anime canon.
          </p>
        </header>

        {/* Error notification if save failed */}
        {saveError && (
          <div className="p-4 rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/40 text-[#ffb4ab] text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{saveError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="text-[#ffb4ab] hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Two-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          {/* Left / Center Column: Discovery & Roster (~67% desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
            {/* Filter Engine & Category Switches */}
            <div className="flex flex-col gap-4 p-4 bg-[#1c1b1b] rounded-2xl border border-[#353534]/60 shadow-lg">
              {/* Category Tabs Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#353534]/60">
                <div className="flex items-center gap-1.5 flex-wrap" role="tablist">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-[#353534] text-[#e5e2e1] shadow-inner ring-1 ring-[#ffb4aa]/30'
                        : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                    }`}
                  >
                    <span>All Fandoms</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#201f1f] text-[10px] text-[#e9bcb6]">
                      {counts.all}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('tv')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === 'tv'
                        ? 'bg-[#353534] text-[#e5e2e1] shadow-inner ring-1 ring-[#ffb4aa]/30'
                        : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                    }`}
                  >
                    <span>TV Shows</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#201f1f] text-[10px] text-[#e9bcb6]">
                      {counts.tv}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('movies')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === 'movies'
                        ? 'bg-[#353534] text-[#e5e2e1] shadow-inner ring-1 ring-[#ffb4aa]/30'
                        : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                    }`}
                  >
                    <span>Movies</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#201f1f] text-[10px] text-[#e9bcb6]">
                      {counts.movies}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('anime')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedCategory === 'anime'
                        ? 'bg-[#353534] text-[#e5e2e1] shadow-inner ring-1 ring-[#ffb4aa]/30'
                        : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                    }`}
                  >
                    <span>Anime</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#201f1f] text-[10px] text-[#e9bcb6]">
                      {counts.anime}
                    </span>
                  </button>
                </div>

                {/* Total counter indicator */}
                <div className="hidden sm:flex items-center gap-1.5 text-[#e9bcb6] text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#70dc8e] ring-2 ring-[#70dc8e]/20" />
                  <span>Canon-verified portraits</span>
                </div>
              </div>

              {/* Live Search & Archetype Chips */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#e9bcb6] text-base pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search characters, shows, or universes..."
                    className="w-full h-10 pl-9 pr-3 bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs rounded-xl border border-[#353534] focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#e9bcb6] hover:text-[#e5e2e1] text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Archetype Quick Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelectedArchetype('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedArchetype === 'all'
                        ? 'bg-[#e50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.5)]'
                        : 'bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#353534]'
                    }`}
                  >
                    Popular
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedArchetype('protagonist')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedArchetype === 'protagonist'
                        ? 'bg-[#e50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.5)]'
                        : 'bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#353534]'
                    }`}
                  >
                    Protagonists
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedArchetype('anti-hero')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedArchetype === 'anti-hero'
                        ? 'bg-[#e50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.5)]'
                        : 'bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#353534]'
                    }`}
                  >
                    Anti-Heroes
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedArchetype('legend')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedArchetype === 'legend'
                        ? 'bg-[#e50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.5)]'
                        : 'bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#353534]'
                    }`}
                  >
                    Legends
                  </button>
                </div>
              </div>
            </div>

            {/* 6-Column Responsive Character Roster */}
            {filteredRoster.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 min-w-0">
                {filteredRoster.map((char) => {
                  const isSelected = selectedAvatar?.id === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedAvatar(char)}
                      className={`character-card group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer bg-[#1c1b1b] transition-all duration-300 ${
                        isSelected
                          ? 'ring-2 ring-[#e50914] shadow-[0_0_24px_rgba(229,9,20,0.45)] scale-[1.02]'
                          : 'hover:ring-1 hover:ring-[#353534] hover:scale-[1.01]'
                      }`}
                    >
                      <img
                        src={char.imageUrl}
                        alt={char.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent pointer-events-none" />

                      {/* Selection Checkmark Pin */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg animate-in zoom-in-75">
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
                        </div>
                      )}

                      {/* Identity Label */}
                      <div className="absolute bottom-0 inset-x-0 p-2 flex flex-col pointer-events-none">
                        <span className="text-[13px] font-bold leading-tight text-[#e5e2e1] truncate drop-shadow-md">
                          {char.name}
                        </span>
                        <span className="text-[10px] text-[#e9bcb6] truncate font-medium drop-shadow-sm">
                          {char.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty Search State */
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#1c1b1b] rounded-2xl border border-[#353534]/50">
                <span className="material-symbols-outlined text-4xl text-[#e9bcb6] mb-2">
                  person_search
                </span>
                <p className="text-base text-[#e5e2e1] font-bold">No canon matches found</p>
                <p className="text-xs text-[#e9bcb6] mt-1 max-w-sm">
                  Try searching for other characters, franchises like "Stranger Things", "Dune", or clear filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#2a2a2a] hover:bg-[#353534] text-[#e5e2e1] text-xs font-bold transition-all cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Custom Request or Roll Random Hint Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#1c1b1b] border border-[#353534]/40 text-[#e9bcb6] text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-[#e50914]">auto_awesome</span>
                <span>
                  Can't find your character? You can request a fandom addition or update your avatar later in Settings.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRollRandom}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#e5e2e1] hover:text-[#e50914] transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-base">casino</span>
                <span>Roll Random</span>
              </button>
            </div>
          </div>

          {/* Right Column: Sticky Identity Preview & Confirmation (~33% desktop) */}
          <aside className="lg:col-span-4 sticky top-20 flex flex-col gap-4">
            {/* Live Preview Stage Card */}
            <div className="flex flex-col bg-[#201f1f] rounded-2xl border border-[#353534] shadow-2xl overflow-hidden">
              {/* Card Header Strip */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-[#353534]/40">
                <span className="text-[11px] font-bold text-[#e9bcb6] tracking-wider uppercase">
                  Live Community Preview
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#70dc8e]">
                  <span className="w-2 h-2 rounded-full bg-[#70dc8e] animate-pulse" />
                  Live Sync
                </span>
              </div>

              {/* Avatar Visual Stage */}
              <div className="p-6 flex flex-col items-center text-center">
                {/* Large 128x128 Circular Avatar Hero Ring */}
                <div className="relative w-32 h-32 mb-4">
                  <div className="w-full h-full rounded-full overflow-hidden ring-4 ring-[#e50914] p-1 bg-[#353534] shadow-[0_0_28px_rgba(229,9,20,0.35)]">
                    <img
                      src={selectedAvatar.imageUrl}
                      alt={selectedAvatar.name}
                      className="w-full h-full rounded-full object-cover transition-all duration-300"
                    />
                  </div>
                  {/* Online / Synchronized Dot */}
                  <span className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-[#70dc8e] ring-4 ring-[#201f1f]" />
                </div>

                {/* Dynamic Selected Character Metadata */}
                <h2 className="text-xl font-extrabold text-[#e5e2e1] tracking-tight">
                  {selectedAvatar.name}
                </h2>
                <p className="text-xs font-semibold text-[#ffb4aa] mt-0.5">
                  {selectedAvatar.origin}
                </p>
                <span className="mt-2 px-3 py-0.5 rounded-full bg-[#353534] text-[#e9bcb6] text-[11px] font-medium border border-[#353534]">
                  {selectedAvatar.tag}
                </span>

                {/* Quote Preview Snippet */}
                <p className="text-xs italic text-[#e9bcb6]/80 mt-4 px-2 leading-relaxed">
                  "{selectedAvatar.quote}"
                </p>
              </div>

              {/* Fandom Profile Badge Mockup (PopCho Chat Simulation) */}
              <div className="px-4 pb-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[#e9bcb6]/70 uppercase tracking-wider">
                  How you appear in watch parties
                </span>
                <div className="p-3.5 rounded-xl bg-[#0e0e0e] flex items-start gap-3 border border-[#353534]/60 shadow-inner">
                  {/* Small Avatar Thumbnail */}
                  <div className="relative shrink-0">
                    <img
                      src={selectedAvatar.imageUrl}
                      alt={selectedAvatar.name}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[#e50914]"
                    />
                  </div>

                  {/* Chat Content Bubble Mock */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#e5e2e1]">
                        {userDisplayName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#e50914]/20 text-[#ffb4aa] text-[10px] uppercase font-bold border border-[#e50914]/30">
                        {selectedAvatar.badge}
                      </span>
                      <span className="text-[10px] text-[#e9bcb6]/50">Just now</span>
                    </div>
                    <p className="text-xs text-[#e9bcb6] mt-1 leading-snug">
                      "Can't wait for the next season! That season finale cliffhanger was incredible."
                    </p>
                  </div>
                </div>
              </div>

              {/* Action & Confirmation Block */}
              <div className="p-4 bg-[#2a2a2a]/60 border-t border-[#353534] flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSaveAvatar(selectedAvatar)}
                  disabled={isSaving}
                  className="w-full py-3 px-4 rounded-xl bg-[#e50914] hover:bg-[#b80710] disabled:bg-[#80050c] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(229,9,20,0.35)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>{isSaving ? 'Saving Your Avatar...' : 'Save Avatar & Continue'}</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>

                {/* Re-roll Utility */}
                <button
                  type="button"
                  onClick={handleRollRandom}
                  className="w-full py-2 px-3 rounded-xl bg-[#201f1f] hover:bg-[#353534] text-[#e5e2e1] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#353534]/60 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">shuffle</span>
                  <span>Pick Random Fandom Character</span>
                </button>

                <p className="text-center text-[10px] text-[#e9bcb6]/60 mt-1">
                  You can update your avatar, badges, and fandom titles at any time in Profile Settings.
                </p>
              </div>
            </div>

            {/* Community Trust Note */}
            <div className="p-3.5 rounded-xl bg-[#1c1b1b] border border-[#353534]/50 flex items-center gap-2.5 text-[#e9bcb6] text-xs">
              <span className="material-symbols-outlined text-[#70dc8e] text-lg shrink-0">
                verified
              </span>
              <p className="leading-snug">
                Avatars are synchronized in real-time across spoiler-safe live chat and spoiler discussion threads.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default AvatarOnboardingPage;
