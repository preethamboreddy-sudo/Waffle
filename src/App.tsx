import React, { useEffect, useRef, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductCatalog } from './components/ProductCatalog';
import { CustomizationModal } from './components/CustomizationModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTracking } from './components/OrderTracking';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CustomerReviews } from './components/CustomerReviews';
import { CustomerCareView } from './components/CustomerCareView';
import { AuthPage } from './components/AuthPage';
import { Footer } from './components/Footer';
import { Order, Product } from './types';
import { useCart } from './context/useCart';
import { useAuth } from './context/useAuth';

type AppView = 'storefront' | 'dashboard' | 'tracking' | 'reviews' | 'support' | 'auth';

const ACTIVE_VIEW_STORAGE_KEY = 'waffle_pops_active_view_v1';
const RESTORABLE_VIEWS: AppView[] = ['storefront', 'dashboard', 'reviews', 'support', 'auth'];

function getInitialView(): AppView {
  try {
    const storedView = sessionStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    if (storedView && RESTORABLE_VIEWS.includes(storedView as AppView)) {
      return storedView as AppView;
    }
  } catch {
    // Storage may be unavailable in private browsing; use the normal first view.
  }
  return 'storefront';
}

function MainAppContent() {
  const [activeView, setActiveView] = useState<AppView>(getInitialView);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const { user, loading: authLoading, logout } = useAuth();
  const staffLogoutAttempted = useRef(false);

  const { addItem, setIsCartOpen } = useCart();

  useEffect(() => {
    if (authLoading || !user) {
      if (!user) staffLogoutAttempted.current = false;
      return;
    }
    if (user.role === 'CUSTOMER' || staffLogoutAttempted.current) return;

    staffLogoutAttempted.current = true;
    void logout().catch(() => {
      setSessionNotice('The staff session could not be cleared from the server. Please try signing out again.');
    });
  }, [authLoading, user, logout]);

  useEffect(() => {
    try {
      if (RESTORABLE_VIEWS.includes(activeView)) {
        sessionStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
      } else {
        // Tracking depends on in-memory order data, so don't restore a blank tracking view.
        sessionStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
      }
    } catch {
      // Storage may be unavailable; the app still works for the current session.
    }
  }, [activeView]);

  const handleOpenCustomize = (product: Product) => {
    setCustomizingProduct(product);
  };

  const handleOrderPlaced = (order: Order) => {
    setTrackedOrder(order);
    setActiveView('tracking');
  };

  const handleSelectOrderForTracking = (order: Order) => {
    setTrackedOrder(order);
    setActiveView('tracking');
  };

  const handleOpenSupportForOrder = (orderId: string) => {
    setActiveView('support');
  };

  if (!authLoading && user && user.role !== 'CUSTOMER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8EF] px-6 text-center text-sm font-semibold text-[#39251F]">
        Closing the staff session before opening the customer site…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8EF] text-[#271915]">
      {sessionNotice && (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs font-semibold text-red-800">
          {sessionNotice}
        </div>
      )}
      {/* Global Header */}
      <Header
        activeView={activeView}
        setActiveView={(v: any) => setActiveView(v)}
        openAuthPage={() => setActiveView('auth')}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'storefront' && (
          <>
            <Hero
              onExploreClick={() => {
                const el = document.getElementById('menu-catalog');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <ProductCatalog onCustomize={handleOpenCustomize} />
          </>
        )}

        {activeView === 'dashboard' && (
          <CustomerDashboard
            onSelectOrder={handleSelectOrderForTracking}
            onExploreMenu={() => setActiveView('storefront')}
            openAuthPage={() => setActiveView('auth')}
          />
        )}

        {activeView === 'auth' && (
          <AuthPage
            onAuthenticated={() => setActiveView('dashboard')}
            onBack={() => setActiveView('storefront')}
          />
        )}

        {activeView === 'tracking' && trackedOrder && (
          <OrderTracking
            initialOrder={trackedOrder}
            onBackToMenu={() => setActiveView('storefront')}
            onOpenSupport={handleOpenSupportForOrder}
          />
        )}

        {activeView === 'reviews' && <CustomerReviews />}

        {activeView === 'support' && <CustomerCareView />}

      </main>

      {/* Global Footer */}
      <Footer />

      {/* Customization Modal */}
      {customizingProduct && (
        <CustomizationModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAddToCart={(product, qty, variant, addons) => {
            addItem(product, qty, variant, addons);
          }}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderPlaced={handleOrderPlaced}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainAppContent />
      </CartProvider>
    </AuthProvider>
  );
}
