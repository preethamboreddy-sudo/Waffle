import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Package,
  MapPin,
  Clock,
  RotateCw,
  Star,
  MessageSquare,
  Plus,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/useCart';
import { api } from '../services/api';
import { Address, Order, SupportTicket } from '../types';

interface CustomerDashboardProps {
  onSelectOrder: (order: Order) => void;
  onExploreMenu: () => void;
  openAuthPage: () => void;
}

export function CustomerDashboard({ onSelectOrder, onExploreMenu, openAuthPage }: CustomerDashboardProps) {
  const { user, updateProfile } = useAuth();
  const { addItem, setIsCartOpen } = useCart();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'tickets' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Form
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Feedback Modal
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Support Ticket Form
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('Order Delay');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketOrderId, setTicketOrderId] = useState('');

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, addrRes, ticketsRes] = await Promise.all([
        api.getUserOrders().catch(() => ({ orders: [] })),
        api.getAddresses().catch(() => ({ addresses: [] })),
        api.getTickets().catch(() => ({ tickets: [] })),
      ]);
      setOrders(ordersRes.orders);
      setAddresses(addrRes.addresses);
      setTickets(ticketsRes.tickets);
    } catch (err: any) {
      setError(err.message || 'Failed to load account information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email || '');
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ name: profileName, email: profileEmail });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleReorder = async (order: Order) => {
    setError(null);
    try {
      const { products } = await api.getProducts();
      let addedAny = false;

      for (const item of order.items) {
        const currentProd = products.find((p) => p.id === item.productId);
        if (currentProd && currentProd.isAvailable) {
          const variant = item.variantSnapshot
            ? currentProd.variants.find((v) => v.name === item.variantSnapshot?.name)
            : undefined;
          const addons = item.addonsSnapshot
            ? item.addonsSnapshot.map((a) => ({ name: a.name, price: a.price, quantity: a.quantity }))
            : [];
          addItem(currentProd, item.quantity, variant, addons);
          addedAny = true;
        }
      }

      if (addedAny) {
        setIsCartOpen(true);
      } else {
        setError('The items from this previous order are currently unavailable in the catalog.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reorder items');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackOrderId) return;
    try {
      await api.submitFeedback({
        orderId: feedbackOrderId,
        rating,
        comment,
      });
      setFeedbackSuccess(true);
      setTimeout(() => {
        setFeedbackOrderId(null);
        setFeedbackSuccess(false);
        setComment('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createTicket({
        category: ticketCategory,
        message: ticketMessage,
        orderId: ticketOrderId || undefined,
      });
      setTickets([res.ticket, ...tickets]);
      setShowNewTicket(false);
      setTicketMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to create support ticket');
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 sm:py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[#39251F] text-[#F5C76A] flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
          W
        </div>
        <h2 className="text-2xl font-black text-[#39251F] mb-2">Sign In to Your Dessert Account</h2>
        <p className="text-sm text-[#39251F]/70 max-w-md mx-auto mb-6">
          Access your order history, live kitchen tracking, re-ordering, saved addresses, and dedicated customer care.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={openAuthPage}
            className="px-6 py-3 rounded-xl bg-[#39251F] hover:bg-[#B85A45] text-[#FFF8EF] font-bold text-sm shadow-md transition-colors cursor-pointer"
          >
            Sign In / Sign Up
          </button>
          <button
            type="button"
            onClick={onExploreMenu}
            className="px-6 py-3 rounded-xl bg-[#F5EDE1] text-[#39251F] font-bold text-sm border border-[#39251F]/15 hover:bg-[#ebdcc8] cursor-pointer"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  // Active Orders (in preparation, dispatch or delivery)
  const activeOrders = orders.filter(
    (o) => !['DELIVERED', 'PICKED_UP', 'CANCELLED', 'REJECTED'].includes(o.orderStatus)
  );

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-10 sm:py-14 space-y-10">
      {/* Account Header */}
      <div className="bg-[#FFF8EF] rounded-2xl border border-[#39251F]/15 p-8 sm:p-10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#39251F] text-[#F5C76A] flex items-center justify-center font-black text-2xl shadow-inner border border-[#F5C76A]/30">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#39251F]">{user.name}</h2>
            <p className="text-xs text-[#39251F]/70 font-mono">📱 +91 {user.phone}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#39251F]/15 text-xs font-bold text-[#39251F] hover:bg-gray-50 self-start sm:self-auto cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Prominent Active Order Banner */}
      {activeOrders.length > 0 && (
        <div className="bg-gradient-to-r from-[#39251F] to-[#2F1E19] text-[#FFF8EF] rounded-2xl p-8 sm:p-10 shadow-lg border border-[#F5C76A]/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F5C76A] flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Active Dessert Order In Progress
            </span>
            <span className="text-xs font-mono font-bold bg-[#B85A45] px-2 py-0.5 rounded-md text-white">
              {activeOrders[0].orderStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black">{activeOrders[0].orderNumber}</div>
              <div className="text-xs text-[#FFF8EF]/80">
                {activeOrders[0].items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
              </div>
              <div className="text-xs font-mono font-bold text-[#F5C76A] mt-1">
                Total: ₹{activeOrders[0].totalAmount.toFixed(2)} • {activeOrders[0].fulfilmentMode}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectOrder(activeOrders[0])}
              className="bg-[#F5C76A] hover:bg-[#e6b143] text-[#271915] font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
            >
              Open Live Tracking
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#39251F]/15 gap-3 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === 'orders' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          Order History ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('addresses')}
          className={`px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === 'addresses' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          Saved Addresses ({addresses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === 'tickets' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          Customer Care ({tickets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
            activeTab === 'profile' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          Profile Settings
        </button>
      </div>

      {/* Tab 1: Orders History */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-12 text-center text-[#39251F]/60">
              <Package className="w-12 h-12 stroke-1 mx-auto mb-2 opacity-50" />
              <h3 className="font-bold text-base text-[#39251F]">No orders placed yet</h3>
              <p className="text-xs mt-1 mb-4">Your delicious waffle orders will show up here.</p>
              <button
                type="button"
                onClick={onExploreMenu}
                className="px-4 py-2 rounded-xl bg-[#39251F] text-[#FFF8EF] font-bold text-xs hover:bg-[#B85A45] cursor-pointer"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
              className="bg-white rounded-2xl border border-[#39251F]/15 p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#39251F]">{ord.orderNumber}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        ['DELIVERED', 'PICKED_UP'].includes(ord.orderStatus)
                          ? 'bg-emerald-100 text-emerald-800'
                          : ['CANCELLED', 'REJECTED'].includes(ord.orderStatus)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ord.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-[#39251F]/80">
                    {ord.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                  </div>

                  <div className="text-xs text-gray-500">
                    {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    • {ord.fulfilmentMode}
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="font-mono font-black text-base text-[#39251F]">
                    ₹{ord.totalAmount.toFixed(2)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectOrder(ord)}
                      className="px-3 py-1.5 rounded-lg bg-[#F5EDE1] text-[#39251F] hover:bg-[#ebdcc8] text-xs font-bold cursor-pointer"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReorder(ord)}
                      className="px-3 py-1.5 rounded-lg bg-[#39251F] text-[#FFF8EF] hover:bg-[#B85A45] text-xs font-bold cursor-pointer"
                    >
                      Reorder
                    </button>

                    {['DELIVERED', 'PICKED_UP'].includes(ord.orderStatus) && (
                      <button
                        type="button"
                        onClick={() => setFeedbackOrderId(ord.id)}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold cursor-pointer"
                        title="Rate & Review"
                        aria-label="Rate this order"
                      >
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Saved Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div key={addr.id} className="bg-white rounded-2xl border border-[#39251F]/15 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#39251F]">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-700">{addr.street}</p>
                {addr.landmark && <p className="text-xs text-gray-500">Landmark: {addr.landmark}</p>}
                <p className="text-xs text-gray-500">
                  {addr.city}, Andhra Pradesh ({addr.postalCode || '522503'})
                </p>
                {addr.instructions && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-md">
                    Note: {addr.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Customer Care Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#39251F]">Customer Care Inquiries</h3>
            <button
              type="button"
              onClick={() => setShowNewTicket(!showNewTicket)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#39251F] text-[#FFF8EF] text-xs font-bold hover:bg-[#B85A45] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Raise Ticket</span>
            </button>
          </div>

          {showNewTicket && (
            <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl border border-[#39251F]/15 p-5 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#39251F]">New Support Inquiry</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Inquiry Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white"
                  >
                    <option value="Order Delay">Order Delay</option>
                    <option value="Incorrect Item">Incorrect Item / Customization</option>
                    <option value="Payment Inquiry">Payment or Cash Inquiry</option>
                    <option value="Food Quality">Quality / Preparation Feedback</option>
                    <option value="Other">Other Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Related Order Number (Optional)</label>
                  <input
                    type="text"
                    value={ticketOrderId}
                    onChange={(e) => setTicketOrderId(e.target.value)}
                    placeholder="e.g. WP-20261027-1234"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Describe Your Issue *</label>
                <textarea
                  required
                  rows={3}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="How can our Mandadam dessert team assist you?"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#39251F] text-white text-xs font-bold hover:bg-[#B85A45] cursor-pointer"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          )}

          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-8 text-center text-gray-500 text-xs">
              No support tickets opened. Need assistance with an order? Raise a ticket above.
            </div>
          ) : (
            tickets.map((tick) => (
              <div key={tick.id} className="bg-white rounded-2xl border border-[#39251F]/15 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-xs text-[#39251F]">{tick.ticketNumber}</span>
                    <span className="ml-2 font-bold text-xs text-gray-700">{tick.category}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      tick.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tick.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs">
                  {tick.messages.map((m) => (
                    <div key={m.id} className="border-b last:border-b-0 pb-1.5 last:pb-0">
                      <div className="flex justify-between font-semibold text-gray-800">
                        <span>{m.senderName} ({m.senderRole}):</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-0.5">{m.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Profile Settings */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="bg-white rounded-2xl border border-[#39251F]/15 p-6 space-y-4 max-w-lg">
          <h3 className="font-bold text-sm text-[#39251F]">Profile Information</h3>

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Phone Number</label>
            <input
              type="text"
              disabled
              value={user.phone}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 text-xs font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-gray-400">Account primary phone cannot be modified online.</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#39251F] hover:bg-[#B85A45] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </form>
      )}

      {/* Feedback Dialog */}
      {feedbackOrderId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF8EF] rounded-2xl max-w-md w-full p-6 border border-[#39251F]/15 space-y-4 shadow-2xl">
            <h3 className="font-black text-lg text-[#39251F]">Rate Your Dessert Experience</h3>
            <p className="text-xs text-[#39251F]/70">
              How did you enjoy your Belgian waffle or chocolate waffle pop from our Mandadam kitchen?
            </p>

            {feedbackSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold text-center">
                ✓ Thank you for your feedback!
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#39251F] mb-1">Your Written Review *</label>
                  <textarea
                    required
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about the crunch, chocolate glaze, delivery speed..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackOrderId(null)}
                    className="flex-1 py-2 rounded-xl border border-gray-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-[#39251F] text-white text-xs font-bold hover:bg-[#B85A45] cursor-pointer"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
