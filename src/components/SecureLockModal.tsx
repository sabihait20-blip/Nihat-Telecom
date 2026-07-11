import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, Delete, ShieldAlert, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface SecureLockModalProps {
  lang: Language;
  onUnlocked: () => void;
}

export default function SecureLockModal({ lang, onUnlocked }: SecureLockModalProps) {
  const t = TRANSLATIONS[lang];
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setErrorMsg('');
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-submit when length reaches 4
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const verifyPin = (enteredPin: string) => {
    const savedPin = localStorage.getItem('secure_wallet_pin') || '1234';
    
    if (enteredPin === savedPin) {
      setIsUnlocked(true);
      setTimeout(() => {
        onUnlocked();
      }, 500);
    } else {
      setShake(true);
      setErrorMsg(t.wrongPin || 'Incorrect PIN! Please try again.');
      setPin('');
      setTimeout(() => {
        setShake(false);
      }, 600);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {/* Decorative gradient glowing spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />

      {/* Top Banner Status Bar Info */}
      <div className="px-8 pt-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 font-mono">
            SECURE ACCESS SHIELD v4.1
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-300 text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold">
          <Sparkles className="h-3 w-3 text-yellow-300" />
          <span>{lang === 'bn' ? 'সুরক্ষিত ওয়ালেট' : 'Protected Wallet'}</span>
        </div>
      </div>

      {/* Main Lock Status Graphic */}
      <div className="flex flex-col items-center justify-center flex-1 py-4 relative z-10">
        <motion.div 
          animate={isUnlocked ? { scale: [1, 1.2, 0.9], opacity: 0 } : {}}
          className="relative h-20 w-20 bg-white/5 border border-white/15 rounded-[24px] flex items-center justify-center shadow-lg backdrop-blur-xl mb-4"
        >
          {isUnlocked ? (
            <Unlock className="h-8 w-8 text-emerald-400 animate-bounce" />
          ) : (
            <Lock className="h-8 w-8 text-blue-400" />
          )}
        </motion.div>

        <h2 className="text-xl font-bold tracking-tight mb-1 font-display">
          {t.appName} {lang === 'bn' ? 'নিরাপত্তা লক' : 'Security Lock'}
        </h2>
        <p className="text-xs text-slate-400 text-center px-8 leading-relaxed max-w-xs mb-6">
          {t.pinRequired}
        </p>

        {/* PIN Bubble Indicators */}
        <motion.div 
          animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="flex gap-4 justify-center items-center mb-6"
        >
          {[0, 1, 2, 3].map((index) => {
            const isActive = pin.length > index;
            return (
              <div
                key={index}
                className={`h-4.5 w-4.5 rounded-full border-2 transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-500 border-blue-400 scale-110 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                    : 'border-slate-600 bg-slate-800/80'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Localized Error Messages */}
        <div className="h-6">
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-rose-400 text-xs font-bold font-display px-6 text-center max-w-sm flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Numerical Keypad Panel */}
      <div className="bg-slate-900/60 border-t border-white/5 pb-10 pt-6 px-10 relative z-10 rounded-t-[40px] shadow-[0_-15px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="max-w-xs mx-auto grid grid-cols-3 gap-y-4 gap-x-6 justify-items-center">
          {/* Numbers 1-9 */}
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-15 w-15 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 active:scale-95 transition-all flex items-center justify-center text-xl font-bold font-display cursor-pointer"
            >
              {num}
            </button>
          ))}

          {/* Spacer to replace fingerprint trigger symmetrically */}
          <div className="h-15 w-15 rounded-full flex items-center justify-center text-slate-600" />

          {/* Number 0 */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-15 w-15 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 active:scale-95 transition-all flex items-center justify-center text-xl font-bold font-display cursor-pointer"
          >
            0
          </button>

          {/* Delete backspace on bottom-right */}
          <button
            onClick={handleBackspace}
            className="h-15 w-15 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 active:scale-95 transition-all flex items-center justify-center text-slate-400 cursor-pointer"
            title="Delete"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
