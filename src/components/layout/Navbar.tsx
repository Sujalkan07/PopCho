import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { searchMedia } from '../../services/tmdb/search';
import { getImageUrl, DEFAULT_POSTER } from '../../services/tmdb/client';
import type { MediaItem } from '../../services/tmdb/types';
import { UserAvatar } from '../common/UserAvatar';

interface NavbarProps {
  activeTab?: 'home' | 'discover' | 'reviews' | 'communities' | 'watchlist' | 'hubs';
  onTabChange?: (tab: 'home' | 'discover' | 'reviews' | 'communities' | 'watchlist' | 'hubs') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenNotifications?: () => void;
  onOpenFriends?: () => void;
}

export const Navbar = ({
  onTabChange,
  searchQuery = '',
  onSearchChange,
  onOpenNotifications,
  onOpenFriends,
}: NavbarProps) => {
  const { user, profile, signOut, openAuthModal } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = useMemo<'home' | 'discover' | 'reviews' | 'communities' | 'watchlist' | 'hubs'>(() => {
    const p = location.pathname;
    if (p.startsWith('/discover')) return 'discover';
    if (p.startsWith('/communities')) return 'communities';
    if (p.startsWith('/reviews') || p.startsWith('/community-reviews')) return 'reviews';
    if (p.startsWith('/watchlist')) return 'watchlist';
    if (p.startsWith('/hubs')) return 'hubs';
    return 'home';
  }, [location.pathname]);

  // Focus search bar via shortcut or escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        mobileInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener to dismiss omnibox dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live debounced TMDB search
  useEffect(() => {
    const clean = (searchQuery || '').trim();
    if (clean.length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    let isSubscribed = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMedia(clean, 1);
        if (!isSubscribed) return;
        setSearchResults(res.results.slice(0, 6));
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Navbar search error:', err);
        if (isSubscribed) setSearchResults([]);
      } finally {
        if (isSubscribed) setIsSearching(false);
      }
    }, 300);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = (searchQuery || '').trim();
    if (!clean) return;
    setIsDropdownOpen(false);
    setMobileSearchOpen(false);
    navigate(`/discover?q=${encodeURIComponent(clean)}`);
  };

  const handleSelectResult = (item: MediaItem) => {
    setIsDropdownOpen(false);
    setMobileSearchOpen(false);
    navigate(`/discover?q=${encodeURIComponent(item.title)}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e0e]/95 backdrop-blur-md border-b border-[#353534]">
      <div className="h-[68px] w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand & Main Navigation */}
        <div className="flex items-center gap-6 xl:gap-8 flex-shrink-0">
          <Link className="flex items-center gap-2.5 group" to="/">
            <div className="w-8 h-8 rounded-lg bg-[#e50914] flex items-center justify-center font-extrabold text-white text-base shadow-[0_0_14px_rgba(229,9,20,0.6)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">movie_filter</span>
            </div>
            <span className="font-headline-md text-xl uppercase tracking-wider text-[#e5e2e1] font-extrabold flex items-center">
              POP<span className="text-[#e50914] drop-shadow-[0_0_8px_rgba(229,9,20,0.6)]">CHO</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1.5">
            <Link
              to="/"
              onClick={() => onTabChange?.('home')}
              className={`px-4 py-2 font-label-lg text-sm rounded-xl transition-all cursor-pointer ${
                currentTab === 'home'
                  ? 'bg-[#e50914] text-white font-bold shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                  : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
              }`}
            >
              Home
            </Link>
            <Link
              to="/discover"
              onClick={() => onTabChange?.('discover')}
              className={`px-4 py-2 font-label-lg text-sm rounded-xl transition-all cursor-pointer ${
                currentTab === 'discover'
                  ? 'bg-[#e50914] text-white font-bold shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                  : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
              }`}
            >
              Discover
            </Link>
            <Link
              to="/reviews"
              onClick={() => onTabChange?.('reviews')}
              className={`px-4 py-2 font-label-lg text-sm rounded-xl transition-all cursor-pointer ${
                currentTab === 'reviews'
                  ? 'bg-[#e50914] text-white font-bold shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                  : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
              }`}
            >
              Reviews
            </Link>
            <Link
              to="/communities"
              onClick={() => onTabChange?.('communities')}
              className={`px-4 py-2 font-label-lg text-sm rounded-xl transition-all cursor-pointer ${
                currentTab === 'communities'
                  ? 'bg-[#e50914] text-white font-bold shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                  : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
              }`}
            >
              Communities
            </Link>
          </nav>
        </div>

        {/* Global Omnibox Search */}
        <div ref={searchContainerRef} className="flex-1 max-w-xl mx-auto hidden md:block relative">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3.5 text-[#e9bcb6]/80 text-lg pointer-events-none">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setIsDropdownOpen(true);
              }}
              placeholder="Search shows, fan theories, reviewers..."
              className="w-full h-10 pl-11 pr-20 bg-[#201f1f] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-sm rounded-xl border border-[#353534] focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] focus:outline-none transition-all"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {isSearching && (
                <span className="material-symbols-outlined text-[#e50914] text-base animate-spin">
                  progress_activity
                </span>
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="text-[#e9bcb6]/60 hover:text-white p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
              <kbd className="px-1.5 py-0.5 text-xs bg-[#2a2a2a] text-[#e9bcb6] rounded border border-[#353534] select-none font-mono">
                ⌘K
              </kbd>
            </div>
          </form>

          {/* Omnibox Live Search Dropdown */}
          {isDropdownOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1b1b] border border-[#353534] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-[#353534]/60 flex items-center justify-between text-xs text-[#e9bcb6]/70">
                <span className="font-semibold uppercase tracking-wider text-[11px] text-[#e9bcb6]">
                  {isSearching ? 'Searching Catalog...' : `Found ${searchResults.length} Matches`}
                </span>
                <span>Press ↵ to view all</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#353534]/30">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={`search-${item.id}`}
                      type="button"
                      onClick={() => handleSelectResult(item)}
                      className="w-full px-4 py-2.5 flex items-center gap-3.5 hover:bg-[#282727] text-left transition-colors cursor-pointer group"
                    >
                      <img
                        src={getImageUrl(item.posterPath, 'w200')}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded-lg bg-[#0e0e0e] shrink-0 border border-[#353534]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_POSTER;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#e5e2e1] group-hover:text-[#e50914] truncate transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#e9bcb6]/70">
                          <span className="px-1.5 py-0.2 rounded bg-[#0e0e0e] text-[10px] font-semibold border border-[#353534] uppercase">
                            {item.mediaType === 'movie' ? 'Movie' : 'TV Series'}
                          </span>
                          {(item.releaseDate || item.firstAirDate) && (
                            <span>{(item.releaseDate || item.firstAirDate)?.slice(0, 4)}</span>
                          )}
                          {item.voteAverage > 0 && (
                            <span className="flex items-center gap-0.5 text-[#ffc107]">
                              <span className="material-symbols-outlined text-xs">star</span>
                              {item.voteAverage.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[#e9bcb6]/40 group-hover:text-[#e50914] group-hover:translate-x-0.5 transition-all text-lg">
                        arrow_forward
                      </span>
                    </button>
                  ))
                ) : !isSearching ? (
                  <div className="p-6 text-center text-xs text-[#e9bcb6]/70">
                    No results found for "{searchQuery}". Press Enter to search full catalog.
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full py-2.5 px-4 bg-[#201f1f] hover:bg-[#e50914] text-xs font-bold text-[#e5e2e1] hover:text-white border-t border-[#353534] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View all results for "{searchQuery}" in Discovery Engine</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Actions: Search (Mobile), Community, Notifications, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden relative p-2 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] transition-all border border-[#353534]/50 cursor-pointer"
            title="Search"
          >
            <span className="material-symbols-outlined text-xl">
              {mobileSearchOpen ? 'close' : 'search'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenFriends}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] transition-all border border-[#353534]/50 cursor-pointer"
            title="PopCho Community Hubs"
          >
            <span className="material-symbols-outlined text-lg">group</span>
            <span className="text-xs font-semibold hidden xl:inline">Community</span>
            <span className="w-2 h-2 rounded-full bg-[#70dc8e] ring-2 ring-[#0e0e0e]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setNotifCount(0);
              onOpenNotifications?.();
            }}
            className="relative p-2 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] transition-all border border-[#353534]/50 cursor-pointer"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[#e50914] text-white text-[10px] font-bold">
                {notifCount}
              </span>
            )}
          </button>

          {/* User Profile or Sign In Button */}
          {!user ? (
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(229,9,20,0.4)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span className="hidden sm:inline">Sign In</span>
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 pl-2 border-l border-[#353534] focus:outline-none cursor-pointer"
              >
                <div className="relative">
                  <UserAvatar
                    src={profile?.avatarUrl || user.user_metadata?.avatar_url}
                    name={profile?.displayName || user.email}
                    size="sm"
                    ringClassName="ring-1 ring-[#353534]"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#70dc8e] ring-2 ring-[#0e0e0e]" />
                </div>
                <span className="material-symbols-outlined text-[#e9bcb6] text-lg hover:text-[#e5e2e1] transition-colors">
                  {profileOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#201f1f] border border-[#353534] shadow-2xl py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-[#353534]">
                    <p className="text-sm font-bold text-[#e5e2e1] truncate">
                      @{profile?.displayName || user.email?.split('@')[0] || 'PopChoFan'}
                    </p>
                    <p className="text-xs text-[#70dc8e] flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e]" />
                      Online • {profile?.role || 'Community Member'}
                    </p>
                    {user.email && (
                      <p className="text-[11px] text-[#e9bcb6]/60 truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                  </div>
                  <div className="py-1">
                    <Link
                      to="/onboarding/avatar"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a] transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-[#e50914]">badge</span>
                      Choose Fandom Identity
                    </Link>
                    <Link
                      to="/watchlist"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a] transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-[#e50914]">bookmark</span>
                      My Watchlist
                    </Link>
                    <Link
                      to="/hubs"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a] transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-[#e50914]">forum</span>
                      My Hubs
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-[#353534]">
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setProfileOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-[#ffb4ab] hover:bg-[#93000a]/20 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar Expansion */}
      {mobileSearchOpen && (
        <div className="md:hidden w-full px-4 py-2.5 bg-[#1c1b1b] border-t border-[#353534]/70">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3 text-[#e9bcb6]/80 text-base pointer-events-none">
              search
            </span>
            <input
              ref={mobileInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search shows, movies, communities..."
              className="w-full h-9 pl-9 pr-16 bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-xs rounded-xl border border-[#353534] focus:border-[#e50914] focus:outline-none"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {isSearching && (
                <span className="material-symbols-outlined text-[#e50914] text-sm animate-spin">
                  progress_activity
                </span>
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="text-[#e9bcb6]/60 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
              <button
                type="submit"
                className="px-2 py-0.5 bg-[#e50914] text-white text-[11px] font-bold rounded-lg cursor-pointer"
              >
                Go
              </button>
            </div>
          </form>

          {/* Mobile search dropdown matches */}
          {searchResults.length > 0 && searchQuery.trim().length >= 2 && (
            <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-[#353534]/40 bg-[#0e0e0e] rounded-xl border border-[#353534]">
              {searchResults.map((item) => (
                <button
                  key={`mobile-search-${item.id}`}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-[#201f1f] cursor-pointer"
                >
                  <img
                    src={getImageUrl(item.posterPath, 'w200')}
                    alt={item.title}
                    className="w-8 h-11 object-cover rounded bg-[#201f1f] shrink-0 border border-[#353534]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_POSTER;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#e5e2e1] truncate">{item.title}</p>
                    <p className="text-[10px] text-[#e9bcb6]/60">
                      {item.mediaType === 'movie' ? 'Movie' : 'TV Series'}
                      {item.voteAverage > 0 ? ` • ⭐ ${item.voteAverage.toFixed(1)}` : ''}
                    </p>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full py-2 px-3 bg-[#201f1f] hover:bg-[#e50914] text-[11px] font-bold text-[#e5e2e1] text-center cursor-pointer"
              >
                See all results for "{searchQuery}" →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Subnavigation Row */}
      <div className="flex lg:hidden items-center justify-around w-full px-3 py-2 bg-[#131313] border-t border-[#353534]/50">
        <Link
          to="/"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'home'
              ? 'bg-[#e50914] text-white shadow'
              : 'text-[#e9bcb6] hover:text-white'
          }`}
        >
          Home
        </Link>
        <Link
          to="/discover"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'discover'
              ? 'bg-[#e50914] text-white shadow'
              : 'text-[#e9bcb6] hover:text-white'
          }`}
        >
          Discover
        </Link>
        <Link
          to="/reviews"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'reviews'
              ? 'bg-[#e50914] text-white shadow'
              : 'text-[#e9bcb6] hover:text-white'
          }`}
        >
          Reviews
        </Link>
        <Link
          to="/communities"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'communities'
              ? 'bg-[#e50914] text-white shadow'
              : 'text-[#e9bcb6] hover:text-white'
          }`}
        >
          Communities
        </Link>
      </div>
    </header>
  );
};
