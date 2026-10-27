import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Shield,
  DollarSign,
  Database,
  TrendingUp,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Settings,
  MessageSquare,
  FileText,
  Star,
  Activity,
  RotateCw,
  Power,
  Truck,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { adminApi as api } from '../../services/api';
import { AdminMetrics, AdminPost, AuditLog, Branch, Order, OrderStatus, Product, SupportTicket } from '../../types';

function formatAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

export function AdminDashboard() {
  const { user, login } = useAuth();

  // Admin login credentials state if not logged in as admin
  const [adminPhone, setAdminPhone] = useState('9999999999');
  const [adminPass, setAdminPass] = useState('adminPassword123!');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'orders' | 'products' | 'branch' | 'tickets' | 'feedback' | 'audit'>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<{ type: string; connected: boolean } | null>(null);
  const [postsDatabaseStatus, setPostsDatabaseStatus] = useState<{ type: string; configured: boolean; connected: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const fetchRequestId = useRef(0);

  // Filter & Search states
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status transition reason
  const [transitionReason, setTransitionReason] = useState('');

  // Product edit modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('cat-pops');
  const [prodPrice, setProdPrice] = useState(119);
  const [prodDesc, setProdDesc] = useState('');
  const [prodImg, setProdImg] = useState('');

  // Ticket reply
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'OPERATOR');
  const filteredPosts = posts.filter((post) => {
    const query = postSearch.trim().toLowerCase();
    return !query || post.content.toLowerCase().includes(query) || String(post.userId).includes(query);
  });

  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    const requestId = ++fetchRequestId.current;
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getHealth(),
        api.getAdminPosts(),
        api.getAdminMetrics(),
        api.getAdminOrders({ search: orderSearch, status: statusFilter || undefined }),
        api.getProducts(true),
        api.getBranch(),
        api.getAdminTickets(),
        api.getAdminFeedback(),
        api.getAdminAuditLogs(),
      ]);
      if (requestId !== fetchRequestId.current) return;

      const failures: string[] = [];
      const [healthResult, postsResult, metricsResult, ordersResult, productsResult, branchResult, ticketsResult, feedbackResult, auditResult] = results;

      if (healthResult.status === 'fulfilled') {
        setDatabaseStatus(healthResult.value.database);
        setPostsDatabaseStatus(healthResult.value.postsDatabase || null);
      }
      else {
        setDatabaseStatus(null);
        setPostsDatabaseStatus(null);
        failures.push('storage status');
      }
      if (postsResult.status === 'fulfilled') {
        setPosts(postsResult.value.posts);
        setPostsTotal(postsResult.value.total);
      } else failures.push('posts');
      if (metricsResult.status === 'fulfilled') setMetrics(metricsResult.value.metrics);
      else failures.push('metrics');
      if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value.orders);
      else failures.push('orders');
      if (productsResult.status === 'fulfilled') setProducts(productsResult.value.products);
      else failures.push('products');
      if (branchResult.status === 'fulfilled') setBranch(branchResult.value.branch);
      else failures.push('branch settings');
      if (ticketsResult.status === 'fulfilled') setTickets(ticketsResult.value.tickets);
      else failures.push('support tickets');
      if (feedbackResult.status === 'fulfilled') setFeedback(feedbackResult.value.feedback);
      else failures.push('reviews');
      if (auditResult.status === 'fulfilled') setAuditLogs(auditResult.value.auditLogs);
      else failures.push('audit logs');

      setLoadError(failures.length ? `Could not load ${failures.join(', ')}. Check the connection and refresh.` : null);
    } finally {
      if (requestId === fetchRequestId.current) setLoading(false);
    }
  }, [isAdmin, orderSearch, statusFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    const timeout = window.setTimeout(() => void fetchAdminData(), 250);
    return () => {
      window.clearTimeout(timeout);
      fetchRequestId.current += 1;
    };
  }, [fetchAdminData, isAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await login(adminPhone, adminPass);
    } catch (err: any) {
      setAuthError(err.message || 'Admin authentication failed');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await api.updateOrderStatus(orderId, newStatus, transitionReason || undefined);
      setActionMsg(`Order ${res.order.orderNumber} status changed to ${newStatus}`);
      setTransitionReason('');
      fetchAdminData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(res.order);
      }
      setTimeout(() => setActionMsg(null), 3500);
    } catch (err: any) {
      alert(`Status transition error: ${err.message}`);
    }
  };

  const handleRecordCodPayment = async (orderId: string) => {
    try {
      const res = await api.recordPaymentCollection(orderId, 'Cash collected by Mandadam staff');
      setActionMsg(`Recorded payment for order ${res.order.orderNumber}`);
      fetchAdminData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(res.order);
      }
      setTimeout(() => setActionMsg(null), 3500);
    } catch (err: any) {
      alert(`Payment recording error: ${err.message}`);
    }
  };

  const handleToggleProductAvailability = async (product: Product) => {
    try {
      await api.updateProduct(product.id, { isAvailable: !product.isAvailable });
      fetchAdminData();
    } catch (err: any) {
      alert(`Could not toggle availability: ${err.message}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: prodName,
          basePrice: Number(prodPrice),
          description: prodDesc,
          imageUrl: prodImg,
        });
        setEditingProduct(null);
      } else {
        await api.createProduct({
          name: prodName,
          categoryId: prodCategory,
          basePrice: Number(prodPrice),
          description: prodDesc,
          imageUrl: prodImg,
        });
        setShowNewProduct(false);
      }
      fetchAdminData();
    } catch (err: any) {
      alert(`Failed to save product: ${err.message}`);
    }
  };

  const handleToggleStorePaused = async () => {
    if (!branch) return;
    try {
      const nextPaused = !branch.orderAcceptancePaused;
      await api.updateBranchSettings({ orderAcceptancePaused: nextPaused });
      fetchAdminData();
    } catch (err: any) {
      alert(`Could not update store status: ${err.message}`);
    }
  };

  const handleSendTicketReply = async (ticketId: string) => {
    if (!ticketReplyText.trim()) return;
    try {
      await api.adminReplyTicket(ticketId, {
        message: ticketReplyText,
        newStatus: 'IN_PROGRESS',
      });
      setTicketReplyText('');
      setReplyTicketId(null);
      fetchAdminData();
    } catch (err: any) {
      alert(`Failed to send reply: ${err.message}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-[#39251F]/15 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-[#39251F] text-[#F5C76A] flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-center text-[#39251F] mb-1">Protected Staff Portal</h2>
        <p className="text-xs text-center text-gray-500 mb-6">
          Access restricted to authorized store managers and operators.
        </p>

        {authError && (
          <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-semibold mb-4">
            {authError}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Admin Mobile Number</label>
            <input
              type="text"
              required
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono"
            />
          </div>

          <div className="p-2.5 bg-[#F5EDE1] rounded-xl text-[11px] text-[#39251F]">
            <span className="font-bold">Bootstrap Account:</span> 9999999999 / adminPassword123!
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#39251F] hover:bg-[#B85A45] text-white text-xs font-black shadow-md cursor-pointer transition-colors"
          >
            Authenticate Staff Access
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-10 sm:py-12 space-y-8">
      {/* Admin Header */}
      <div className="bg-[#39251F] text-[#FFF8EF] rounded-2xl p-8 sm:p-10 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
            <span className="bg-[#B85A45] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
              Staff &amp; Operations
            </span>
            <span className="text-xs text-[#F5C76A] font-semibold">
              Branch: {branch?.name || 'Mandadam'}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${databaseStatus?.connected ? 'text-emerald-200' : 'text-red-200'}`}>
              <Database className="w-3 h-3" />
              {databaseStatus?.connected
                ? databaseStatus.type.startsWith('PostgreSQL') ? 'PostgreSQL connected' : 'File storage active'
                : 'Storage unavailable'}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${postsDatabaseStatus?.connected ? 'text-emerald-200' : 'text-red-200'}`}>
              <FileText className="w-3 h-3" />
              {postsDatabaseStatus?.connected ? 'Posts PostgreSQL connected' : 'Posts database unavailable'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#FFF8EF]">Store Manager &amp; Kitchen Console</h2>
          <p className="text-xs text-[#FFF8EF]/80">
            Real-time orders, state transitions, COD collection audit, and catalog management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Pause / Resume store toggle */}
          <button
            type="button"
            onClick={handleToggleStorePaused}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors ${
              branch?.orderAcceptancePaused
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{branch?.orderAcceptancePaused ? 'Online Orders PAUSED' : 'Online Orders LIVE'}</span>
          </button>

          <button
            type="button"
            onClick={fetchAdminData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFF8EF] cursor-pointer"
            title="Refresh dashboard"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {loadError && (
        <div role="alert" className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold">
          {loadError}
        </div>
      )}

      {/* Admin Tab Navigation */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 bg-white border border-[#39251F]/15 rounded-2xl p-3 text-xs font-black">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`min-w-0 w-full px-3 py-3 rounded-xl text-center leading-tight whitespace-normal cursor-pointer transition-all ${
            activeTab === 'overview' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          📊 KPI Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`min-w-0 w-full px-3 py-3 rounded-xl text-center leading-tight whitespace-normal cursor-pointer transition-all ${
            activeTab === 'orders' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          📦 Orders &amp; Kitchen ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`min-w-0 w-full px-3 py-3 rounded-xl text-center leading-tight whitespace-normal cursor-pointer transition-all ${
            activeTab === 'posts' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          📝 Posts ({postsTotal})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`min-w-0 w-full px-3 py-3 rounded-xl text-center leading-tight whitespace-normal cursor-pointer transition-all ${
            activeTab === 'products' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          🧇 Product Catalog ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('branch')}
          className={`min-w-0 w-full px-3 py-3 rounded-xl text-center leading-tight whitespace-normal cursor-pointer transition-all ${
            activeTab === 'branch' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          ⚙️ Branch Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`min-w-0 w-full px-3 py-3 rounded-xl text-center leading-tight whitespace-normal cursor-pointer transition-all ${
            activeTab === 'tickets' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          💬 Support Tickets ({tickets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          className={`min-w-0 w-full px-3 py-3 rounded-xl text-center leading-tight whitespace-normal cursor-pointer transition-all ${
            activeTab === 'feedback' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          ⭐ Reviews ({feedback.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`min-w-0 w-full px-3 py-3 rounded-xl text-center leading-tight whitespace-normal cursor-pointer transition-all ${
            activeTab === 'audit' ? 'bg-[#39251F] text-[#FFF8EF]' : 'text-[#39251F]/70 hover:bg-[#F5EDE1]'
          }`}
        >
          🛡️ Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: KPI Overview */}
      {activeTab === 'overview' && (metrics ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <div className="text-xs text-gray-500 font-semibold">Today's Orders</div>
              <div className="text-2xl font-black text-[#39251F]">{metrics.todayOrderCount}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <div className="text-xs text-gray-500 font-semibold">Pending in Kitchen</div>
              <div className="text-2xl font-black text-amber-700">{metrics.pendingOrderCount}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <div className="text-xs text-gray-500 font-semibold">Completed Orders</div>
              <div className="text-2xl font-black text-emerald-700">{metrics.completedOrderCount}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <div className="text-xs text-gray-500 font-semibold">Cancelled / Rejected</div>
              <div className="text-2xl font-black text-red-600">{metrics.cancelledOrderCount}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <div className="text-xs text-gray-500 font-semibold">Published Posts</div>
              <div className="text-2xl font-black text-[#B85A45]">{postsTotal}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-[#FFF8EF] rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <div className="text-xs font-bold text-gray-600">Gross Realized Sales</div>
              <div className="text-3xl font-black font-mono text-[#39251F] mt-1">
                ₹{formatAmount(metrics.grossSales)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Net Food: ₹{formatAmount(metrics.netFoodSales)} • GST: ₹{formatAmount(metrics.taxesCollected)}
              </div>
            </div>

            <div className="bg-[#FFF8EF] rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <div className="text-xs font-bold text-gray-600">Average Order Value (AOV)</div>
              <div className="text-3xl font-black font-mono text-[#B85A45] mt-1">
                ₹{formatAmount(metrics.avgOrderValue)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Across orders with completed payments</div>
            </div>

            <div className="bg-[#FFF8EF] rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <div className="text-xs font-bold text-gray-600">Delivery Revenue</div>
              <div className="text-3xl font-black font-mono text-emerald-800 mt-1">
                ₹{formatAmount(metrics.deliveryCharges)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Mandadam town delivery fees collected</div>
            </div>
          </div>

          {/* Popular Items */}
          {metrics.popularProducts && metrics.popularProducts.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
              <h3 className="text-xs font-black text-[#39251F] uppercase tracking-wider mb-3">
                Top Selling Desserts
              </h3>
              <div className="divide-y divide-gray-100">
                {metrics.popularProducts.map((p: any, idx: number) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#39251F]">
                      #{idx + 1} {p.name}
                    </span>
                    <span className="font-mono text-gray-600">
                      {p.count} sold • ₹{formatAmount(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div role="status" className="bg-white rounded-2xl border border-[#39251F]/15 p-8 text-center text-sm text-gray-600">
          {loading ? 'Loading dashboard metrics…' : 'Dashboard metrics are unavailable.'}
        </div>
      ))}

      {activeTab === 'posts' && (
        <section className="space-y-6" aria-labelledby="posts-heading">
          <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h3 id="posts-heading" className="text-lg font-black text-[#39251F]">Post Feed</h3>
              <p className="text-xs text-gray-500 mt-1">Read-only posts loaded from PostgreSQL.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#39251F]">{postsTotal} total</span>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="search"
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  placeholder="Search posts or user ID"
                  aria-label="Search posts or user ID"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {loading && posts.length === 0 ? (
            <div role="status" className="bg-white rounded-2xl border border-[#39251F]/15 p-8 text-center text-sm text-gray-600">
              Loading posts from PostgreSQL…
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-8 text-center text-sm text-gray-600">
              {posts.length === 0 ? 'No posts are available.' : 'No posts match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredPosts.map((post) => (
                <article key={post.id} className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-black text-[#39251F]">Post #{post.id}</span>
                    <span className="text-[11px] text-gray-500">User #{post.userId}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{post.content}</p>
                  <time className="block text-[11px] text-gray-400 mt-4">
                    {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Date unavailable'}
                  </time>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Orders & Kitchen Management */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-6 rounded-2xl border border-[#39251F]/15 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search order #, customer, phone..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs focus:outline-hidden"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs bg-white"
              >
                <option value="">All Statuses</option>
                <option value="ORDER_PLACED">Order Placed</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                <option value="DELIVERED">Delivered</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Orders List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#39251F]/15 p-8 text-center text-gray-500 text-xs">
                  No orders match current criteria.
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                      selectedOrder?.id === ord.id
                        ? 'border-[#B85A45] ring-2 ring-[#B85A45]/20 bg-[#FFF8EF]'
                        : 'border-[#39251F]/15 hover:border-[#39251F]/40'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-mono font-bold text-xs text-[#39251F]">{ord.orderNumber}</span>
                        <div className="font-bold text-sm text-[#39251F]">{ord.customerName}</div>
                      </div>
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

                    <div className="text-xs text-gray-600 line-clamp-1 mb-2">
                      {ord.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100">
                      <span className="text-gray-500">
                        {ord.fulfilmentMode} • 📱 {ord.customerPhone}
                      </span>
                      <span className="font-mono font-bold text-sm text-[#39251F]">
                        ₹{ord.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Order Inspector & Status Workflow */}
            <div className="lg:col-span-5">
              {selectedOrder ? (
                <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs space-y-5 sticky top-24">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <div className="font-mono font-bold text-xs text-[#39251F]">
                        {selectedOrder.orderNumber}
                      </div>
                      <div className="text-base font-black text-[#39251F]">
                        {selectedOrder.customerName}
                      </div>
                    </div>
                    <span className="font-mono font-black text-lg text-[#B85A45]">
                      ₹{selectedOrder.totalAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Payment Details & COD Collection Action */}
                  <div className="p-3 bg-[#F5EDE1] rounded-xl text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="font-bold">Payment Method:</span>
                      <span>{selectedOrder.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Payment Status:</span>
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          selectedOrder.paymentStatus === 'COMPLETED'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>

                    {selectedOrder.paymentMethod === 'COD' && selectedOrder.paymentStatus === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => handleRecordCodPayment(selectedOrder.id)}
                        className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        ✓ Record COD Cash Collection (₹{selectedOrder.totalAmount})
                      </button>
                    )}
                  </div>

                  {/* Status Transition State Machine Actions */}
                  <div className="space-y-2">
                    <div className="text-xs font-black text-[#39251F] uppercase tracking-wider">
                      Advance Kitchen / Delivery State
                    </div>

                    <div className="space-y-1.5">
                      {selectedOrder.orderStatus === 'ORDER_PLACED' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'ACCEPTED')}
                            className="py-2 px-3 rounded-xl bg-[#39251F] hover:bg-[#B85A45] text-white font-bold text-xs cursor-pointer"
                          >
                            Accept Order
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'REJECTED')}
                            className="py-2 px-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs cursor-pointer"
                          >
                            Reject Order
                          </button>
                        </div>
                      )}

                      {selectedOrder.orderStatus === 'ACCEPTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#39251F] hover:bg-[#B85A45] text-white font-bold text-xs cursor-pointer"
                        >
                          Start Baking &amp; Preparing Waffles
                        </button>
                      )}

                      {selectedOrder.orderStatus === 'PREPARING' && (
                        <div>
                          {selectedOrder.fulfilmentMode === 'DELIVERY' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(selectedOrder.id, 'READY_FOR_DISPATCH')}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                            >
                              Ready for Dispatch (Delivery)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(selectedOrder.id, 'READY_FOR_PICKUP')}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                            >
                              Ready for Pickup (Store Counter)
                            </button>
                          )}
                        </div>
                      )}

                      {selectedOrder.orderStatus === 'READY_FOR_DISPATCH' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs cursor-pointer"
                        >
                          Out for Delivery (Mandadam)
                        </button>
                      )}

                      {selectedOrder.orderStatus === 'OUT_FOR_DELIVERY' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Mark Order Delivered
                        </button>
                      )}

                      {selectedOrder.orderStatus === 'READY_FOR_PICKUP' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'PICKED_UP')}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                        >
                          Handed Over / Picked Up
                        </button>
                      )}

                      {!['DELIVERED', 'PICKED_UP', 'CANCELLED', 'REJECTED'].includes(
                        selectedOrder.orderStatus
                      ) && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                          className="w-full py-1.5 px-3 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer mt-1"
                        >
                          Cancel Order (Store Reason)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-1.5 text-xs border-t pt-3">
                    <div className="font-bold text-[#39251F] mb-1">Ordered Items:</div>
                    {selectedOrder.items.map((i) => (
                      <div key={i.id} className="flex justify-between">
                        <span>
                          {i.productName} x{i.quantity}
                          {i.variantSnapshot ? ` (${i.variantSnapshot.name})` : ''}
                        </span>
                        <span className="font-mono font-bold">₹{i.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Address */}
                  {selectedOrder.deliveryAddressSnapshot && (
                    <div className="text-xs border-t pt-3 text-gray-700">
                      <div className="font-bold text-[#39251F] mb-0.5">Address:</div>
                      <div>{selectedOrder.deliveryAddressSnapshot.street}</div>
                      {selectedOrder.deliveryAddressSnapshot.landmark && (
                        <div>Landmark: {selectedOrder.deliveryAddressSnapshot.landmark}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#39251F]/15 p-8 text-center text-gray-400 text-xs">
                  Select an order on the left to inspect invoice, address, and update status.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Products Management */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-[#39251F]">Dessert Catalog &amp; Pricing</h3>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProdName('');
                setProdPrice(119);
                setProdDesc('');
                setProdImg('https://images.unsplash.com/photo-1568051243851-f9b136146e97?auto=format&fit=crop&w=700&q=80');
                setShowNewProduct(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#39251F] text-white text-xs font-bold hover:bg-[#B85A45] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Dessert</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm text-[#39251F]">{p.name}</h4>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {p.isAvailable ? 'In Stock' : 'Sold Out'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.description}</p>
                  <div className="font-mono font-bold text-sm text-[#39251F] mb-3">
                    ₹{Number(p.basePrice).toFixed(2)} (Demo)
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleProductAvailability(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      p.isAvailable
                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                        : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                    }`}
                  >
                    {p.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(p);
                      setProdName(p.name);
                      setProdPrice(Number(p.basePrice));
                      setProdDesc(p.description);
                      setProdImg(p.imageUrl);
                      setShowNewProduct(true);
                    }}
                    className="p-1.5 rounded-lg border text-gray-600 hover:bg-gray-50 cursor-pointer"
                    title="Edit product"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Product Modal */}
          {showNewProduct && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <form onSubmit={handleSaveProduct} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-200">
                <h3 className="font-black text-lg text-[#39251F]">
                  {editingProduct ? 'Edit Dessert' : 'Create New Dessert'}
                </h3>
                <div>
                  <label className="block text-xs font-bold mb-1">Dessert Name *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Base Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Image URL</label>
                  <input
                    type="url"
                    value={prodImg}
                    onChange={(e) => setProdImg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewProduct(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#39251F] text-white text-xs font-bold hover:bg-[#B85A45] cursor-pointer"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Branch Settings */}
      {activeTab === 'branch' && branch && (
        <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 max-w-xl space-y-4">
          <h3 className="font-bold text-sm text-[#39251F]">Branch &amp; Fulfilment Settings</h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Store Address (Provisional)</label>
              <input
                type="text"
                value={branch.address}
                onChange={(e) => setBranch({ ...branch, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Delivery Fee (INR)</label>
                <input
                  type="number"
                  value={branch.deliveryFee}
                  onChange={(e) => setBranch({ ...branch, deliveryFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Min Order Amount (INR)</label>
                <input
                  type="number"
                  value={branch.minOrderAmount}
                  onChange={(e) => setBranch({ ...branch, minOrderAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await api.updateBranchSettings({
                  address: branch.address,
                  deliveryFee: Number(branch.deliveryFee),
                  minOrderAmount: Number(branch.minOrderAmount),
                });
                alert('Branch settings saved.');
                fetchAdminData();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#39251F] text-white text-xs font-bold hover:bg-[#B85A45] cursor-pointer"
            >
              Save Branch Settings
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-5">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-8 text-center text-gray-500 text-xs">
              No support tickets currently open.
            </div>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl border border-[#39251F]/15 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-xs text-[#39251F]">{t.ticketNumber}</span>
                    <span className="ml-2 font-bold text-xs text-gray-800">{t.customerName} ({t.customerPhone})</span>
                    <span className="ml-2 text-xs text-[#B85A45] font-semibold">[{t.category}]</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-amber-100 text-amber-800">
                    {t.status}
                  </span>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl space-y-2 text-xs">
                  {t.messages.map((m) => (
                    <div key={m.id} className="border-b last:border-b-0 pb-1">
                      <span className="font-bold">{m.senderName} ({m.senderRole}):</span> {m.message}
                    </div>
                  ))}
                </div>

                {replyTicketId === t.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={ticketReplyText}
                      onChange={(e) => setTicketReplyText(e.target.value)}
                      placeholder="Write staff reply to customer..."
                      className="w-full px-3 py-2 rounded-xl border text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendTicketReply(t.id)}
                        className="px-4 py-1.5 bg-[#39251F] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#B85A45]"
                      >
                        Send Staff Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyTicketId(null)}
                        className="px-3 py-1.5 border text-xs rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReplyTicketId(t.id)}
                    className="text-xs font-bold text-[#B85A45] hover:underline cursor-pointer"
                  >
                    + Reply to Customer
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 6: Feedback */}
      {activeTab === 'feedback' && (
        <div className="space-y-5">
          {feedback.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#39251F]/15 p-8 text-center text-gray-500 text-xs">
              No customer reviews submitted yet.
            </div>
          ) : (
            feedback.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border border-[#39251F]/15 p-5 flex justify-between items-start text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#39251F]">{f.customerName}</span>
                    <div className="flex text-amber-500">
                      {'★'.repeat(f.rating)}
                    </div>
                  </div>
                  <p className="text-gray-700">{f.comment}</p>
                  <span className="text-[10px] text-gray-400">Order Ref: {f.orderId}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 7: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#39251F]">Administrative &amp; Kitchen Audit Trail</h3>
          <div className="divide-y divide-gray-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex justify-between items-start">
                <div>
                  <span className="font-bold text-[#39251F]">{log.action}</span>
                  <span className="text-gray-500 ml-2">by {log.actorName} ({log.actorRole})</span>
                  <p className="text-gray-600 mt-0.5">{log.changeSummary}</p>
                </div>
                <span className="font-mono text-[10px] text-gray-400 shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
