import React from 'react';
import { Sparkles, Clock, Truck, ShieldAlert, Award } from 'lucide-react';
import { useCart } from '../context/useCart';

interface HeroProps {
  onExploreClick: () => void;
}

export function Hero({ onExploreClick }: HeroProps) {
  const { branch, fulfilmentMode } = useCart();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#39251F] via-[#2F1E19] to-[#271915] text-[#FFF8EF] py-12 md:py-16">
      {/* Background ambient waffle pattern glow */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#F5C76A_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Brand Story & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5C76A]/15 border border-[#F5C76A]/30 text-[#F5C76A] text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Authentic Belgian Recipe • Freshly Baked On Order</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#FFF8EF] leading-tight">
              Belgian-Style Waffles &amp;{' '}
              <span className="text-[#F5C76A] underline decoration-[#B85A45] decoration-4 underline-offset-4">
                Signature Chocolate Pops
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#FFF8EF]/80 font-normal leading-relaxed max-w-2xl">
              Freshly ironed golden waffles with deep pockets, stuffed artisan dessert sandwiches, and chocolate-dripping pops on a stick. Prepared in Mandadam with authentic gourmet cocoa.
            </p>

            {/* Branch Service & Policy Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#F5C76A] shrink-0" />
                <div>
                  <div className="text-xs text-[#FFF8EF]/60 font-medium">Estimated Prep</div>
                  <div className="text-sm font-bold text-[#FFF8EF]">~20 Minutes</div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#F5C76A] shrink-0" />
                <div>
                  <div className="text-xs text-[#FFF8EF]/60 font-medium">Fulfilment</div>
                  <div className="text-sm font-bold text-[#FFF8EF]">
                    {fulfilmentMode === 'DELIVERY' ? 'Doorstep Delivery' : 'Quick Takeaway'}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
                <Award className="w-5 h-5 text-[#F5C76A] shrink-0" />
                <div>
                  <div className="text-xs text-[#FFF8EF]/60 font-medium">Minimum Order</div>
                  <div className="text-sm font-bold text-[#FFF8EF]">
                    ₹{branch?.minOrderAmount || 99}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onExploreClick}
                className="bg-[#F5C76A] hover:bg-[#e6b143] text-[#271915] font-extrabold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm"
              >
                Order Now • Explore Menu
              </button>
              <div className="text-xs text-[#FFF8EF]/70 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#F5C76A]" />
                <span>Cash on Delivery (COD) &amp; UPI Sandbox supported</span>
              </div>
            </div>
          </div>

          {/* Right Column: Featured Visual Presentation */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-[#F5C76A]/20 bg-[#39251F]">
                <img
                  src="https://images.unsplash.com/photo-1568051243851-f9b136146e97?auto=format&fit=crop&w=800&q=80"
                  alt="Artisan Belgian Waffle with chocolate drip and berries"
                  className="w-full h-72 sm:h-80 object-cover hover:scale-105 transition-transform duration-500"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                  <div className="inline-flex self-start items-center gap-1.5 bg-[#B85A45] text-white text-[11px] font-black px-2.5 py-1 rounded-md mb-1 shadow-sm uppercase tracking-wider">
                    Signature Creation
                  </div>
                  <h3 className="text-lg font-bold text-white">Midnight Dark Chocolate Waffle Pop</h3>
                  <p className="text-xs text-[#FFF8EF]/80">Belgian dark chocolate glaze, white choc drizzle &amp; toasted crunch</p>
                </div>
              </div>

              {/* Floating review callout badge */}
              <div className="absolute -bottom-4 -left-4 bg-[#FFF8EF] text-[#39251F] border border-[#39251F]/15 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#39251F] text-[#F5C76A] flex items-center justify-center font-bold text-sm">
                  ★ 4.9
                </div>
                <div>
                  <div className="text-xs font-bold text-[#39251F]">Mandadam's Craved Desserts</div>
                  <div className="text-[11px] text-[#39251F]/70">Pure butter batter &amp; real chocolate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
