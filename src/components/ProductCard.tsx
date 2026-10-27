import React from 'react';
import { Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onCustomize: (product: Product) => void;
}

export function ProductCard({ product, onCustomize }: ProductCardProps) {
  const isAvailable = product.isAvailable;

  return (
    <div className="group bg-[#FFF8EF] rounded-2xl border border-[#39251F]/15 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Product Image Container */}
        <div className="relative aspect-4/3 overflow-hidden bg-[#39251F]/5">
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
              !isAvailable ? 'grayscale opacity-60' : ''
            }`}
            loading="lazy"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            {product.isFeatured && (
              <span className="bg-[#B85A45] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />
                Signature
              </span>
            )}
            {product.isDemoPrice && (
              <span className="bg-[#39251F]/80 backdrop-blur-xs text-[#F5C76A] text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-[#F5C76A]/40 uppercase tracking-widest">
                DEMO PRICE
              </span>
            )}
          </div>

          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider px-3 py-1.5 rounded-md shadow-md">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-extrabold text-base sm:text-lg text-[#39251F] group-hover:text-[#B85A45] transition-colors line-clamp-1">
              {product.name}
            </h3>
          </div>

          <p className="text-xs text-[#39251F]/70 line-clamp-2 leading-relaxed mb-4">
            {product.description}
          </p>

          {/* Options hints */}
          {(product.variants.length > 0 || product.addons.length > 0) && (
            <div className="text-[11px] font-semibold text-[#B85A45] flex items-center gap-1 mb-2">
              <span>★ Customizable:</span>
              <span className="text-[#39251F]/60">
                {product.variants.length > 0 ? `${product.variants.length} Sizes` : ''}
                {product.variants.length > 0 && product.addons.length > 0 ? ' • ' : ''}
                {product.addons.length > 0 ? `${product.addons.length} Add-ons` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Add to Cart Action */}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 border-t border-[#39251F]/10 flex items-center justify-between gap-2 mt-auto">
        <div>
          <div className="text-[10px] text-[#39251F]/60 font-semibold uppercase tracking-wider">Starts at</div>
          <div className="text-base sm:text-lg font-black font-mono text-[#39251F]">
            ₹{Number(product.basePrice).toFixed(2)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => isAvailable && onCustomize(product)}
          disabled={!isAvailable}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            isAvailable
              ? 'bg-[#39251F] hover:bg-[#B85A45] text-[#FFF8EF] shadow-sm hover:shadow-md active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          aria-label={`Customize ${product.name}`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{product.variants.length > 0 || product.addons.length > 0 ? 'Customize & Add' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  );
}
