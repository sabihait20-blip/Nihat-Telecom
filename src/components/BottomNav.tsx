import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Inbox, User, ShoppingBag, Gift } from 'lucide-react';
import { AppTab, Language } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  lang: Language;
}

export default function BottomNav({ activeTab, setActiveTab, lang }: BottomNavProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const tabs = [
    { 
      id: 'home' as AppTab, 
      label: lang === 'bn' ? 'হোম' : 'Home', 
      icon: Home 
    },
    { 
      id: 'store' as AppTab, 
      label: lang === 'bn' ? 'স্টোর' : 'Store', 
      icon: ShoppingBag 
    },
    { 
      id: 'profile' as AppTab, 
      label: lang === 'bn' ? 'অ্যাকাউন্ট' : 'Account', 
      icon: User 
    },
    { 
      id: 'history' as AppTab, 
      label: lang === 'bn' ? 'ইনবক্স' : 'Inbox', 
      icon: Inbox 
    }
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id as AppTab);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-2 bg-[#0B0F19]/90 backdrop-blur-xl border-t border-slate-800/80 flex justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.5)] selection:bg-transparent">
      <div className="w-full max-w-md flex items-end justify-around px-2 relative h-14">
        
        {tabs.map((tab) => {
          const Icon = tab.icon;
          
          const isActive = tab.id === activeTab || 
                           (activeTab === 'packages' && tab.id === 'profile');

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              onHoverStart={() => setHoveredTab(tab.id)}
              onHoverEnd={() => setHoveredTab(null)}
              id={`nav-tab-${tab.id}`}
              
              animate={{
                scale: hoveredTab === tab.id ? 1.12 : 1,
                y: hoveredTab === tab.id ? -3 : 0,
              }}
              whileTap={{ scale: 0.92 }}
              transition={{ 
                type: 'spring', 
                stiffness: 420, 
                damping: 15 
              }}
              className="relative flex flex-col items-center justify-center select-none cursor-pointer focus:outline-none py-1.5 px-3.5 min-w-[72px] z-10"
            >
              {/* Active glowing pill */}
              {isActive && (
                <motion.div
                  layoutId="active-nav-indigo-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  className="absolute inset-0 bg-indigo-500/15 rounded-2xl -z-10 border border-indigo-500/30 shadow-sm shadow-indigo-500/20"
                />
              )}

              {/* Tab Icon */}
              <Icon
                className={`transition-colors h-5 w-5 mb-1 ${isActive ? 'text-indigo-400 stroke-[2.25px]' : 'text-slate-400'}`}
              />

              {/* Tab Label */}
              <span
                className={`text-[10px] font-bold transition-all tracking-tight ${
                  isActive ? 'text-indigo-300' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
