import React, { useState } from 'react';
import { Plus, Trash2, Heart, Sparkles } from 'lucide-react';
import { FavoriteContact, Language, Operator } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { OPERATORS } from '../data/mockData';

interface FavoritesGridProps {
  favorites: FavoriteContact[];
  onSelectContact: (number: string, operator: Operator) => void;
  onAddContact: (contact: Omit<FavoriteContact, 'id'>) => void;
  onRemoveContact: (id: string) => void;
  lang: Language;
}

export default function FavoritesGrid({
  favorites,
  onSelectContact,
  onAddContact,
  onRemoveContact,
  lang,
}: FavoritesGridProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [operator, setOperator] = useState<Operator>('GP');
  
  const t = TRANSLATIONS[lang];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || number.length < 11) return;

    // Detect operator prefix to guess operator
    let detectedOp = operator;
    const prefix = number.slice(0, 3);
    for (const [opCode, opDetails] of Object.entries(OPERATORS)) {
      if (opDetails.prefixes.includes(prefix)) {
        detectedOp = opCode as Operator;
        break;
      }
    }

    const opColors: Record<Operator, string> = {
      GP: 'from-blue-600 to-sky-400',
      Robi: 'from-orange-500 to-red-400',
      Airtel: 'from-red-600 to-pink-500',
      Banglalink: 'from-amber-500 to-orange-400',
      Teletalk: 'from-emerald-600 to-teal-400',
    };

    onAddContact({
      name,
      number,
      operator: detectedOp,
      color: opColors[detectedOp],
    });

    setName('');
    setNumber('');
    setIsAdding(false);
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // keep only numbers
    if (val.length <= 11) {
      setNumber(val);
    }
  };

  return (
    <div className="mx-4 my-3 px-5 py-4 bg-[#210c31]/90 border border-pink-500/30 rounded-2xl shadow-2xl shadow-pink-950/40 backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-xs tracking-tight flex items-center gap-1.5 font-display">
          <Heart className="h-4 w-4 text-rose-400 fill-rose-400/20" />
          <span>{t.favoriteOperator}</span>
        </h3>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          id="add-fav-toggle-btn"
          className="text-xs font-black text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition-all shadow-sm"
        >
          <Plus className="h-3 w-3 text-rose-300 stroke-[2.5px]" />
          <span>{isAdding ? t.close : t.addFav}</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} id="add-favorite-form" className="mb-4 p-3 bg-slate-950/60 rounded-2xl border border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-pink-200/70 font-bold mb-1">
                {lang === 'bn' ? 'নাম' : 'Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'bn' ? 'নাম লিখুন' : 'e.g. Friends'}
                className="w-full text-xs font-medium bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-rose-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-pink-200/70 font-bold mb-1">
                {lang === 'bn' ? 'নম্বর' : 'Mobile Number'}
              </label>
              <input
                type="text"
                value={number}
                onChange={handlePhoneInputChange}
                placeholder="01712xxxxxx"
                className="w-full text-xs font-medium bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-rose-500 transition-colors font-mono"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
            >
              {t.close}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-[11px] font-black text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-md shadow-pink-950/40 rounded-lg cursor-pointer transition-all"
            >
              {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Horizontal horizontal saved contacts */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
        {favorites.map((fav, index) => (
          <div
            key={`${fav.id || fav.number}-${index}`}
            className="flex flex-col items-center flex-shrink-0 relative group"
            style={{ width: '76px' }}
          >
            {/* Quick action button to trigger recharge */}
            <button
              onClick={() => onSelectContact(fav.number, fav.operator)}
              id={`fav-click-${fav.id}`}
              className={`h-13 w-13 rounded-2xl bg-gradient-to-tr ${fav.color} flex items-center justify-center text-white font-bold text-base shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all text-center relative overflow-hidden border border-white/20`}
            >
              {/* Operator micro layout watermarks */}
              <span className="text-white text-base tracking-tighter drop-shadow-md">
                {fav.name.slice(0, 2).toUpperCase()}
              </span>
              
              {/* Operator code bubble */}
              <span className="absolute bottom-1 right-1 text-[8px] tracking-tight bg-black/30 backdrop-blur-xs font-bold px-1 rounded-sm text-white">
                {fav.operator}
              </span>
            </button>

            <span className="text-[11px] font-medium text-slate-200 mt-2 truncate w-full text-center">
              {fav.name}
            </span>
            <span className="text-[9px] text-pink-300/70 font-semibold font-mono tracking-tighter truncate w-full text-center">
              {fav.number}
            </span>

            {/* Trash button to remove contact on hover/click */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveContact(fav.id);
              }}
              id={`fav-delete-${fav.id}`}
              className="absolute -top-1 -right-1 h-5 w-5 bg-rose-950 border border-rose-500/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-full flex items-center justify-center scale-0 group-hover:scale-100 focus:scale-100 cursor-pointer transition-all shadow-md"
              title="Remove contact"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
