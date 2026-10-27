import React, { useState } from 'react';
import { X, Lock, Phone, User as UserIcon, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      if (mode === 'login') {
        await login(cleanPhone, password);
      } else {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await register(name.trim(), cleanPhone, password, email.trim() || undefined);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-[#FFF8EF] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-[#39251F]/15 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-[#39251F] text-[#FFF8EF] flex items-center justify-between border-b border-[#F5C76A]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5C76A] text-[#271915] font-black flex items-center justify-center text-base">
              W
            </div>
            <div>
              <h2 className="font-black text-lg text-[#FFF8EF]">
                {mode === 'login' ? 'Welcome Back' : 'Create Customer Account'}
              </h2>
              <p className="text-[11px] text-[#FFF8EF]/75">Waffle Pops and Company • Mandadam</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFF8EF] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex border-b border-[#39251F]/10 bg-[#F5EDE1]">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-[#FFF8EF] text-[#39251F] border-b-2 border-[#B85A45]'
                : 'text-[#39251F]/60 hover:text-[#39251F]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-[#FFF8EF] text-[#39251F] border-b-2 border-[#B85A45]'
                : 'text-[#39251F]/60 hover:text-[#39251F]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Full Name *</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#39251F]/20 bg-white text-xs focus:border-[#B85A45] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Mobile Phone Number *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#39251F]/20 bg-white text-xs font-mono focus:border-[#B85A45] focus:outline-hidden"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Email Address (Optional)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#39251F]/20 bg-white text-xs focus:border-[#B85A45] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (minimum 6 characters)"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#39251F]/20 bg-white text-xs font-mono focus:border-[#B85A45] focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer ${
              loading
                ? 'bg-gray-400 text-white cursor-wait'
                : 'bg-[#39251F] hover:bg-[#B85A45] text-[#FFF8EF] active:scale-98'
            }`}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In to Account' : 'Create My Account'}
          </button>

          <div className="text-[11px] text-center text-[#39251F]/60">
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="text-[#B85A45] font-bold hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-[#B85A45] font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
