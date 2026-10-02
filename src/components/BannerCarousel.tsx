import React, { useState, useEffect } from 'react';
import { Zap, ArrowRight, ShieldCheck, Smartphone, ShoppingBag } from 'lucide-react';
import { ProductCategory } from '../types';

interface BannerCarouselProps {
  onSelectCategory: (cat: ProductCategory) => void;
  onOpenSellerOnboarding: () => void;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  onSelectCategory,
  onOpenSellerOnboarding,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      badge: '⚡ Nationwide Deals',
      title: 'Up to 35% OFF Smartphones & Laptops',
      subtitle: 'Official warranty from verified sellers with swift express delivery across Uganda.',
      cta: 'Shop Tech Deals',
      category: 'Phones & Tablets' as ProductCategory,
      bgGradient: 'from-orange-600 via-amber-600 to-amber-700',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 2,
      badge: '🌿 Farm Fresh & Organics',
      title: 'Organic Produce & Mount Elgon Coffee',
      subtitle: 'Straight from certified Ugandan farms to your doorstep with guaranteed freshness.',
      cta: 'Explore Groceries',
      category: 'Supermarket & Groceries' as ProductCategory,
      bgGradient: 'from-emerald-700 via-teal-700 to-cyan-800',
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 3,
      badge: '🚀 Countrywide Fast Delivery',
      title: 'Tech, Fashion & Everyday Essentials',
      subtitle: 'Reliable dispatch directly to your doorstep in Kampala, Wakiso, Jinja, Mbale, and nationwide.',
      cta: 'Shop Trending Gear',
      category: 'Computing & IT' as ProductCategory,
      bgGradient: 'from-purple-700 via-indigo-700 to-blue-800',
      image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 4,
      badge: '📱 MTN MoMo & Airtel Money',
      title: 'Seamless Mobile Money Checkout',
      subtitle: 'Zero withdrawal fees when you pay directly via your MTN MoMo or Airtel Money number.',
      cta: 'Shop Electronics',
      category: 'Electronics & Audio' as ProductCategory,
      bgGradient: 'from-blue-700 via-indigo-700 to-slate-900',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=700&q=80',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[currentSlide];

  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg bg-linear-to-r text-white mb-5 sm:mb-6 w-full max-w-full">
      <div className={`p-4 sm:p-8 md:p-10 bg-linear-to-r ${slide.bgGradient} transition-all duration-700`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">
          <div className="space-y-3 sm:space-y-4 max-w-lg">
            <span className="inline-block text-[10px] sm:text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-white shadow-xs">
              {slide.badge}
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black leading-snug tracking-tight">
              {slide.title}
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {slide.subtitle}
            </p>
            <div className="pt-1 sm:pt-2 flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => onSelectCategory(slide.category)}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <span>{slide.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={onOpenSellerOnboarding}
                className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-black/20 hover:bg-black/30 backdrop-blur-xs text-white border border-white/30 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
              >
                Sell on SwiftCart
              </button>
            </div>
          </div>

          <div className="hidden md:flex justify-end">
            <div className="relative w-72 h-72 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 transform rotate-1 hover:rotate-0 transition-transform">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="flex gap-2 justify-center mt-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === i ? 'w-8 bg-white' : 'w-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
