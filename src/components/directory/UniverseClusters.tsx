import React from 'react';
import { MOCK_CLUSTERS } from '../../services/tmdb/mockData';

interface UniverseClustersProps {
  onSelectCluster?: (clusterTitle: string) => void;
}

export const UniverseClusters: React.FC<UniverseClustersProps> = ({ onSelectCluster }) => {
  return (
    <section className="flex flex-col gap-5 pt-8" id="clusters">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#e50914] animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider text-[#e50914] font-extrabold">
              Curated Hub Clusters
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl text-[#e5e2e1] font-extrabold tracking-tight">
            Franchise &amp; Cinematic Universes
          </h3>
        </div>
        <p className="text-sm text-[#e9bcb6]/80 font-medium">
          Discover interconnected lore trees across multi-show canons
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_CLUSTERS.map((cluster) => (
          <div
            key={cluster.id}
            onClick={() => onSelectCluster?.(cluster.title)}
            className="relative group p-5 rounded-2xl bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#353534] overflow-hidden transition-all duration-300 shadow-md flex flex-col justify-between min-h-[170px] cursor-pointer hover:border-[#e50914]/40 hover:-translate-y-1"
          >
            {/* Ambient Background Radial Glow */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-gradient-to-br from-[#e50914]/15 via-transparent to-transparent blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

            <div className="flex items-start justify-between z-10">
              <div className="w-10 h-10 rounded-xl bg-[#0e0e0e] border border-[#353534] flex items-center justify-center text-[#e50914]">
                <span className="material-symbols-outlined text-2xl">{cluster.icon}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#0e0e0e] text-[#e9bcb6] text-xs font-semibold border border-[#353534]/60">
                {cluster.showsCount}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 z-10 pt-4">
              <h4 className="text-base font-bold text-[#e5e2e1] group-hover:text-[#e50914] transition-colors leading-snug">
                {cluster.title}
              </h4>
              <p className="text-xs text-[#e9bcb6]/75 line-clamp-1">
                {cluster.showsList}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
