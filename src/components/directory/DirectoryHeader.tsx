import React from 'react';

interface DirectoryHeaderProps {
  totalHubsCount?: number;
  totalChannelsCount?: number;
  activeModeration?: string;
  onlineCinephiles?: string;
  isLiveSync?: boolean;
}

export const DirectoryHeader: React.FC<DirectoryHeaderProps> = ({
  totalHubsCount,
  totalChannelsCount,
  activeModeration = 'Protected',
  onlineCinephiles = 'Community Sync',
  isLiveSync = true,
}) => {
  const displayHubs = totalHubsCount && totalHubsCount > 0 ? totalHubsCount.toLocaleString() : 'Live';

  return (
    <div className="flex flex-col gap-6 pt-4 pb-2">
      {/* Top Meta Breadcrumb & Live Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs font-semibold text-[#e9bcb6]/80">
          <a className="hover:text-[#e5e2e1] transition-colors flex items-center gap-1" href="/">
            <span className="material-symbols-outlined text-sm">home</span>
            POPCHO
          </a>
          <span className="text-[#353534]">/</span>
          <a className="hover:text-[#e5e2e1] transition-colors" href="#directory">
            Directory
          </a>
          <span className="text-[#353534]">/</span>
          <span className="text-[#e5e2e1]">All Shows &amp; Communities</span>
        </nav>

        <div className="flex items-center gap-4 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a2a2a] text-[#e5e2e1] text-xs font-semibold border border-[#353534]/60">
            <span className="w-2 h-2 rounded-full bg-[#70dc8e] animate-pulse" />
            <span>{isLiveSync ? `${onlineCinephiles} • Live TMDB Sync` : 'PopCho Community Engine'}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-[#e9bcb6]/70 text-xs">
            <span className="material-symbols-outlined text-sm text-[#e50914]">sync</span>
            <span>Live Connected</span>
          </div>
        </div>
      </div>

      {/* Hero Header & Catalog Overview */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2 pb-2">
        <div className="flex flex-col gap-2 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded bg-[#e50914]/20 text-[#e50914] text-[11px] font-extrabold uppercase tracking-wider border border-[#e50914]/30">
              Entertainment Hubs
            </span>
            <span className="text-[#e9bcb6]/70 text-xs font-medium">
              • Curated Television &amp; Cinema Canon
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl text-[#e5e2e1] font-extrabold tracking-tight leading-tight">
            Explore All Show Communities &amp; Hubs
          </h1>

          <p className="text-[#e9bcb6]/85 text-base sm:text-lg max-w-2xl leading-relaxed">
            Browse dedicated fan hubs, join live episode discussions, read authentic community reviews, and explore spoiler-protected theories across top franchises.
          </p>
        </div>

        {/* Quick Platform Stats Pills */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <div className="px-4 py-3 rounded-2xl bg-[#201f1f] border border-[#353534] flex flex-col min-w-[120px] shadow-lg">
            <span className="text-xl sm:text-2xl text-[#e5e2e1] font-extrabold">{displayHubs}</span>
            <span className="text-xs text-[#e9bcb6]/70 font-medium">Catalog Hubs</span>
          </div>
          <div className="px-4 py-3 rounded-2xl bg-[#201f1f] border border-[#353534] flex flex-col min-w-[120px] shadow-lg">
            <span className="text-xl sm:text-2xl text-[#e5e2e1] font-extrabold">{totalChannelsCount ? totalChannelsCount.toLocaleString() : 'Synced'}</span>
            <span className="text-xs text-[#e9bcb6]/70 font-medium">Community State</span>
          </div>
          <div className="px-4 py-3 rounded-2xl bg-[#201f1f] border border-[#353534] flex flex-col min-w-[120px] shadow-lg">
            <span className="text-xl sm:text-2xl text-[#e50914] font-extrabold">{activeModeration}</span>
            <span className="text-xs text-[#e9bcb6]/70 font-medium">Spoiler Shield</span>
          </div>
        </div>
      </div>
    </div>
  );
};
