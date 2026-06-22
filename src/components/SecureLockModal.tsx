import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, Fingerprint, Delete, ShieldAlert, Sparkles, Check, HelpCircle } from 'lucide-react';
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
  
  // Biometric state
  const [showBiometricScan, setShowBiometricScan] = useState<boolean>(false);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(() => {
    return localStorage.getItem('biometric_enabled') !== 'false';
  });

  // Automatically trigger biometric scan on mount if enabled
  useEffect(() => {
    if (biometricEnabled) {
      setTimeout(() => {
        handleBiometricTrigger();
      }, 800);
    }
  }, [biometricEnabled]);

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

  const handleClear = () => {
    setErrorMsg('');
    setPin('');
  };

  const verifyPin = (enteredPin: string) => {
    // Standard Demo Pin
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

  const handleBiometricTrigger = () => {
    setShowBiometricScan(true);
    setBiometricStatus('scanning');
    
    // Simulate high-density biometric scanning animation
    setTimeout(() => {
      // 90% Success rate simulation for ultra realistic feel
      const success = Math.random() < 0.95;
      if (success) {
        setBiometricStatus('success');
        setTimeout(() => {
          setIsUnlocked(true);
          setShowBiometricScan(false);
          onUnlocked();
        }, 800);
      } else {
        setBiometricStatus('failed');
        setTimeout(() => {
          setShowBiometricScan(false);
          setErrorMsg(t.biometricError || 'Biometric verification failed.');
        }, 1200);
      }
    }, 1800);
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

          {/* Biometric trigger on bottom-left */}
          <button
            onClick={handleBiometricTrigger}
            className="h-15 w-15 rounded-full bg-blue-600/10 hover:bg-blue-600/20 active:bg-blue-600/30 border border-blue-500/20 active:scale-95 transition-all flex items-center justify-center text-blue-400 cursor-pointer text-sm"
            title={t.biometricTitle}
          >
            <Fingerprint className="h-6 w-6" />
          </button>

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

        {/* Demo Mode helper */}
        <div className="mt-6 flex justify-center">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <Lock className="h-3 w-3 text-amber-400" />
            <span>{t.demoPinWarning}</span>
          </div>
        </div>
      </div>

      {/* Simulated High-Density Biometric Popup Drawer */}
      <AnimatePresence>
        {showBiometricScan && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-slate-900 border-t border-white/10 rounded-t-[32px] p-6 text-white pb-12 relative shadow-2xl"
            >
              {/* Top Drag Indicator bar */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />

              <div className="flex flex-col items-center text-center">
                <h3 className="text-lg font-bold font-display mb-1">{t.faceTouchId || 'Biometric Scanner'}</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-8">{t.biometricDesc}</p>

                {/* Biometric Interactive scanner visual ring */}
                <div className="relative mb-8 h-28 w-28 flex items-center justify-center">
                  {/* Outer spinning ring when scanning */}
                  {biometricStatus === 'scanning' && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-400 border-b-transparent border-l-transparent"
                    />
                  )}
                  
                  {/* Visual pulse wave circles */}
                  {biometricStatus === 'scanning' && (
                    <motion.div
                      animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.5, 0.1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-2 rounded-full border-2 border-blue-400/30"
                    />
                  )}

                  <div className={`h-22 w-22 rounded-full flex items-center justify-center transition-all ${
                    biometricStatus === 'success'
                      ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                      : biometricStatus === 'failed'
                      ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-450'
                      : 'bg-white/5 border border-white/10 text-blue-400'
                  }`}>
                    {biometricStatus === 'success' ? (
                      <Check className="h-10 w-10 stroke-[2.5]" />
                    ) : (
                      <Fingerprint className={`h-12 w-12 ${biometricStatus === 'scanning' ? 'animate-pulse' : ''}`} />
                    )}
                  </div>
                </div>

                {/* Local status label */}
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  biometricStatus === 'success'
                    ? 'text-emerald-400'
                    : biometricStatus === 'failed'
                    ? 'text-rose-400'
                    : 'text-blue-400 animate-pulse'
                }`}>
                  {biometricStatus === 'scanning' && (lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying Identity...')}
                  {biometricStatus === 'success' && (lang === 'bn' ? 'যাচাইকরণ সফল!' : 'Verified Successfully!')}
                  {biometricStatus === 'failed' && (lang === 'bn' ? 'ব্যর্থ হয়েছে' : 'Verification Failed')}
                </span>

                {/* Cancel option */}
                <button
                  onClick={() => setShowBiometricScan(false)}
                  className="mt-8 text-xs font-bold text-slate-400 hover:text-white px-5 py-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? 'পিন ব্যবহার করুন' : 'Cancel & Use PIN'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
