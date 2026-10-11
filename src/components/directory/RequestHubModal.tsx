import React, { useState } from 'react';

interface RequestHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPetition?: (title: string, network: string, reason: string) => void;
}

export const RequestHubModal: React.FC<RequestHubModalProps> = ({
  isOpen,
  onClose,
  onSubmitPetition,
}) => {
  const [title, setTitle] = useState('');
  const [network, setNetwork] = useState('HBO');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmitPetition?.(title, network, reason);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTitle('');
      setReason('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#201f1f] border border-[#353534] shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Ambient top light */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#e50914] to-transparent" />

        <div className="flex items-center justify-between pb-4 border-b border-[#353534]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e50914]/20 flex items-center justify-center text-[#e50914]">
              <span className="material-symbols-outlined text-lg">campaign</span>
            </div>
            <h3 className="text-lg font-bold text-[#e5e2e1]">Petition for a New Show Hub</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#e9bcb6]/70 hover:text-[#e5e2e1] hover:bg-[#2a2a2a] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-5xl text-[#70dc8e] animate-bounce">
              check_circle
            </span>
            <h4 className="text-lg font-bold text-[#e5e2e1]">Petition Registered!</h4>
            <p className="text-xs text-[#e9bcb6]/80 max-w-sm">
              Your hub petition for <strong>"{title}"</strong> has been logged. 1 / 50 fan pledges collected.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
            <div>
              <label className="block text-xs font-semibold text-[#e9bcb6] mb-1.5">
                Show Title or Limited Series
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Shōgun, Fallout, Peaky Blinders..."
                className="w-full h-11 px-3.5 rounded-xl bg-[#0e0e0e] text-[#e5e2e1] text-sm border border-[#353534] focus:border-[#e50914] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#e9bcb6] mb-1.5">
                Original Network / Platform
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#0e0e0e] text-[#e5e2e1] text-sm border border-[#353534] focus:border-[#e50914] focus:outline-none cursor-pointer"
              >
                <option value="HBO">HBO / Max</option>
                <option value="Netflix">Netflix</option>
                <option value="Apple TV+">Apple TV+</option>
                <option value="FX / Hulu">FX / Hulu</option>
                <option value="Amazon Prime">Amazon Prime</option>
                <option value="Disney+">Disney+</option>
                <option value="Anime / Studio">Anime / Mappa / Ufotable</option>
                <option value="Other">Other Independent Network</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#e9bcb6] mb-1.5">
                Why does this show need a dedicated PopCho hub? (Optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Deep lore, crazy fan theories, season finale rewatches..."
                className="w-full p-3 rounded-xl bg-[#0e0e0e] text-[#e5e2e1] text-sm border border-[#353534] focus:border-[#e50914] focus:outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#2a2a2a] text-[#e9bcb6] hover:text-[#e5e2e1] text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b2000d] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">how_to_reg</span>
                <span>Pledge 1st Vote</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
