import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#0e0e0e] border-t border-[#353534] py-8 mt-16">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[#e9bcb6]/70 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#e50914] flex items-center justify-center font-bold text-white text-xs">
            P
          </div>
          <span className="font-semibold text-[#e5e2e1]">
            © 2026 PopCho. Driven by fandom, powered by cinema.
          </span>
        </div>

        <div className="flex items-center gap-6 flex-wrap justify-center">
          <a href="#terms" className="hover:text-[#e5e2e1] transition-colors">
            Terms
          </a>
          <a href="#privacy" className="hover:text-[#e5e2e1] transition-colors">
            Privacy Policy
          </a>
          <a href="#spoilers" className="hover:text-[#e5e2e1] transition-colors flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e50914]" />
            Spoiler Rules
          </a>
          <a href="#sync" className="hover:text-[#e5e2e1] transition-colors flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#70dc8e]" />
            Watch Party Sync
          </a>
        </div>
      </div>
    </footer>
  );
};
