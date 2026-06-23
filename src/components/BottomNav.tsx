import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Inbox, User } from 'lucide-react';
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
      id: 'profile' as AppTab, 
      label: lang === 'bn' ? 'আমার অ্যাকাউন্ট' : 'My Account', 
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
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-2 bg-white/95 backdrop-blur-md border-t border-slate-100/80 flex justify-center shadow-[0_-4px_30px_rgba(0,0,0,0.03)] selection:bg-transparent">
      <div className="w-full max-w-md flex items-end justify-around px-2 relative h-14">
        
        {tabs.map((tab) => {
          const Icon = tab.icon;
          
          // Check active state
          // If active tab is 'packages', we also highlight 'profile' (since Packages represent sub-recharges in My bKash)
          const isActive = tab.id === activeTab || (activeTab === 'packages' && tab.id === 'profile');

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              onHoverStart={() => setHoveredTab(tab.id)}
              onHoverEnd={() => setHoveredTab(null)}
              id={`nav-tab-${tab.id}`}
              
              // macOS Dock Icon enlargement & elevation spring physics!
              animate={{
                scale: hoveredTab === tab.id ? 1.18 : 1,
                y: hoveredTab === tab.id ? -5 : 0,
              }}
              whileTap={{ scale: 0.88 }}
              transition={{ 
                type: 'spring', 
                stiffness: 420, 
                damping: 15 
              }}
              className="relative flex flex-col items-center justify-center select-none cursor-pointer focus:outline-none py-1.5 px-3.5 min-w-[72px] z-10"
            >
              {/* Elastic Spring active background pill for regular tabs */}
              {isActive && (
                <motion.div
                  layoutId="active-nav-pink-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  className="absolute inset-0 bg-pink-50/70 rounded-2xl -z-10 border border-pink-100/30"
                />
              )}

              {/* Tab Icon */}
              <Icon
                className={`transition-colors h-5 w-5 mb-1 ${isActive ? 'text-[#e2125d] stroke-[2.5px]' : 'text-slate-400'}`}
              />

              {/* Tab Label */}
              <span
                className={`text-[9.5px] font-black transition-all tracking-tight ${
                  isActive ? 'text-[#e2125d]' : 'text-slate-400'
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
