import React from 'react';
import { motion } from 'motion/react';
import { Home, Package, History, User } from 'lucide-react';
import { AppTab, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  lang: Language;
}

export default function BottomNav({ activeTab, setActiveTab, lang }: BottomNavProps) {
  const t = TRANSLATIONS[lang];

  const tabs = [
    { id: 'home' as AppTab, label: t.home, icon: Home },
    { id: 'packages' as AppTab, label: t.packages, icon: Package },
    { id: 'history' as AppTab, label: t.history, icon: History },
    { id: 'profile' as AppTab, label: t.profile, icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-3 bg-white border-t border-slate-100/80 flex justify-center shadow-[0_-4px_25px_rgba(0,0,0,0.04)]">
      <div className="w-full max-w-md flex items-center justify-between px-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              id={`nav-tab-${tab.id}`}
              className="relative flex flex-col items-center justify-center py-1.5 px-3 min-w-[70px] select-none cursor-pointer focus:outline-none group active:scale-95 transition-transform"
            >
              {/* Highlight background pill */}
              {isActive && (
                <motion.div
                  layoutId="active-nav-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-blue-50/80 rounded-2xl -z-10 border border-blue-100/40"
                />
              )}

              <Icon
                className={`h-5 w-5 mb-1 transition-all group-hover:scale-105 ${
                  isActive ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />

              <span
                className={`text-[10px] font-semibold transition-all tracking-tight ${
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
