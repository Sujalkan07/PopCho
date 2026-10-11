import React from 'react';

export interface FilterGenre {
  id: string;
  label: string;
  count: number;
}

export const GENRE_FILTERS: FilterGenre[] = [
  { id: 'all', label: 'All Shows', count: 1248 },
  { id: 'Sci-Fi & Fantasy', label: 'Sci-Fi & Fantasy', count: 240 },
  { id: 'Psychological Thriller', label: 'Psychological Thriller', count: 185 },
  { id: 'Dark Mystery', label: 'Dark Mystery', count: 142 },
  { id: 'Crime & Drama', label: 'Crime & Drama', count: 210 },
  { id: 'Animation & Anime', label: 'Animation & Anime', count: 198 },
  { id: 'Dystopian', label: 'Dystopian', count: 84 },
  { id: 'Comedy & Satire', label: 'Comedy & Satire', count: 189 },
];

interface DirectoryControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
  showingCount: number;
  totalCount: number;
  onOpenAdvancedFilters?: () => void;
}

export const DirectoryControls: React.FC<DirectoryControlsProps> = ({
  searchQuery,
  onSearchChange,
  selectedGenre,
  onSelectGenre,
  sortBy,
  onSortChange,
  viewMode,
  onToggleViewMode,
  showingCount,
  totalCount,
  onOpenAdvancedFilters,
}) => {
  return (
    <div className="flex flex-col gap-4 bg-[#1c1b1b] p-4 sm:p-5 rounded-2xl border border-[#353534] shadow-xl">
      {/* Search Row */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#e9bcb6]/70 pointer-events-none text-xl">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by show title, network, creator, or sub-fandom (e.g. Severance, Lumon, HBO, Duffer Brothers)..."
            className="w-full h-12 pl-12 pr-28 rounded-xl bg-[#0e0e0e] text-[#e5e2e1] placeholder:text-[#e9bcb6]/50 text-sm sm:text-base border border-[#353534]/60 focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-[#2a2a2a] text-[#e9bcb6] text-xs font-mono font-medium border border-[#353534]">
              ⌘K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-start">
          {/* Advanced Filters Button */}
          <button
            type="button"
            onClick={onOpenAdvancedFilters}
            className="flex items-center gap-2 h-12 px-4 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e5e2e1] text-sm font-semibold border border-[#353534] transition-all"
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            <span>Advanced Filters</span>
            <span className="w-5 h-5 rounded-full bg-[#e50914] text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
          </button>

          {/* Grid/List Layout Switcher */}
          <div className="flex items-center bg-[#0e0e0e] p-1 rounded-xl border border-[#353534]/80">
            <button
              type="button"
              aria-label="Grid layout"
              onClick={() => onToggleViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#2a2a2a] text-[#e5e2e1] shadow-sm'
                  : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
              }`}
            >
              <span className="material-symbols-outlined text-xl">grid_view</span>
            </button>
            <button
              type="button"
              aria-label="Compact list layout"
              onClick={() => onToggleViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#2a2a2a] text-[#e5e2e1] shadow-sm'
                  : 'text-[#e9bcb6]/70 hover:text-[#e5e2e1]'
              }`}
            >
              <span className="material-symbols-outlined text-xl">view_agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips / Genre Pills Scrollable Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {GENRE_FILTERS.map((genre) => {
          const isActive =
            genre.id === 'all'
              ? selectedGenre === 'all' || !selectedGenre
              : selectedGenre === genre.id;

          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => onSelectGenre(genre.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#e50914] text-white border-[#e50914] shadow-[0_0_10px_rgba(229,9,20,0.35)]'
                  : 'bg-[#201f1f] hover:bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] border-[#353534]'
              }`}
            >
              {genre.label} ({genre.count})
            </button>
          );
        })}
      </div>

      {/* Sorting & Results Count Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#353534]/50">
        <div className="flex items-center gap-2 text-[#e9bcb6]/80 text-xs sm:text-sm font-medium">
          <span>
            Showing <strong className="text-[#e5e2e1] font-bold">{showingCount}</strong> of{' '}
            <strong className="text-[#e5e2e1] font-bold">{totalCount.toLocaleString()}</strong> show hubs
          </span>
          <span className="text-[#353534]">•</span>
          <span className="text-[#70dc8e] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e] animate-pulse" />
            Live watchrooms active in 81 hubs
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label htmlFor="catalogSortSelect" className="text-xs uppercase font-bold text-[#e9bcb6]/70 tracking-wider">
            Sort By
          </label>
          <div className="relative">
            <select
              id="catalogSortSelect"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none bg-[#0e0e0e] text-[#e5e2e1] text-xs font-semibold py-1.5 pl-3 pr-8 rounded-xl border border-[#353534] focus:outline-none focus:border-[#e50914] cursor-pointer"
            >
              <option value="active">Most Active Communities</option>
              <option value="rating">Highest Rated (All-Time)</option>
              <option value="recent">Recently Added Hubs</option>
              <option value="trending">Trending This Week</option>
              <option value="spoilers">Most Spoilers Discussed</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[#e9bcb6]/70 pointer-events-none text-base">
              expand_more
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
