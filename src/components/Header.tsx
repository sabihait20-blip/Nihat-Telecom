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

  // Auto-hide balance after 5 seconds
  useEffect(() => {
    if (showBalance) {
      const timer = setTimeout(() => {
        setShowBalance(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showBalance]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#12192E] to-[#0B0F19] px-5 pt-7 pb-16 shadow-2xl rounded-b-[36px] select-none border-b border-white/10">
      {/* Ambient Radial Glow Spots */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-80 pointer-events-none" />

      {/* Top Main Header Row */}
      <div className="relative flex items-center justify-between z-10 mb-5">
        <div className="flex items-center gap-3">
          {/* Avatar with subtle ring */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="relative cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full border border-indigo-500/40 bg-indigo-950/60 overflow-hidden flex items-center justify-center shadow-lg backdrop-blur-md">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" 
                alt="user" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-xs font-black text-indigo-300 font-sans absolute">
                {userInitials}
              </span>
            </div>
            {/* Active Green Dot */}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0D111C] bg-emerald-400 animate-pulse" />
          </motion.div>
          
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold tracking-tight leading-none drop-shadow-xs">
              {userName}
            </span>
            
            {/* Lovable Tap Balance capsule box */}
            <div className="mt-1 relative">
              <motion.button
                onClick={handleBalanceTap}
                whileTap={{ scale: 0.96 }}
                className="relative flex items-center bg-[#1A2338]/90 hover:bg-[#202C46] border border-white/10 rounded-full p-0.5 pr-3 pl-1 h-7.5 min-w-[145px] shadow-lg shadow-black/20 select-none outline-none overflow-hidden cursor-pointer backdrop-blur-md transition-colors"
              >
                {/* Shimmer loading wave */}
                {isShimmering && (
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent w-full pointer-events-none"
                  />
                )}

                {/* Symbol badge */}
                <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-[12px] font-black shrink-0 relative overflow-hidden shadow-sm">
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
                      className="text-indigo-200 font-medium text-[11px] ml-2 tracking-tight select-none grow text-left"
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
                      className="text-white font-black font-sans text-[12px] ml-2 grow text-left"
                    >
                      {formatCurrency(balance)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {/* Language Toggle Button */}
          <motion.button
            onClick={onLanguageToggle}
            onHoverStart={() => setIsHovered('lang')}
            onHoverEnd={() => setIsHovered(null)}
            animate={{ scale: isHovered === 'lang' ? 1.08 : 1 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center cursor-pointer backdrop-blur-md shadow-md text-slate-200 font-bold text-xs transition-colors"
            title="Switch Language"
          >
            <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </motion.button>

          {/* Notification bell button */}
          <motion.button
            onClick={onNotificationClick}
            onHoverStart={() => setIsHovered('notif')}
            onHoverEnd={() => setIsHovered(null)}
            animate={{ scale: isHovered === 'notif' ? 1.08 : 1 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center cursor-pointer backdrop-blur-md shadow-md relative"
          >
            <Bell className="w-4 h-4 text-indigo-200" />
            {unreadNotifications && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
