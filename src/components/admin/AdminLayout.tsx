import React, { useState } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const isStaff = user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logout();
    } catch {
      setLogoutError('Sign-out could not reach the server. You are signed out on this screen.');
    } finally {
      window.location.assign('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F2EA] text-[#271915]">
      <header className="sticky top-0 z-40 border-b border-[#39251F]/10 bg-[#FFF8EF]/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex min-h-20 max-w-[90rem] items-center gap-4 px-5 sm:px-8 lg:px-10">
          <a href="/admin/" aria-label="Admin home" className="shrink-0">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#F5C76A]/40 bg-[#39251F] text-2xl font-black text-[#F5C76A] shadow-inner">
              W
            </span>
          </a>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B85A45]">Staff Portal</p>
            <p className="text-sm font-extrabold text-[#39251F] sm:text-base">Operations Console</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <>
                <span className="hidden text-right sm:block">
                  <span className="block max-w-44 truncate text-xs font-bold text-[#39251F]">{user.name}</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#39251F]/55">{user.role}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#39251F]/15 bg-white px-3 py-2 text-xs font-bold text-[#39251F] transition-colors hover:bg-[#F5EDE1]"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            )}
            {isStaff ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#39251F] px-3 py-2 text-xs font-bold text-[#FFF8EF] transition-colors hover:bg-[#B85A45] sm:px-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Customer site</span>
              </button>
            ) : (
              <a
                href={import.meta.env.VITE_CUSTOMER_APP_URL || (window.location.port === '5174' ? `${window.location.protocol}//${window.location.hostname}:5173/` : '/')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#39251F] px-3 py-2 text-xs font-bold text-[#FFF8EF] transition-colors hover:bg-[#B85A45] sm:px-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Customer site</span>
              </a>
            )}
          </div>
        </div>
        {logoutError && (
          <div role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-xs font-semibold text-red-800">
            {logoutError}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
