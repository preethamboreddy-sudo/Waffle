import React from 'react';
import { MapPin, Phone, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#271915] text-[#FFF8EF] border-t border-[#39251F] pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F5C76A] text-[#271915] font-black flex items-center justify-center text-lg">
                W
              </div>
              <h3 className="font-black text-lg text-[#FFF8EF]">WAFFLE POPS &amp; CO.</h3>
            </div>
            <p className="text-xs text-[#FFF8EF]/70 leading-relaxed">
              Authentic Belgian waffles, stuffed chocolate dessert sandwiches, and signature waffle pops ironed fresh with premium cocoa.
            </p>
          </div>

          {/* Launch Branch */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#F5C76A]">
              Initial Launch Branch
            </h4>
            <div className="text-xs text-[#FFF8EF]/80 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F5C76A] shrink-0 mt-0.5" />
                <span>
                  Main Road, opposite Krupa Bangalore Bakery Shop, Mandadam, Andhra Pradesh 522503
                </span>
              </div>
              <div className="text-[11px] text-[#F5C76A] bg-white/5 p-2 rounded-lg border border-white/10">
                ⚠ Address &amp; contact provisional until confirmed by business owner.
              </div>
            </div>
          </div>

          {/* Service & Hours */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#F5C76A]">
              Service &amp; Hours
            </h4>
            <div className="text-xs text-[#FFF8EF]/80 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F5C76A] shrink-0" />
                <span>11:00 AM – 10:30 PM (Daily)</span>
              </div>
              <div>Fulfilment: Doorstep Delivery &amp; Storefront Takeaway</div>
              <div>Estimated Kitchen Prep: ~20 mins</div>
            </div>
          </div>

          {/* Safe Payments & Policies */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#F5C76A]">
              Payments &amp; Terms
            </h4>
            <div className="text-xs text-[#FFF8EF]/80 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Cash on Delivery (COD) Active</span>
              </div>
              <p className="text-[11px] text-[#FFF8EF]/60">
                UPI sandbox mode enabled. Live bank gateways will be activated upon merchant account verification.
              </p>
              <div className="text-[10px] text-[#F5C76A] uppercase font-bold tracking-wider pt-1">
                Prices shown are labeled Demo Data
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center text-xs text-[#FFF8EF]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Waffle Pops and Company. All rights reserved.</p>
          <p className="text-[11px]">Handcrafted in Mandadam, Andhra Pradesh</p>
        </div>
      </div>
    </footer>
  );
}
