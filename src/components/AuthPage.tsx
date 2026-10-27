import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, Mail, Phone, ShieldCheck, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth';

interface AuthPageProps {
  onAuthenticated: () => void;
  onBack: () => void;
}

export function AuthPage({ onAuthenticated, onBack }: AuthPageProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        throw new Error('Enter a valid mobile number with 10 to 15 digits.');
      }

      if (mode === 'register') {
        if (name.trim().length < 2) throw new Error('Enter your full name.');
        if (password.length < 6) throw new Error('Use a password with at least 6 characters.');
        await register(name.trim(), cleanPhone, password, email.trim() || undefined);
        setSuccess('Your account is ready.');
      } else {
        await login(cleanPhone, password);
        setSuccess('You are signed in.');
      }

      onAuthenticated();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'We could not complete your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 bg-[#F5EDE1]/45">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#39251F]/70 hover:text-[#B85A45] cursor-pointer mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to menu
        </button>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] overflow-hidden rounded-3xl border border-[#39251F]/15 bg-white shadow-xl">
          <section className="relative overflow-hidden bg-[#39251F] p-7 sm:p-10 text-[#FFF8EF] flex flex-col justify-between min-h-[300px]">
            <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-[#F5C76A]/10" />
            <div className="absolute -left-24 -bottom-28 w-72 h-72 rounded-full bg-[#B85A45]/20" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-[#F5C76A] text-[#271915] flex items-center justify-center text-2xl font-black shadow-md">W</div>
              <p className="mt-8 text-xs uppercase tracking-[0.22em] font-bold text-[#F5C76A]">Waffle Pops &amp; Company</p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Your sweet spot, all in one place.</h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#FFF8EF]/75">
                Sign in to follow orders, save your delivery details, and make your next waffle run a little easier.
              </p>
            </div>
            <div className="relative mt-8 flex items-center gap-3 text-xs text-[#FFF8EF]/75">
              <ShieldCheck className="w-5 h-5 text-[#F5C76A]" />
              Your account details are stored securely.
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="max-w-md mx-auto">
              <p className="text-xs uppercase tracking-[0.18em] text-[#B85A45] font-black">Customer account</p>
              <h2 className="mt-2 text-2xl font-black text-[#39251F]">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-1 text-sm text-[#39251F]/60">
                {mode === 'login' ? 'Sign in to see your orders and account.' : 'A few details and you’re ready to go.'}
              </p>

              <div role="tablist" aria-label="Account access" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F5EDE1] mt-6 mb-5">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => selectMode('login')}
                  className={`py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${mode === 'login' ? 'bg-white text-[#39251F] shadow-xs' : 'text-[#39251F]/60 hover:text-[#39251F]'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => selectMode('register')}
                  className={`py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${mode === 'register' ? 'bg-white text-[#39251F] shadow-xs' : 'text-[#39251F]/60 hover:text-[#39251F]'}`}
                >
                  Sign up
                </button>
              </div>

              {error && (
                <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#39251F]/80">Full name</span>
                    <span className="relative block">
                      <UserIcon className="absolute left-3 top-3 w-4 h-4 text-[#39251F]/35" />
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-xl border border-[#39251F]/20 bg-white py-2.5 pl-10 pr-3 text-sm text-[#39251F] outline-none transition focus:border-[#B85A45] focus:ring-2 focus:ring-[#B85A45]/15"
                      />
                    </span>
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-[#39251F]/80">Mobile number</span>
                  <span className="relative block">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-[#39251F]/35" />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="10–15 digits"
                      className="w-full rounded-xl border border-[#39251F]/20 bg-white py-2.5 pl-10 pr-3 text-sm font-mono text-[#39251F] outline-none transition focus:border-[#B85A45] focus:ring-2 focus:ring-[#B85A45]/15"
                    />
                  </span>
                </label>

                {mode === 'register' && (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#39251F]/80">Email <span className="font-normal text-[#39251F]/50">(optional)</span></span>
                    <span className="relative block">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-[#39251F]/35" />
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-[#39251F]/20 bg-white py-2.5 pl-10 pr-3 text-sm text-[#39251F] outline-none transition focus:border-[#B85A45] focus:ring-2 focus:ring-[#B85A45]/15"
                      />
                    </span>
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-[#39251F]/80">Password</span>
                  <span className="relative block">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-[#39251F]/35" />
                    <input
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={mode === 'register' ? 6 : 1}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                      className="w-full rounded-xl border border-[#39251F]/20 bg-white py-2.5 pl-10 pr-3 text-sm text-[#39251F] outline-none transition focus:border-[#B85A45] focus:ring-2 focus:ring-[#B85A45]/15"
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#39251F] py-3 text-sm font-black text-[#FFF8EF] shadow-md transition hover:bg-[#B85A45] disabled:cursor-wait disabled:bg-[#39251F]/45"
                >
                  {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-[#39251F]/55">
                {mode === 'login' ? 'New here? ' : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => selectMode(mode === 'login' ? 'register' : 'login')}
                  className="font-bold text-[#B85A45] hover:underline cursor-pointer"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
