import React, { useState } from 'react';
import { ShoppingBag, User as UserIcon, MapPin, Clock, AlertTriangle, Menu as MenuIcon, X } from 'lucide-react';
import { useCart } from '../context/useCart';
import { useAuth } from '../context/useAuth';
import { FulfilmentMode } from '../types';

interface HeaderProps {
  activeView: string;
  setActiveView: (view: string) => void;
  openAuthPage: () => void;
}

export function Header({ activeView, setActiveView, openAuthPage }: HeaderProps) {
  const { items, itemCount, subtotal, isCartOpen, setIsCartOpen, fulfilmentMode, setFulfilmentMode, branch } = useCart();
  const { user, logout } = useAuth();
  const showLogoOnly = activeView === 'dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logout();
    } catch {
      setLogoutError('Could not reach the sign-out service. You are signed out on this screen, but the session may return after refresh.');
    } finally {
      setActiveView('storefront');
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFF8EF]/95 backdrop-blur-md border-b border-[#39251F]/10 shadow-xs">
      {logoutError && (
        <div role="alert" className="bg-red-50 text-red-800 border-b border-red-200 px-4 py-2 text-xs text-center font-semibold">
          {logoutError}
        </div>
      )}
      {/* Provisional Branch Notice Bar */}
      <div className="bg-[#39251F] text-[#FFF8EF] px-4 py-1.5 text-xs text-center font-medium flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 bg-[#F5C76A] text-[#271915] text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
          Launch Branch
        </span>
        <span>
          Mandadam: Main Road, opposite Krupa Bangalore Bakery Shop
        </span>
        <span className="opacity-75 hidden sm:inline">
          (Address details provisional until verified by business owner)
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setActiveView('storefront'); setMobileMenuOpen(false); }}
              aria-label="Waffle Pops home"
              className="text-left group cursor-pointer focus:outline-hidden"
            >
              <div className={`flex items-center ${showLogoOnly ? '' : 'gap-2'}`}>
                <div className={`rounded-lg bg-[#39251F] text-[#F5C76A] flex items-center justify-center font-black shadow-inner border border-[#F5C76A]/40 ${showLogoOnly ? 'w-11 h-11 text-2xl' : 'w-9 h-9 text-xl'}`}>
                  W
                </div>
                {!showLogoOnly && (
                  <div>
                    <h1 className="font-black text-xl tracking-tight text-[#39251F] group-hover:text-[#B85A45] transition-colors leading-none">
                      WAFFLE POPS <span className="text-[#B85A45] font-serif font-light text-base">&amp; CO.</span>
                    </h1>
                    <p className="text-[10px] uppercase font-semibold tracking-wider text-[#39251F]/60 mt-0.5">
                      Belgian Waffles • Pops • Mandadam
                    </p>
                  </div>
                )}
              </div>
            </button>

            {/* Fulfilment Mode Selector */}
            <div className="hidden md:flex items-center bg-[#F5EDE1] p-1 rounded-xl border border-[#39251F]/10 ml-4">
              <button
                type="button"
                onClick={() => setFulfilmentMode('DELIVERY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  fulfilmentMode === 'DELIVERY'
                    ? 'bg-[#39251F] text-[#FFF8EF] shadow-xs'
                    : 'text-[#39251F]/70 hover:text-[#39251F]'
                }`}
              >
                <span>🛵 Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setFulfilmentMode('TAKEAWAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  fulfilmentMode === 'TAKEAWAY'
                    ? 'bg-[#39251F] text-[#FFF8EF] shadow-xs'
                    : 'text-[#39251F]/70 hover:text-[#39251F]'
                }`}
              >
                <span>🛍️ Takeaway</span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <button
              onClick={() => setActiveView('storefront')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeView === 'storefront' ? 'text-[#B85A45] border-b-2 border-[#B85A45] pb-1' : 'text-[#39251F]/80 hover:text-[#39251F]'
              }`}
            >
              Menu Catalog
            </button>
            <button
              onClick={() => setActiveView('dashboard')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeView === 'dashboard' ? 'text-[#B85A45] border-b-2 border-[#B85A45] pb-1' : 'text-[#39251F]/80 hover:text-[#39251F]'
              }`}
            >
              My Orders &amp; Track
            </button>
            <button
              onClick={() => setActiveView('reviews')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeView === 'reviews' ? 'text-[#B85A45] border-b-2 border-[#B85A45] pb-1' : 'text-[#39251F]/80 hover:text-[#39251F]'
              }`}
            >
              Customer Reviews
            </button>
            <button
              onClick={() => setActiveView('support')}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                activeView === 'support' ? 'text-[#B85A45] border-b-2 border-[#B85A45] pb-1' : 'text-[#39251F]/80 hover:text-[#39251F]'
              }`}
            >
              Customer Care
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Admin Switcher */}
            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5EDE1] text-[#39251F] border border-[#39251F]/15 hover:border-[#39251F]/30 cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#B85A45]" />
                  <span className="truncate max-w-[100px]">{user.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout().catch(() => undefined)}
                  className="text-xs text-[#39251F]/60 hover:text-[#B85A45] font-medium cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { openAuthPage(); setMobileMenuOpen(false); }}
                className="text-xs font-bold text-[#39251F] bg-[#F5EDE1] hover:bg-[#e8d6c0] px-3 py-2 rounded-lg border border-[#39251F]/15 transition-colors cursor-pointer"
              >
                Sign In / Sign Up
              </button>
            )}

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative flex items-center gap-2.5 bg-[#39251F] hover:bg-[#271915] text-[#FFF8EF] px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-transform active:scale-95 cursor-pointer"
              aria-label="View shopping cart"
            >
              <ShoppingBag className="w-4 h-4 text-[#F5C76A]" />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="bg-[#B85A45] text-white text-xs px-2 py-0.5 rounded-full font-extrabold">
                  {itemCount}
                </span>
              )}
              {subtotal > 0 && (
                <span className="hidden md:inline font-mono font-medium text-xs text-[#F5C76A] border-l border-white/20 pl-2">
                  ₹{subtotal.toFixed(2)}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[#39251F] hover:bg-[#F5EDE1] cursor-pointer"
              aria-label="Open navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#39251F]/10 py-4 space-y-3 bg-[#FFF8EF]">
            <div className="flex items-center justify-between pb-3 border-b border-[#39251F]/10">
              <span className="text-xs font-bold text-[#39251F]/70">Fulfilment Choice:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFulfilmentMode('DELIVERY')}
                  className={`px-3 py-1 rounded-md text-xs font-bold ${
                    fulfilmentMode === 'DELIVERY' ? 'bg-[#39251F] text-white' : 'bg-[#F5EDE1] text-[#39251F]'
                  }`}
                >
                  Delivery
                </button>
                <button
                  onClick={() => setFulfilmentMode('TAKEAWAY')}
                  className={`px-3 py-1 rounded-md text-xs font-bold ${
                    fulfilmentMode === 'TAKEAWAY' ? 'bg-[#39251F] text-white' : 'bg-[#F5EDE1] text-[#39251F]'
                  }`}
                >
                  Takeaway
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => { setActiveView('storefront'); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold bg-[#F5EDE1]/60 text-[#39251F]"
              >
                🧇 Menu Catalog
              </button>
              <button
                onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold bg-[#F5EDE1]/60 text-[#39251F]"
              >
                📦 Track &amp; Orders
              </button>
              <button
                onClick={() => { setActiveView('reviews'); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold bg-[#F5EDE1]/60 text-[#39251F]"
              >
                ⭐ Customer Reviews
              </button>
              <button
                onClick={() => { setActiveView('support'); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold bg-[#F5EDE1]/60 text-[#39251F]"
              >
                💬 Customer Care
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
