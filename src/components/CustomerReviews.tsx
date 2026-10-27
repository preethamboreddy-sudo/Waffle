import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Feedback } from '../types';

export function CustomerReviews() {
  const [reviews, setReviews] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await api.getFeedback();
        setReviews(res.feedback);
      } catch (err) {
        console.warn('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-in fade-in duration-200">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B85A45] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real Guest Experiences</span>
        </div>
        <h2 className="text-3xl font-black text-[#39251F]">What Mandadam Is Saying</h2>
        <p className="text-xs sm:text-sm text-[#39251F]/70">
          Authentic customer ratings and comments submitted after completed orders.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border p-4" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#39251F]/15 p-12 text-center text-[#39251F]/60">
          <Star className="w-10 h-10 text-amber-400 mx-auto mb-2" />
          <h3 className="font-bold text-base text-[#39251F]">Be the first to review!</h3>
          <p className="text-xs mt-1">Complete an order to share your waffle pop experience.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl border border-[#39251F]/15 p-5 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#39251F]">{rev.customerName}</span>
                <div className="flex text-amber-400 text-sm">
                  {'★'.repeat(rev.rating)}
                </div>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed italic">"{rev.comment}"</p>
              <div className="text-[10px] text-gray-400 font-mono">
                Verified Order • {new Date(rev.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
