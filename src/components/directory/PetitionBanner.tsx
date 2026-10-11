import React from 'react';

interface PetitionBannerProps {
  onRequestHubClick?: () => void;
  onViewRequestsClick?: () => void;
  requestsCount?: number;
}

export const PetitionBanner: React.FC<PetitionBannerProps> = ({
  onRequestHubClick,
  onViewRequestsClick,
  requestsCount = 34,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#2a2a2a] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-[#353534] mt-4">
      <div className="flex items-center gap-4 sm:gap-5 z-10 w-full md:w-auto">
        <div className="w-12 h-12 rounded-2xl bg-[#0e0e0e] border border-[#353534] flex items-center justify-center shrink-0 text-[#e50914] shadow-md">
          <span className="material-symbols-outlined text-2xl sm:text-3xl">add_circle</span>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-lg sm:text-xl font-bold text-[#e5e2e1]">
            Can't find your show or limited series?
          </h4>
          <p className="text-xs sm:text-sm text-[#e9bcb6]/85 max-w-xl leading-relaxed">
            Submit a community hub petition. Hubs unlock automatically once 50 fans pledge interest.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 z-10 shrink-0 w-full md:w-auto flex-col sm:flex-row">
        <button
          type="button"
          onClick={onViewRequestsClick}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#201f1f] hover:bg-[#353534] text-[#e5e2e1] text-xs sm:text-sm font-semibold transition-all border border-[#353534]"
        >
          View Community Requests ({requestsCount})
        </button>
        <button
          type="button"
          onClick={onRequestHubClick}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs sm:text-sm font-bold transition-all shadow-[0_0_15px_rgba(229,9,20,0.4)] active:scale-95 flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-lg">campaign</span>
          <span>Request New Show Hub</span>
        </button>
      </div>

      {/* Ambient Background Flare */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#e50914]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
