import React, { useState } from 'react';
import { Search, Sparkles, Wifi, PhoneCall, Gift, Smartphone, ArrowLeft, ChevronRight } from 'lucide-react';
import { RechargePackage, Language, Operator } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { POPULAR_PACKAGES } from '../data/mockData';

interface InternetPacksProps {
  lang: Language;
  packages?: RechargePackage[];
  onSelectPackage: (operator: Operator, price: number) => void;
}

export default function InternetPacks({ lang, packages = [], onSelectPackage }: InternetPacksProps) {
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [selectedCatFilter, setSelectedCatFilter] = useState<'all' | 'internet' | 'talktime' | 'bundle'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const t = TRANSLATIONS[lang];
  const activePackages = packages.length > 0 ? packages : POPULAR_PACKAGES;

  const operatorsList: { id: Operator; name: string; color: string; bg: string; border: string; logoText: string; logoUrl?: string; subtitle: string }[] = [
    { id: 'GP', name: 'Grameenphone (GP)', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', logoText: 'GP', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyiCDBLtL9jT33e-HTKAFIcAlBPYeXVdUOD3oYfZNSvg&s', subtitle: lang === 'bn' ? 'সেরা ইন্টারনেট ও মিনিট প্যাক' : 'Best Data & Talktime' },
    { id: 'Robi', name: 'Robi', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', logoText: 'Robi', logoUrl: 'https://www.pestcontrolbd.com/images/clients/robi.jpg', subtitle: lang === 'bn' ? 'সাশ্রয়ী বান্ডেল ও ইন্টারনেট' : 'Affordable Bundles' },
    { id: 'Airtel', name: 'Airtel', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', logoText: 'airtel', logoUrl: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh5Mh4tvDmcjk6p06PpIFJeJSG7jyhKNjR86O2wi99p4LBWVnZXzvJFMhPh5zeuv3WswYBKq31Mr39Vhl4Y2DHjBEl0onYye0GhMkCVMrq4ih70SG6eput1CIUJZz3RsatTjPeGfZ1t8JU/s1600/airtel.jpg', subtitle: lang === 'bn' ? 'ফাস্ট ইন্টারনেট অফার' : 'High Speed Internet' },
    { id: 'Banglalink', name: 'Banglalink', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', logoText: 'bl', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1DItgAvyfRdQcnJff6yXYbEYPMlK5xJqG2kBKQSpLKg&s=10', subtitle: lang === 'bn' ? 'স্পেশাল ইন্টারনেট ড্রাইভ' : 'Special Drive Offers' },
    { id: 'Teletalk', name: 'Teletalk', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', logoText: 'Teletalk', logoUrl: 'https://play-lh.googleusercontent.com/ktYMmQ1zZln_WczGHsx0xXtzf-G1Mx8qUJl878-u6iQDGfEdjnWZTIAlpSVLLVgYFNKRgTE0l70nrZxZr6xLcec', subtitle: lang === 'bn' ? 'সরকারি নেটওয়ার্ক অফার' : 'Govt Network Offers' },
  ];

  // If no operator is selected yet, show Operator Selection grid with logos as requested!
  if (!selectedOperator) {
    return (
      <div className="space-y-4 px-4 py-2 pb-24 text-white">
        <div className="space-y-1">
          <h2 className="text-white font-bold text-base tracking-tight font-display">
            {lang === 'bn' ? 'অপারেটর সিলেক্ট করুন' : 'Select Operator'}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {lang === 'bn' ? 'আপনার পছন্দের মোবাইল অপারেটর নির্বাচন করে আজকের সেরা অফারগুলো দেখুন' : 'Choose your mobile operator to browse exclusive packs'}
          </p>
        </div>

        {/* Operator Cards Grid with Logos */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          {operatorsList.map((op) => {
            const count = activePackages.filter(p => p.operator === op.id).length;
            return (
              <button
                key={op.id}
                onClick={() => setSelectedOperator(op.id)}
                className={`p-4 bg-[#131B2E] hover:bg-slate-800/80 border ${op.border} rounded-2xl flex items-center justify-between transition-all cursor-pointer group shadow-lg active:scale-[0.99]`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`h-12 w-12 rounded-2xl ${op.bg} ${op.color} border ${op.border} flex items-center justify-center font-black font-mono text-base shadow-inner group-hover:scale-105 transition-transform overflow-hidden`}>
                    {op.logoUrl ? (
                      <img src={op.logoUrl} alt={op.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      op.logoText
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">
                      {op.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {op.subtitle} • <span className="text-indigo-400 font-bold">{count} {lang === 'bn' ? 'টি প্যাক' : 'Packs'}</span>
                    </p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Filter packages for selected operator
  const filteredPackages = activePackages.filter((pkg) => {
    const matchOp = pkg.operator === selectedOperator;
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

  const categoriesList = [
    { id: 'all' as const, label: lang === 'bn' ? 'সব অফার' : 'All Offers', icon: Smartphone },
    { id: 'internet' as const, label: lang === 'bn' ? 'ইন্টারনেট' : 'Internet', icon: Wifi },
    { id: 'talktime' as const, label: lang === 'bn' ? 'টকটাইম' : 'Voice', icon: PhoneCall },
    { id: 'bundle' as const, label: lang === 'bn' ? 'বান্ডেল' : 'Bundles', icon: Gift },
  ];

  const currentOpInfo = operatorsList.find(o => o.id === selectedOperator) || operatorsList[0];

  return (
    <div className="space-y-4 px-4 py-2 pb-24 text-white">
      {/* Header section with Back button & operator badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={() => setSelectedOperator(null)}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-[#131B2E] border border-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-indigo-400" />
          <span>{lang === 'bn' ? 'অন্য অপারেটর' : 'Change Operator'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-xl text-xs font-black ${currentOpInfo.bg} ${currentOpInfo.color} border ${currentOpInfo.border}`}>
            {currentOpInfo.name}
          </span>
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

      {/* Category Grid Filter Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {categoriesList.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCatFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatFilter(cat.id)}
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
          <div className="text-center py-12 bg-[#131B2E] border border-slate-800 rounded-2xl space-y-2">
            <Smartphone className="h-8 w-8 text-slate-500 mx-auto" />
            <p className="text-slate-400 text-xs font-bold">
              {lang === 'bn' ? 'এই অপারেটরের কোনো প্যাকেজ পাওয়া যায়নি।' : 'No packages found for this operator.'}
            </p>
            <button
              onClick={() => setSelectedOperator(null)}
              className="text-xs text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              {lang === 'bn' ? 'অন্য অপারেটর নির্বাচন করুন' : 'Select another operator'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
