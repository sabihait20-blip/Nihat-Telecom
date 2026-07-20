import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Coins, Bell, Globe, Sparkles, Plus } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { auth } from '../firebase';

interface HeaderProps {
  balance: number;
  lang: Language;
  onLanguageToggle: () => void;
  onNotificationClick: () => void;
  unreadNotifications: boolean;
  onAddFundClick: () => void;
}

export default function Header({
  balance,
  lang,
  onLanguageToggle,
  onNotificationClick,
  unreadNotifications,
  onAddFundClick,
}: HeaderProps) {
  const [showBalance, setShowBalance] = useState(false);
  const [isShimmering, setIsShimmering] = useState(false);
  const [isHovered, setIsHovered] = useState<string | null>(null);
  
  const t = TRANSLATIONS[lang];

  const currentUser = auth.currentUser;
  const userInitials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : currentUser?.email
    ? currentUser.email.slice(0, 2).toUpperCase()
    : 'FL';
  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'গ্রাহক';

  const formatCurrency = (amount: number) => {
    if (lang === 'bn') {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const formatted = amount.toLocaleString('bn-BD', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).replace(/[0-9]/g, (w) => bnDigits[parseInt(w)]);
      return `৳ ${formatted}`;
    }
    return `৳ ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleBalanceTap = () => {
    if (!showBalance) {
      setIsShimmering(true);
      // macOS standard snappy delay
      setTimeout(() => {
        setIsShimmering(false);
        setShowBalance(true);
      }, 450);
    } else {
      setShowBalance(false);
    }
  };

  // Auto-hide balance after 5 seconds to match official bKash behavior
  useEffect(() => {
    if (showBalance) {
      const timer = setTimeout(() => {
        setShowBalance(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showBalance]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-blue-700 via-indigo-600 to-indigo-800 px-5 pt-7 pb-16 shadow-xl rounded-b-[40px] select-none">
      {/* bKash Soccer Stadium/Abstract Festive Light Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent opacity-60 pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-44 h-44 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 -translate-y-1/2 h-20 w-full bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-45 skew-y-12 pointer-events-none" />

      {/* Top Main bKash Header Row */}
      <div className="relative flex items-center justify-between z-10 mb-5">
        <div className="flex items-center gap-3">
          {/* Circular avatar profile picture with pink bKash border */}
          <motion.div 
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="relative cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full border-2 border-white bg-blue-100 overflow-hidden flex items-center justify-center shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" 
                alt="user" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback to initials if unsplash fails
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-sm font-black text-indigo-600 font-sans absolute">
                {userInitials}
              </span>
            </div>
            {/* Active Green Dot */}
            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 animate-pulse" />
          </motion.div>
          
          <div className="flex flex-col">
            <span className="text-white text-xs font-black tracking-tight leading-none drop-shadow-xs">
              {userName}
            </span>
            
            {/* bKash Official Tap Balance capsule box */}
            <div className="mt-1 relative">
              <motion.button
                onClick={handleBalanceTap}
                whileTap={{ scale: 0.95 }}
                className="relative flex items-center bg-white rounded-full p-0.5 pr-3 pl-1 h-7.5 min-w-[145px] shadow-sm select-none outline-none overflow-hidden cursor-pointer active:bg-blue-50"
              >
                {/* Shimmer loading wave */}
                {isShimmering && (
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-600/10 to-transparent w-full pointer-events-none"
                  />
                )}

                {/* Left bKash Pink token containing "৳" symbol */}
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[12.5px] font-black shrink-0 relative overflow-hidden">
                  <span className="leading-none select-none">৳</span>
                </div>

                <AnimatePresence mode="wait">
                  {!showBalance ? (
                    <motion.span
                      key="hidden-balance-text"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="text-indigo-600 font-bold text-[11px] ml-2 tracking-tight select-none grow text-left"
                    >
                      {lang === 'bn' ? 'ব্যালেন্স দেখুন' : 'Tap for Balance'}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="active-balance-num"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                      className="text-indigo-600 font-black font-sans text-[12px] ml-2 grow text-left"
                    >
                      {formatCurrency(balance)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Global Toolbar - beautiful white rounded micro-action icons */}
        <div className="flex items-center gap-2">
          {/* Language Toggle Button */}
          <motion.button
            onClick={onLanguageToggle}
            onHoverStart={() => setIsHovered('lang')}
            onHoverEnd={() => setIsHovered(null)}
            animate={{ scale: isHovered === 'lang' ? 1.12 : 1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 flex items-center justify-center cursor-pointer backdrop-blur-md shadow-md text-white font-black text-xs transition-colors"
            title="ভাষা পরিবর্তন / Switch Language"
          >
            <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </motion.button>

          {/* bKash Icon / Notification bell button */}
          <motion.button
            onClick={onNotificationClick}
            onHoverStart={() => setIsHovered('notif')}
            onHoverEnd={() => setIsHovered(null)}
            animate={{ scale: isHovered === 'notif' ? 1.12 : 1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-10 h-10 rounded-full bg-white text-indigo-600 hover:bg-indigo-50 flex items-center justify-center cursor-pointer shadow-md relative"
          >
            {/* Custom inline-SVG representing official bKash bird logo inside circle */}
            <svg className="w-5.5 h-5.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.09 15.14c-.11.11-.27.18-.44.18s-.33-.07-.44-.18l-3.32-3.32a.614.614 0 0 1 0-.88l1.49-1.49a.614.614 0 0 1 .88 0l.95.95V7.41c0-.34.28-.62.62-.62s.62.28.62.62v6.16l.95-.95a.614.614 0 0 1 .88 0l1.49 1.49a.614.614 0 0 1 0 .88l-3.14 3.15z" className="opacity-10" />
              <path d="M11 16.5h2v-2h-2v2zm1-13.5C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-1-6h2v-5h-2v5z" className="hidden" />
              {/* Fallback cleanly to beautiful Bell representation */}
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            {unreadNotifications && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
            )}
          </motion.button>
        </div>
      </div>


    </div>
  );
}
