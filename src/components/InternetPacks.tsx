import React, { useState } from 'react';
import { Search, Sparkles, Wifi, PhoneCall, Gift, Smartphone } from 'lucide-react';
import { RechargePackage, Language, Operator } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { POPULAR_PACKAGES } from '../data/mockData';

interface InternetPacksProps {
  lang: Language;
  packages?: RechargePackage[];
  onSelectPackage: (operator: Operator, price: number) => void;
}

export default function InternetPacks({ lang, packages = [], onSelectPackage }: InternetPacksProps) {
  const [selectedOpFilter, setSelectedOpFilter] = useState<Operator | 'ALL'>('ALL');
  const [selectedCatFilter, setSelectedCatFilter] = useState<'all' | 'internet' | 'talktime' | 'bundle'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const t = TRANSLATIONS[lang];

  const activePackages = packages.length > 0 ? packages : POPULAR_PACKAGES;

  // Filter packages based on Operator, Category, and text query
  const filteredPackages = activePackages.filter((pkg) => {
    const matchOp = selectedOpFilter === 'ALL' || pkg.operator === selectedOpFilter;
    const matchCat = selectedCatFilter === 'all' || pkg.category === selectedCatFilter;
    
    const textQuery = searchQuery ? searchQuery.toLowerCase() : '';
    const pkgTitle = pkg.title || '';
    const pkgTitleBn = pkg.titleBn || '';
    const pkgDesc = pkg.description || '';
    const pkgDescBn = pkg.descriptionBn || '';

    const matchSearch =
      pkgTitle.toLowerCase().includes(textQuery) ||
      pkgTitleBn.toLowerCase().includes(textQuery) ||
      pkgDesc.toLowerCase().includes(textQuery) ||
      pkgDescBn.toLowerCase().includes(textQuery);

    return matchOp && matchCat && matchSearch;
  });

  const operatorsList: (Operator | 'ALL')[] = ['ALL', 'GP', 'Robi', 'Airtel', 'Banglalink', 'Teletalk'];
  const categoriesList = [
    { id: 'all' as const, label: lang === 'bn' ? 'সব অফার' : 'All Offers', icon: Smartphone },
    { id: 'internet' as const, label: lang === 'bn' ? 'ইন্টারনেট' : 'Internet', icon: Wifi },
    { id: 'talktime' as const, label: lang === 'bn' ? 'টকটাইম' : 'Voice', icon: PhoneCall },
    { id: 'bundle' as const, label: lang === 'bn' ? 'বান্ডেল' : 'Bundles', icon: Gift },
  ];

  return (
    <div className="space-y-4 px-4 py-2 pb-24 text-white">
      {/* Header section with search bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base tracking-tight font-display">
              {t.availableOffers}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {lang === 'bn' ? 'সহজে সেরা ডিল চেক করুন ও রিচার্জ করুন' : 'Find localized voice, data and talktime packages'}
            </p>
          </div>
        </div>

        {/* Search bar widget */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPack}
            className="w-full bg-[#131B2E] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Operator Horizontal Pill Filters */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {operatorsList.map((op) => {
          const isActive = selectedOpFilter === op;
          return (
            <button
              key={op}
              onClick={() => setSelectedOpFilter(op)}
              id={`pack-op-filter-${op}`}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-[#131B2E] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {op === 'ALL' ? t.allOperators : op}
            </button>
          );
        })}
      </div>

      {/* Category Grid Filter Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {categoriesList.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCatFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatFilter(cat.id)}
              id={`pack-cat-filter-${cat.id}`}
              className={`py-2.5 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'border-indigo-500/40 bg-indigo-600/20 text-indigo-300 shadow-sm'
                  : 'border-slate-800/80 bg-[#131B2E] text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight text-center ${isActive ? 'text-indigo-300' : 'text-slate-400'}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* List layout of matching cellular package cards */}
      <div className="space-y-3 pt-1">
        {filteredPackages.length > 0 ? (
          filteredPackages.map((pkg, idx) => (
            <div
              key={`${pkg.id || 'pack'}-${idx}`}
              className="bg-[#131B2E] border border-white/10 rounded-2xl p-4 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-indigo-500/30 transition-all group"
            >
              {/* Operator specific micro logo tab on top-right */}
              <div className="absolute right-0 top-0 h-6 px-3 bg-slate-900/90 text-indigo-400 border-b border-l border-white/10 text-[9px] font-bold flex items-center rounded-bl-xl tracking-wide">
                {pkg.operator}
              </div>

              <div className="flex gap-4">
                {pkg.imageUrl && (
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-sm self-start mt-1 bg-slate-900">
                    <img 
                      src={pkg.imageUrl} 
                      alt={pkg.title} 
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1 pr-10 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pkg.isPopular && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                        <Sparkles className="h-2.5 w-2.5" />
                        {t.popularBadge}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {lang === 'bn' ? pkg.category === 'internet' ? 'ইন্টারনেট' : pkg.category === 'talktime' ? 'ভয়েস কল' : 'বান্ডেল' : pkg.category}
                    </span>
                  </div>

                  <h3 className="text-white font-bold text-sm tracking-tight font-display">
                    {lang === 'bn' ? pkg.titleBn : pkg.title}
                  </h3>
                  
                  <p className="text-slate-300 text-xs leading-relaxed font-medium">
                    {lang === 'bn' ? pkg.descriptionBn : pkg.description}
                  </p>
                </div>
              </div>

              {/* Card Footer pricing row */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    {lang === 'bn' ? 'মেয়াদ' : 'Validity'}
                  </span>
                  <p className="text-slate-200 text-xs font-bold font-display">
                    {lang === 'bn' ? pkg.validityBn : pkg.validity}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      {lang === 'bn' ? 'মূল্য' : 'Price'}
                    </span>
                    <span className="text-indigo-400 font-display font-black text-sm">
                      ৳{pkg.price}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectPackage(pkg.operator, pkg.price)}
                    id={`pkg-buy-${pkg.id}`}
                    className="h-9 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {lang === 'bn' ? 'কিনুন' : 'Buy'}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-[#131B2E] border border-slate-800 rounded-2xl">
            <p className="text-slate-400 text-xs font-bold">
              {lang === 'bn' ? 'কোনো প্যাকেজ পাওয়া যায়নি।' : 'No packages match selected filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
