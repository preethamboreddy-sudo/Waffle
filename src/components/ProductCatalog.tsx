import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Filter, AlertCircle, ShoppingBag } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Category, Product } from '../types';
import { api } from '../services/api';
import { useCart } from '../context/useCart';

interface ProductCatalogProps {
  onCustomize: (product: Product) => void;
}

export function ProductCatalog({ onCustomize }: ProductCatalogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { items, setIsCartOpen, itemCount, total } = useCart();

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, prodRes] = await Promise.all([
          api.getCategories(),
          api.getProducts(false),
        ]);
        setCategories(catRes.categories);
        setProducts(prodRes.products);
      } catch (err: any) {
        setError(err.message || 'Failed to load dessert menu.');
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="menu-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Catalog Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B85A45] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Our Handcrafted Menu</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#39251F] tracking-tight">
            Artisan Belgian Waffles &amp; Chocolate Pops
          </h2>
          <p className="text-xs sm:text-sm text-[#39251F]/70 mt-1 max-w-xl">
            Ironed fresh to order with pure butter batter and dipped in authentic European chocolates.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#39251F]/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search waffles, chocolate pops, toppings..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#39251F]/20 bg-white text-xs sm:text-sm focus:border-[#B85A45] focus:outline-hidden shadow-xs placeholder-[#39251F]/40"
          />
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#39251F] text-[#FFF8EF] shadow-md scale-102'
              : 'bg-[#F5EDE1] text-[#39251F] hover:bg-[#ebdcc8]'
          }`}
        >
          All Desserts ({products.length})
        </button>

        {categories.map((cat) => {
          const count = products.filter((p) => p.categoryId === cat.id).length;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#39251F] text-[#FFF8EF] shadow-md scale-102'
                  : 'bg-[#F5EDE1] text-[#39251F] hover:bg-[#ebdcc8]'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl h-80 border border-[#39251F]/10 p-4 space-y-3">
              <div className="bg-[#39251F]/10 rounded-xl h-44 w-full" />
              <div className="bg-[#39251F]/10 h-4 rounded w-3/4" />
              <div className="bg-[#39251F]/10 h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-xs font-bold">{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#39251F]/15 p-12 text-center text-[#39251F]/60">
          <Sparkles className="w-12 h-12 stroke-1 mx-auto mb-3 text-[#39251F]/30" />
          <h3 className="font-black text-lg text-[#39251F] mb-1">No matching desserts found</h3>
          <p className="text-xs max-w-sm mx-auto mb-4">
            Try adjusting your search query or selecting a different category tab.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 bg-[#39251F] text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onCustomize={onCustomize}
            />
          ))}
        </div>
      )}

      {/* Floating Sticky Mobile Cart Trigger */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-30 max-w-lg mx-auto sm:hidden animate-in slide-in-from-bottom duration-300">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#39251F] text-[#FFF8EF] rounded-2xl p-4 shadow-2xl flex items-center justify-between font-black text-sm border-2 border-[#F5C76A]/40 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#F5C76A]" />
              <span>{itemCount} {itemCount === 1 ? 'item' : 'items'} in Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base text-[#F5C76A]">₹{total.toFixed(2)}</span>
              <span className="text-xs bg-[#B85A45] px-2 py-1 rounded-lg">View Cart &rarr;</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
