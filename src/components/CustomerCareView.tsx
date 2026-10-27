import React, { useState } from 'react';
import { HelpCircle, Phone, MapPin, Mail, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';

export function CustomerCareView() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [orderNumber, setOrderNumber] = useState('');
  const [category, setCategory] = useState('Order Delay');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createTicket({
        customerName: name.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        orderId: orderNumber.trim() || undefined,
        category,
        message,
      });
      setSubmitted(true);
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit inquiry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-in fade-in duration-200">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B85A45] uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Customer Assistance</span>
        </div>
        <h2 className="text-3xl font-black text-[#39251F]">Waffle Pops &amp; Co. Care Team</h2>
        <p className="text-xs sm:text-sm text-[#39251F]/70">
          We are dedicated to ensuring your Belgian waffle experience is extraordinary. Need help with a current order or delivery?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Contact Info & Branch details */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-[#39251F]/15 p-5 space-y-4 shadow-xs">
            <h3 className="font-bold text-sm text-[#39251F]">Mandadam Kitchen Desk</h3>

            <div className="space-y-3 text-xs text-gray-700">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#B85A45] shrink-0 mt-0.5" />
                <span>
                  Main Road, opposite Krupa Bangalore Bakery Shop, Mandadam, Andhra Pradesh 522503
                  <span className="block text-[10px] text-amber-700 mt-0.5">
                    (Provisional location pending owner confirmation)
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#B85A45] shrink-0" />
                <span>+91 94900 00000 (Kitchen Desk)</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#B85A45] shrink-0" />
                <span>care@wafflepopsandcompany.in</span>
              </div>
            </div>
          </div>

          <div className="bg-[#FFF8EF] rounded-2xl border border-[#39251F]/15 p-5 text-xs space-y-2 text-[#39251F]/80">
            <h4 className="font-bold text-[#39251F]">Order Policy Questions?</h4>
            <p>• Orders can be cancelled directly within the first few minutes while in "Order Placed" state.</p>
            <p>• Once baking starts in our waffle iron, please contact us here for modifications.</p>
            <p>• Cash on Delivery is collected upon handoff at your door or counter.</p>
          </div>
        </div>

        {/* Right: Submit Ticket Form */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-[#39251F]/15 p-6 shadow-xs">
          <h3 className="font-black text-base text-[#39251F] mb-4">Send a Support Message</h3>

          {submitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-sm">Ticket Submitted Successfully!</h4>
              <p className="text-xs text-emerald-800">
                Our kitchen supervisor has received your inquiry and will respond promptly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit phone"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Topic / Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white"
                  >
                    <option value="Order Delay">Order Delay</option>
                    <option value="Incorrect Item">Incorrect Item / Toppings</option>
                    <option value="Payment Inquiry">Payment / COD Issue</option>
                    <option value="Packaging / Quality">Packaging &amp; Dessert Quality</option>
                    <option value="Other">General Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Order # (If applicable)</label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. WP-20261027-1234"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#39251F]/80 mb-1">Message Description *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe how we can assist you..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#39251F] hover:bg-[#B85A45] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {loading ? 'Submitting...' : 'Submit Support Ticket'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
