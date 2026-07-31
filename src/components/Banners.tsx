import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Language, Operator, PromoBanner } from '../types';
import { TRANSLATIONS } from '../data/translations';

const PROMOS: PromoBanner[] = [
  {
    id: 'promo-1',
    title: '১০% ইনস্ট্যান্ট ক্যাশব্যাক!',
    titleEn: '10% Instant Cashback!',
    desc: 'যেকোনো Teletalk রিচার্জে ১০% ক্যাশব্যাক বোনাস।',
    descEn: 'On any Teletalk mobile recharge transaction.',
    operator: 'Teletalk',
    prefillAmount: 100,
    gradient: 'from-emerald-500/10 via-emerald-600/5 to-transparent border-emerald-500/20',
  },
  {
    id: 'promo-2',
    title: 'সুপার ইন্টারনেট ডিল',
    titleEn: 'Super Internet Offer',
    desc: 'Robi ৫ জিবি প্যাক মাত্র ৪৯ টাকায় ৭ দিন মেয়াদ!',
    descEn: 'Robi 5 GB Internet pack for ৳49 with 7 days.',
    operator: 'Robi',
    prefillAmount: 49,
    gradient: 'from-orange-500/10 via-red-600/5 to-transparent border-orange-500/20',
  },
  {
    id: 'promo-3',
    title: 'জিপি গিফট অফার',
    titleEn: 'Grameenphone Gift offer',
    desc: 'GP ৩০ জিবি ৩০০ মিনিট কার্ড ক্রয়ে নিশ্চিত ক্যাশব্যাক।',
    descEn: 'Get free cashback upon purchasing GP 30GB pack.',
    operator: 'GP',
    prefillAmount: 499,
    gradient: 'from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20',
  }
];

interface BannersProps {
  lang: Language;
  banners?: PromoBanner[];
  onSelectPromo: (operator: Operator, amount: number) => void;
}

export default function Banners({ lang, banners = [], onSelectPromo }: BannersProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const t = TRANSLATIONS[lang];

  const activeBanners = banners.length > 0 ? banners : PROMOS;

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  if (activeBanners.length === 0) return null;

  const activePromo = activeBanners[activeIndex % activeBanners.length];

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-white font-bold text-xs tracking-tight flex items-center gap-1.5 font-display">
          <Sparkles className="h-4 w-4 text-indigo-400 fill-indigo-400/20" />
          <span>{t.promos}</span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            id="promo-prev-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            id="promo-next-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePromo.id || `promo-${activeIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onClick={() => onSelectPromo(activePromo.operator, activePromo.prefillAmount)}
            className={`border rounded-2xl p-4.5 cursor-pointer relative overflow-hidden transition-all group hover:scale-[1.01] hover:shadow-xl min-h-[120px] flex items-center ${
              activePromo.imageUrl 
                ? 'bg-[#0E1422] border-slate-800 text-white' 
                : 'bg-[#131B2E] border-white/10 text-white'
            }`}
          >
            {/* Custom Banner Image if available */}
            {activePromo.imageUrl && (
              <>
                <img 
                  src={activePromo.imageUrl} 
                  alt={activePromo.titleEn} 
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#060911] via-[#060911]/80 to-transparent z-0" />
              </>
            )}

            {/* Operator background initials */}
            {!activePromo.imageUrl && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-5 text-8xl font-black tracking-tighter select-none pointer-events-none text-white">
                {activePromo.operator}
              </div>
            )}

            <div className="flex items-start justify-between relative z-10 gap-3 w-full">
              <div className="space-y-1 max-w-[80%]">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-400">
                    PROMO
                  </span>
                </div>
                <h4 className="text-sm font-bold tracking-tight text-white">
                  {lang === 'bn' ? activePromo.title : activePromo.titleEn}
                </h4>
                <p className="text-xs leading-relaxed font-medium text-slate-300">
                  {lang === 'bn' ? activePromo.desc : activePromo.descEn}
                </p>
              </div>

              <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-md bg-indigo-600 text-white shadow-indigo-600/30 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-4.5 w-4.5 fill-current/20" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
