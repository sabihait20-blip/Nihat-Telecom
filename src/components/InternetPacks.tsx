import React, { useState } from 'react';
import { Search, Sparkles, Wifi, PhoneCall, Gift, Smartphone, ArrowLeft, ChevronRight, Coins, ChevronDown } from 'lucide-react';
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
      <div className="space-y-3.5 pt-1">
        {filteredPackages.length > 0 ? (
          filteredPackages.map((pkg, idx) => {
            const hasDiscount = pkg.discount && pkg.discount > 0;
            const discountAmt = pkg.discount || 0;
            const regularPrice = pkg.regularPrice || (hasDiscount ? pkg.price + discountAmt : pkg.price);
            const finalPrice = pkg.price;
            
            const opInfo = operatorsList.find(o => o.id === pkg.operator);
            const logoSrc = pkg.imageUrl || opInfo?.logoUrl;

            return (
              <div
                key={`${pkg.id || 'pack'}-${idx}`}
                className="bg-white border border-slate-200/80 rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden flex items-stretch justify-between gap-2.5 hover:shadow-md transition-all group text-slate-900"
              >
                {/* Discount Ribbon at the top right exactly like the image */}
                {hasDiscount && (
                  <div className="absolute right-0 top-0 bg-[#FF5A00] text-white px-3.5 py-1 text-[10px] font-black rounded-bl-xl shadow-sm z-10">
                    discount: ৳{discountAmt}
                  </div>
                )}

                <div className="flex gap-4 items-start flex-1">
                  {/* Left Side: Operator Logo */}
                  <div className="h-14 w-14 md:h-18 md:w-18 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-slate-50 shadow-inner flex items-center justify-center self-start mt-1 relative">
                    {logoSrc ? (
                      <img 
                        src={logoSrc} 
                        alt={pkg.operator} 
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Gift className="h-7 w-7 text-emerald-600" />
                    )}
                  </div>

                  {/* Middle Side: Offer Details */}
                  <div className="space-y-1.5 flex-1 pr-4">
                    {/* Title in Emerald Green exactly like the image */}
                    <h3 className="text-[#00B060] font-black text-sm md:text-base tracking-tight leading-snug">
                      {lang === 'bn' ? pkg.titleBn : pkg.title}
                    </h3>

                    {/* price: 1199 (Red text) */}
                    <div className="text-rose-500 font-extrabold text-xs flex items-center gap-1">
                      <span>price:</span>
                      <span className="font-mono">{regularPrice}</span>
                      <span className="text-[10px] text-slate-400 font-medium ml-2">
                        • {lang === 'bn' ? 'মেয়াদ:' : 'Validity:'} {lang === 'bn' ? pkg.validityBn : pkg.validity}
                      </span>
                    </div>

                    {/* Category Capsule Button Badge in Green and Coins Stack */}
                    <div className="flex flex-col items-start gap-1">
                      <span className="bg-[#00B060] text-white text-[9.5px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                        {lang === 'bn' 
                          ? pkg.category === 'internet' ? 'Internet' : pkg.category === 'talktime' ? 'Bundles' : 'Bundles' 
                          : pkg.category === 'internet' ? 'Internet' : pkg.category === 'talktime' ? 'Voice' : 'Bundles'}
                      </span>

                      {/* Coins Stack Icon */}
                      <div className="flex items-center gap-1.5 text-emerald-600 mt-1">
                        <Coins className="h-4.5 w-4.5 fill-emerald-100" />
                        {hasDiscount && (
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md">
                            {lang === 'bn' ? `কমিশন ৳${discountAmt}` : `Comm ৳${discountAmt}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Buy button and Chevron Down */}
                <div className="flex flex-col items-end justify-between shrink-0 min-w-[105px] pt-4">
                  <button
                    onClick={() => onSelectPackage(pkg.operator, finalPrice)}
                    id={`pkg-buy-${pkg.id}`}
                    className="border-[2px] border-[#00B060] text-[#00B060] hover:bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 bg-white shadow-sm"
                  >
                    <span>buy ৳ {finalPrice}</span>
                  </button>

                  {/* Arrow Down Chevron on bottom right */}
                  <div className="text-slate-300 group-hover:text-emerald-500 transition-colors pt-2">
                    <ChevronDown className="h-5 w-5 stroke-[2.5]" />
                  </div>
                </div>
              </div>
            );
          })
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
