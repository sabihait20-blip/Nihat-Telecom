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
  
  const t = TRANSLATIONS[lang];

  const currentUser = auth.currentUser;
  const userInitials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : currentUser?.email
    ? currentUser.email.slice(0, 2).toUpperCase()
    : 'FL';
  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const formatCurrency = (amount: number) => {
    if (lang === 'bn') {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const formatted = amount.toLocaleString('bn-BD', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
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
      // Simulate real bank-app balance lookup delay
      setTimeout(() => {
        setIsShimmering(false);
        setShowBalance(true);
      }, 5000); // Wait 500ms for shimmer
    } else {
      setShowBalance(false);
    }
  };

  // Auto hide balance after 5 seconds
  useEffect(() => {
    if (showBalance) {
      const timer = setTimeout(() => {
        setShowBalance(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showBalance]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 px-5 pt-8 pb-16 shadow-2xl rounded-b-[32px]">
      {/* Absolute Decorative Circles */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl -mr-10 -mt-10" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-xl" />

      {/* Top action row */}
      <div className="relative flex items-center justify-between z-10 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg font-display text-white text-lg font-bold">
              {userInitials}
            </div>
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-blue-900 bg-emerald-500" />
          </div>
          <div>
            <h4 className="text-blue-100 text-xs font-semibold tracking-wide block truncate max-w-[130px]">
              {lang === 'bn' ? `হ্যালো, ${userName}` : `Hello, ${userName}`}
            </h4>
            <div className="flex items-center gap-1.5 text-yellow-300 text-[10px] bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full w-fit font-bold border border-white/10 mt-0.5">
              <Sparkles className="h-3 w-3 text-yellow-300" />
              <span>{t.userStatus}</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {/* Language Toggle Button */}
          <button
            onClick={onLanguageToggle}
            id="lang-toggle-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <Globe className="h-3.5 w-3.5 text-blue-200" />
            <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          {/* Notification Icon */}
          <button
            onClick={onNotificationClick}
            id="notification-bell-btn"
            className="relative p-2.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <Bell className="h-4.5 w-4.5 text-white" />
            {unreadNotifications && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero interactive wallet card */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center mt-2 px-1">
        <span className="text-blue-100 text-[10px] uppercase font-bold tracking-[0.2em] mb-2">
          {t.currBalance}
        </span>

        {/* Micro-interactive tap pill */}
        <button
          onClick={handleBalanceTap}
          id="tap-balance-btn"
          className="relative inline-flex items-center justify-between min-w-[220px] h-13 bg-white/10 backdrop-blur-xl border border-white/25 rounded-2xl shadow-xl px-3 cursor-pointer selection:bg-transparent overflow-hidden hover:scale-[1.02] active:scale-98 transition-transform"
        >
          {/* Shimmer overlay block */}
          {isShimmering && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2"
            />
          )}

          <AnimatePresence mode="wait">
            {!showBalance ? (
              <motion.div
                key="hidden"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between w-full pl-3 pr-2"
              >
                <span className="text-white/90 text-sm font-medium tracking-wide">
                  {t.tapToSee}
                </span>
                <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-white">
                  <Eye className="h-4 w-4 animate-pulse" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, type: 'spring', damping: 15 }}
                className="flex items-center justify-between w-full pl-3 pr-2"
              >
                <span className="text-white font-display text-base font-semibold tracking-wide">
                  {formatCurrency(balance)}
                </span>
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <EyeOff className="h-4 w-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Extra account metadata container */}
        <div className="flex gap-2.5 mt-4 items-center">
          <div className="flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/5 backdrop-blur-md px-3 py-1 rounded-full">
            <Coins className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-medium">{t.loyaltyPoints}</span>
          </div>
          <button
            onClick={onAddFundClick}
            id="header-add-fund-btn"
            className="flex items-center gap-1.5 text-[11px] text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-3.5 py-1 rounded-full cursor-pointer font-bold border border-blue-500 shadow-md shadow-blue-500/15"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'টাকা যোগ' : 'Add Fund'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
