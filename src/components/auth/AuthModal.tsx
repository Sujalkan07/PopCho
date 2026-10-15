import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    openAuthModal,
    signIn,
    signUp,
    signInWithGoogle,
    isSupabaseConfigured,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (authModalMode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMsg(error.message);
        }
      } else {
        const { error, needsEmailConfirmation } = await signUp(
          email.trim(),
          password,
          displayName.trim() || undefined
        );
        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            setErrorMsg(
              'Supabase email rate limit exceeded (free shared SMTP allows only 3-4 emails/hour). Fix: in Supabase Dashboard > Authentication > Providers > Email, toggle "Confirm email" OFF, or use the Sign In tab if you already registered.'
            );
          } else {
            setErrorMsg(error.message);
          }
        } else if (needsEmailConfirmation) {
          setSuccessMsg(
            'Account created! Please check your email inbox to confirm your account, then sign in.'
          );
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={closeAuthModal}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-[#181818] border border-[#353534] rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-[#e9bcb6] hover:text-white p-1 rounded-lg hover:bg-[#282828] transition-colors"
          aria-label="Close dialog"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#e50914] flex items-center justify-center font-extrabold text-white text-base shadow-[0_0_14px_rgba(229,9,20,0.6)]">
            <span className="material-symbols-outlined text-lg">movie_filter</span>
          </div>
          <span className="font-headline-md text-xl uppercase tracking-wider text-[#e5e2e1] font-extrabold flex items-center">
            POP<span className="text-[#e50914] drop-shadow-[0_0_8px_rgba(229,9,20,0.6)]">CHO</span>
          </span>
        </div>

        {/* Supabase Not Configured Notice */}
        {!isSupabaseConfigured && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#2a1b1b] border border-[#e50914]/40 text-xs text-[#ffb4ab]">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-[#e50914] flex-shrink-0 mt-0.5">
                warning
              </span>
              <div>
                <p className="font-bold text-white mb-1">Supabase Keys Required</p>
                <p className="text-[#e9bcb6]/80 leading-relaxed">
                  To enable live authentication, please set <code className="bg-[#1f1616] px-1 py-0.5 rounded text-[#ffb4ab]">VITE_SUPABASE_URL</code> and <code className="bg-[#1f1616] px-1 py-0.5 rounded text-[#ffb4ab]">VITE_SUPABASE_ANON_KEY</code> in your root <code className="text-white">.env</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 p-1 bg-[#121212] rounded-xl border border-[#2a2a2a] mb-6">
          <button
            type="button"
            onClick={() => {
              openAuthModal('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              authModalMode === 'signin'
                ? 'bg-[#e50914] text-white shadow-md'
                : 'text-[#e9bcb6] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              openAuthModal('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              authModalMode === 'signup'
                ? 'bg-[#e50914] text-white shadow-md'
                : 'text-[#e9bcb6] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-xs text-[#ffb4ab] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#70dc8e]/10 border border-[#70dc8e]/30 text-xs text-[#70dc8e] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#e9bcb6] mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#e9bcb6]/60 text-lg">
                  person
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Dustin Theorist"
                  className="w-full h-10 pl-10 pr-3 bg-[#201f1f] text-[#e5e2e1] placeholder:text-[#e9bcb6]/40 text-xs rounded-xl border border-[#353534] focus:border-[#e50914] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#e9bcb6] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#e9bcb6]/60 text-lg">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full h-10 pl-10 pr-3 bg-[#201f1f] text-[#e5e2e1] placeholder:text-[#e9bcb6]/40 text-xs rounded-xl border border-[#353534] focus:border-[#e50914] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#e9bcb6] mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#e9bcb6]/60 text-lg">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-10 pr-10 bg-[#201f1f] text-[#e5e2e1] placeholder:text-[#e9bcb6]/40 text-xs rounded-xl border border-[#353534] focus:border-[#e50914] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#e9bcb6]/60 hover:text-white"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isSupabaseConfigured}
            className="w-full h-10 mt-2 bg-[#e50914] hover:bg-[#b80710] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(229,9,20,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{authModalMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 border-t border-[#2a2a2a]" />
          <span className="px-3 text-[11px] text-[#e9bcb6]/50 uppercase tracking-wider font-semibold">
            Or continue with
          </span>
          <div className="flex-1 border-t border-[#2a2a2a]" />
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading || !isSupabaseConfigured}
          className="w-full h-10 bg-[#201f1f] hover:bg-[#282828] disabled:opacity-50 border border-[#353534] text-xs font-semibold text-[#e5e2e1] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
};
