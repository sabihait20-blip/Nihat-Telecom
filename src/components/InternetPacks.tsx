import React, { useState } from 'react';
import { Search, Sparkles, Wifi, PhoneCall, Gift, Smartphone } from 'lucide-react';
import { RechargePackage, Language, Operator } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { POPULAR_PACKAGES } from '../data/mockData';

interface InternetPacksProps {
  lang: Language;
  onSelectPackage: (operator: Operator, price: number) => void;
}

export default function InternetPacks({ lang, onSelectPackage }: InternetPacksProps) {
  const [selectedOpFilter, setSelectedOpFilter] = useState<Operator | 'ALL'>('ALL');
  const [selectedCatFilter, setSelectedCatFilter] = useState<'all' | 'internet' | 'talktime' | 'bundle'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const t = TRANSLATIONS[lang];

  // Filter packages based on Operator, Category, and text query
  const filteredPackages = POPULAR_PACKAGES.filter((pkg) => {
    const matchOp = selectedOpFilter === 'ALL' || pkg.operator === selectedOpFilter;
    const matchCat = selectedCatFilter === 'all' || pkg.category === selectedCatFilter;
    
    const textQuery = searchQuery.toLowerCase();
    const matchSearch =
      pkg.title.toLowerCase().includes(textQuery) ||
      pkg.titleBn.toLowerCase().includes(textQuery) ||
      pkg.description.toLowerCase().includes(textQuery) ||
      pkg.descriptionBn.toLowerCase().includes(textQuery);

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
    <div className="space-y-4 px-4 py-2 pb-24">
      {/* Header section with search bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 font-extrabold text-base tracking-tight font-display">
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
            className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-blue-500 transition-colors shadow-xs text-slate-800"
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
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
              className={`py-2 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight text-center ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* List layout of matching cellular package cards */}
      <div className="space-y-3 pt-1">
        {filteredPackages.length > 0 ? (
          filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-blue-100 hover:shadow-md transition-all group"
            >
              {/* Operator specific micro logo tab on top-right */}
              <div className="absolute right-0 top-0 h-6 px-3 bg-slate-900 text-white text-[9px] font-bold flex items-center rounded-bl-xl tracking-wide">
                {pkg.operator}
              </div>

              <div className="space-y-1 pr-10">
                <div className="flex items-center gap-1.5">
                  {pkg.isPopular && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-500/12 text-amber-600 border border-amber-500/10 px-2 py-0.5 rounded-md">
                      <Sparkles className="h-2.5 w-2.5 fill-amber-500/10" />
                      {t.popularBadge}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {lang === 'bn' ? pkg.category === 'internet' ? 'ইন্টারনেট' : pkg.category === 'talktime' ? 'ভয়েস কল' : 'বান্ডেল' : pkg.category}
                  </span>
                </div>

                <h3 className="text-slate-900 font-bold text-sm tracking-tight font-display">
                  {lang === 'bn' ? pkg.titleBn : pkg.title}
                </h3>
                
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {lang === 'bn' ? pkg.descriptionBn : pkg.description}
                </p>
              </div>

              {/* Card Footer pricing row */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    {lang === 'bn' ? 'মেয়াদ' : 'Validity'}
                  </span>
                  <p className="text-slate-800 text-xs font-bold font-display">
                    {lang === 'bn' ? pkg.validityBn : pkg.validity}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      {lang === 'bn' ? 'মূল্য' : 'Price'}
                    </span>
                    <span className="text-blue-600 font-display font-extrabold text-sm">
                      ৳{pkg.price}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectPackage(pkg.operator, pkg.price)}
                    id={`pkg-buy-${pkg.id}`}
                    className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/12 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {lang === 'bn' ? 'কিনুন' : 'Buy'}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-white border border-slate-100 rounded-2xl">
            <p className="text-slate-500 text-xs font-bold">
              {lang === 'bn' ? 'কোনো প্যাকেজ পাওয়া যায়নি।' : 'No packages match selected filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
