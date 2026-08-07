import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Smartphone, Share, PlusSquare, ArrowDown, CheckCircle2, 
  Sparkles, ShieldCheck, Zap, Download, Bell, WifiOff
} from 'lucide-react';
import { Language } from '../types';

interface PwaInstallModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  deferredInstallPrompt: any;
  isPwaInstalled: boolean;
  onAppInstalled?: () => void;
}

export default function PwaInstallModal({
  lang,
  isOpen,
  onClose,
  deferredInstallPrompt,
  isPwaInstalled,
  onAppInstalled
}: PwaInstallModalProps) {
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      const iosDevice = /iPhone|iPad|iPod/.test(ua);
      setIsIos(iosDevice);
    }
  }, []);

  if (!isOpen) return null;

  const handleTriggerInstall = async () => {
    if (deferredInstallPrompt) {
      setIsInstalling(true);
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          setInstallSuccess(true);
          if (onAppInstalled) onAppInstalled();
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } catch (err) {
        console.error("Error triggering PWA install:", err);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-lg shrink-0 border border-indigo-200/30">
                <img 
                  src="/icon-192.png" 
                  alt="App Icon" 
                  className="w-full h-full object-contain rounded-xl" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div>
                <span className="inline-flex items-center gap-1 bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{lang === 'bn' ? 'অফিসিয়াল অ্যাপ' : 'Official App'}</span>
                </span>
                <h3 className="text-lg font-black tracking-tight leading-tight">
                  Nihad Business Point
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {lang === 'bn' ? 'অফিসিয়াল PWA অ্যাপ ইনস্টল করুন' : 'Install Official PWA Mobile App'}
                </p>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {installSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-black text-slate-800">
                  {lang === 'bn' ? 'অ্যাপ ইনস্টল সফল হয়েছে!' : 'App Installed Successfully!'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'bn' ? 'আপনার মোবাইল হোম স্ক্রিনে NBP অ্যাপ যুক্ত হয়েছে।' : 'NBP app is now added to your home screen.'}
                </p>
              </div>
            ) : isPwaInstalled ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  {lang === 'bn' ? 'অ্যাপটি ইতিমধ্যেই ইনস্টল করা রয়েছে!' : 'App is Already Installed!'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {lang === 'bn' ? 'আপনার ফোনের হোম স্ক্রিন থেকে সরাসরি অ্যাপটি ওপেন করে ব্যবহার করুন।' : 'Open the app directly from your phone home screen.'}
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all"
                >
                  {lang === 'bn' ? 'ঠিক আছে' : 'Got it'}
                </button>
              </div>
            ) : (
              <>
                {/* Highlights list */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-700 block">
                      {lang === 'bn' ? 'দ্রুত গতি' : 'Super Fast'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <WifiOff className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-700 block">
                      {lang === 'bn' ? 'অফলাইন সাপোর্ট' : 'Offline Access'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <Bell className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-700 block">
                      {lang === 'bn' ? 'নোটিফিকেশন' : 'Push Alerts'}
                    </span>
                  </div>
                </div>

                {/* Direct One-click Install Button if deferredPrompt exists */}
                {deferredInstallPrompt ? (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={handleTriggerInstall}
                      disabled={isInstalling}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Download className="w-5 h-5" />
                      <span>
                        {isInstalling 
                          ? (lang === 'bn' ? 'ইনস্টল হচ্ছে...' : 'Installing...') 
                          : (lang === 'bn' ? 'এখনই অ্যাপ ইনস্টল করুন' : 'Install App Now')}
                      </span>
                    </button>
                    <p className="text-[11px] text-center text-slate-500 font-medium">
                      {lang === 'bn' ? 'এক ক্লিকেই ফোনে ফুলস্ক্রিন ইনস্টল হবে' : 'One click native installation'}
                    </p>
                  </div>
                ) : isIos ? (
                  /* iPhone / iPad Safari Instructions */
                  <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wider">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'bn' ? 'iPhone / iOS এ ইনস্টল নিয়ম:' : 'iOS Installation Steps:'}</span>
                    </h4>
                    <ol className="space-y-2 text-xs text-slate-700 font-medium list-decimal list-inside">
                      <li className="leading-snug">
                        {lang === 'bn' ? 'Safari ব্রাউজারের নিচে ' : 'Tap the '}
                        <span className="font-bold text-indigo-700 inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                          <Share className="w-3.5 h-3.5 text-indigo-600" /> Share
                        </span>
                        {lang === 'bn' ? ' বাটনে চাপ দিন।' : ' button at the bottom.'}
                      </li>
                      <li className="leading-snug">
                        {lang === 'bn' ? 'নিচে স্ক্রোল করে ' : 'Scroll down & tap '}
                        <span className="font-bold text-indigo-700 inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                          <PlusSquare className="w-3.5 h-3.5 text-indigo-600" /> Add to Home Screen
                        </span>
                        {lang === 'bn' ? ' নির্বাচন করুন।' : '.'}
                      </li>
                      <li className="leading-snug">
                        {lang === 'bn' ? 'উপরে ' : 'Tap '}
                        <span className="font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                          Add
                        </span>
                        {lang === 'bn' ? ' বাটনে চাপলেই অ্যাপ ফোনে ইনস্টল হয়ে যাবে।' : ' at top right to complete.'}
                      </li>
                    </ol>
                  </div>
                ) : (
                  /* Android / Desktop Manual Chrome Instructions */
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'bn' ? 'ব্রাউজার থেকে ইনস্টল নিয়ম:' : 'Browser Installation Steps:'}</span>
                    </h4>
                    <ol className="space-y-2 text-xs text-slate-700 font-medium list-decimal list-inside">
                      <li className="leading-snug">
                        {lang === 'bn' ? 'ব্রাউজারের উপরে ডানে ' : 'Open browser menu '}
                        <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          ⋮ (3-dots)
                        </span>
                        {lang === 'bn' ? ' মেনুতে চাপ দিন।' : ' at the top.'}
                      </li>
                      <li className="leading-snug">
                        {lang === 'bn' ? 'মেনু থেকে ' : 'Select '}
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          Install App / Add to Home Screen
                        </span>
                        {lang === 'bn' ? ' অপশনটি বেছে নিন।' : ' option.'}
                      </li>
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
