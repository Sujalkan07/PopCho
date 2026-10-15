import { useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
  const [friendsCount] = useState(8);
  const [notifCount, setNotifCount] = useState(3);
  const location = useLocation();

  const currentTab = useMemo<'home' | 'discover' | 'reviews' | 'communities' | 'watchlist' | 'hubs'>(() => {
    const p = location.pathname;
    if (p.startsWith('/discover')) return 'discover';
    if (p.startsWith('/communities')) return 'communities';
    if (p.startsWith('/reviews') || p.startsWith('/community-reviews')) return 'reviews';
    if (p.startsWith('/watchlist')) return 'watchlist';
    if (p.startsWith('/hubs')) return 'hubs';
    return 'home';
  }, [location.pathname]);

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
        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3.5 text-[#e9bcb6]/80 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search shows, fan theories, reviewers..."
              className="w-full h-10 pl-11 pr-12 bg-[#201f1f] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-sm rounded-xl border border-[#353534] focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] focus:outline-none transition-all"
            />
            <kbd className="absolute right-3 px-1.5 py-0.5 text-xs bg-[#2a2a2a] text-[#e9bcb6] rounded border border-[#353534] select-none font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Actions: Friends, Notifications, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenFriends}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] transition-all border border-[#353534]/50 cursor-pointer"
            title="Friends online"
          >
            <span className="material-symbols-outlined text-lg">group</span>
            <span className="text-xs font-semibold hidden xl:inline">Friends</span>
            <span className="w-2 h-2 rounded-full bg-[#70dc8e] ring-2 ring-[#0e0e0e] animate-pulse" />
            <span className="text-xs font-bold text-[#70dc8e] hidden sm:inline">{friendsCount}</span>
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
                  <img
                    src={
                      profile?.avatarUrl ||
                      user.user_metadata?.avatar_url ||
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw'
                    }
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-[#353534]"
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
