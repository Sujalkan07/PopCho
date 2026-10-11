import { useState } from 'react';

interface NavbarProps {
  activeTab?: 'home' | 'discover' | 'reviews' | 'communities';
  onTabChange?: (tab: 'home' | 'discover' | 'reviews' | 'communities') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenNotifications?: () => void;
  onOpenFriends?: () => void;
}

export const Navbar = ({
  activeTab = 'home',
  onTabChange,
  searchQuery = '',
  onSearchChange,
  onOpenNotifications,
  onOpenFriends,
}: NavbarProps) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [friendsCount] = useState(8);
  const [notifCount, setNotifCount] = useState(3);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e0e]/95 backdrop-blur-md border-b border-[#353534]">
      <div className="h-[68px] w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand & Main Navigation */}
        <div className="flex items-center gap-6 xl:gap-8 flex-shrink-0">
          <a className="flex items-center gap-2.5 group" href="/">
            <div className="w-8 h-8 rounded-lg bg-[#e50914] flex items-center justify-center font-extrabold text-white text-base shadow-[0_0_14px_rgba(229,9,20,0.6)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">movie_filter</span>
            </div>
            <span className="font-headline-md text-xl uppercase tracking-wider text-[#e5e2e1] font-extrabold flex items-center">
              POP<span className="text-[#e50914] drop-shadow-[0_0_8px_rgba(229,9,20,0.6)]">CHO</span>
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTabChange?.('home')}
              className={`px-4 py-2 font-label-lg text-sm rounded-xl transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-[#e50914] text-white font-bold shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                  : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onTabChange?.('discover')}
              className={`px-4 py-2 font-label-lg text-sm rounded-xl transition-all cursor-pointer ${
                activeTab === 'discover'
                  ? 'bg-[#e50914] text-white font-bold shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                  : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
              }`}
            >
              Discover
            </button>
            <button
              type="button"
              onClick={() => onTabChange?.('reviews')}
              className={`px-4 py-2 font-label-lg text-sm rounded-xl transition-all cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-[#e50914] text-white font-bold shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                  : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
              }`}
            >
              Reviews
            </button>
            <button
              type="button"
              onClick={() => onTabChange?.('communities')}
              className={`px-4 py-2 font-label-lg text-sm rounded-xl transition-all cursor-pointer ${
                activeTab === 'communities'
                  ? 'bg-[#e50914] text-white font-bold shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                  : 'text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
              }`}
            >
              Communities
            </button>
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
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] transition-all border border-[#353534]/50"
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
            className="relative p-2 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] transition-all border border-[#353534]/50"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[#e50914] text-white text-[10px] font-bold">
                {notifCount}
              </span>
            )}
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 pl-2 border-l border-[#353534] focus:outline-none"
            >
              <div className="relative">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmNfypXexpUqGV6ruN3XC8n2OqYyfzM-rHCYQH9eIHwRrMERZmMPSMVhkWDh7lAeFDaMoIKQEcn8pdfMMGDKqiI4PsbTQxIEly40c9OC_7jeis6uUX0Xmau1lUS3kAo7bw8bA67k1U1vhNTC8RwMbUTFVgQAOvm-N4cKCenSDe7FIT_9PVezInr_GDwS61-H7-0B_F9PO1zaeOr3XWdla-rkuVL8j2MXny0EU59iaaB5L157FxLwbvqw"
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
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#201f1f] border border-[#353534] shadow-2xl py-2 z-50">
                <div className="px-4 py-2.5 border-b border-[#353534]">
                  <p className="text-sm font-bold text-[#e5e2e1]">@DustinTheorist</p>
                  <p className="text-xs text-[#70dc8e] flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e]" />
                    Online • Theorist Lvl 8
                  </p>
                </div>
                <div className="py-1">
                  <a href="#profile" className="flex items-center gap-2 px-4 py-2 text-xs text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]">
                    <span className="material-symbols-outlined text-base">person</span>
                    View Fan Profile
                  </a>
                  <a href="#watchlist" className="flex items-center gap-2 px-4 py-2 text-xs text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]">
                    <span className="material-symbols-outlined text-base">bookmark</span>
                    My Watchlist &amp; Hubs
                  </a>
                  <a href="#settings" className="flex items-center gap-2 px-4 py-2 text-xs text-[#e9bcb6] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]">
                    <span className="material-symbols-outlined text-base">settings</span>
                    Account &amp; Spoiler Settings
                  </a>
                </div>
                <div className="pt-1 border-t border-[#353534]">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-[#ffb4ab] hover:bg-[#93000a]/20"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
