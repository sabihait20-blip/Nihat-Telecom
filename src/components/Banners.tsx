import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Language, Operator } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface PromoBanner {
  id: string;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  operator: Operator;
  prefillAmount: number;
  gradient: string;
}

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
  onSelectPromo: (operator: Operator, amount: number) => void;
}

export default function Banners({ lang, onSelectPromo }: BannersProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const t = TRANSLATIONS[lang];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % PROMOS.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + PROMOS.length) % PROMOS.length);
  };

  const activePromo = PROMOS[activeIndex];

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-slate-900 font-extrabold text-xs tracking-tight flex items-center gap-1.5 font-display">
          <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
          <span>{t.promos}</span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            id="promo-prev-btn"
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            id="promo-next-btn"
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePromo.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onClick={() => onSelectPromo(activePromo.operator, activePromo.prefillAmount)}
            className={`border border-slate-100 rounded-[28px] p-5 cursor-pointer relative overflow-hidden bg-gradient-to-r ${activePromo.gradient} transition-all group hover:scale-[1.01] hover:shadow-md`}
          >
            {/* Operator background initials */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10 text-9xl font-bold tracking-tighter select-none pointer-events-none">
              {activePromo.operator}
            </div>

            <div className="flex items-start justify-between relative z-10 gap-3">
              <div className="space-y-1 max-w-[80%]">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">
                    PROMO
                  </span>
                </div>
                <h4 className="text-slate-900 text-sm font-bold tracking-tight">
                  {lang === 'bn' ? activePromo.title : activePromo.titleEn}
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {lang === 'bn' ? activePromo.desc : activePromo.descEn}
                </p>
              </div>

              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform duration-300">
                <Zap className="h-4.5 w-4.5 fill-white/10" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
