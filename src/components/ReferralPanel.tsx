import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Gift, Copy, Share2, Users, Coins, ArrowRight, CheckCircle2, 
  Sparkles, RefreshCw, Smartphone, Percent, ArrowLeft
} from 'lucide-react';
import { Language } from '../types';
import { db, auth } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

interface ReferralPanelProps {
  lang: Language;
  onBack?: () => void;
}

export default function ReferralPanel({ lang, onBack }: ReferralPanelProps) {
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralEarnings, setReferralEarnings] = useState<number>(0);
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Load user's referral code and count
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.referralCode) {
          setReferralCode(data.referralCode);
        } else {
          // Generate missing referral code
          const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await updateDoc(userDocRef, { referralCode: newCode });
          setReferralCode(newCode);
        }
      }
    });

    // Load referral count
    const q = query(collection(db, 'users'), where('referredBy', '==', currentUser.uid));
    const unsubscribeReferrals = onSnapshot(q, (snapshot) => {
      setReferralCount(snapshot.size);
    });

    // Load referral earnings (from transactions)
    const txQ = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      where('details', '>=', 'Referral Bonus'),
      where('details', '<=', 'Referral Bonus' + '\uf8ff')
    );
    const unsubscribeEarnings = onSnapshot(txQ, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        total += (doc.data().amount || 0);
      });
      setReferralEarnings(total);
      setLoading(false);
    });

    // Load referral bonus amount from settings
    const settingsRef = doc(db, 'settings', 'app_config');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setBonusAmount(docSnap.data().referralBonus || 0);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeReferrals();
      unsubscribeEarnings();
      unsubscribeSettings();
    };
  }, [currentUser]);

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralCode) return;
    const shareText = lang === 'bn' 
      ? `আমার রেফারেল কোড ${referralCode} ব্যবহার করে এই অ্যাপে সাইন আপ করুন এবং বোনাস পান!` 
      : `Sign up on this app using my referral code ${referralCode} and get a bonus!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: lang === 'bn' ? 'রেফার করুন ও আয় করুন' : 'Refer & Earn',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      handleCopyCode();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-500 font-bold">
          {lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading Referral Data...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto scroller-hidden select-none">
      
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-xs select-none cursor-pointer self-start pb-1 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
        </button>
      )}
      
      {/* Hero Banner Section */}
      <div className="relative bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[32px] p-6 text-white overflow-hidden shadow-xl shadow-emerald-500/20">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Gift className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
              {lang === 'bn' ? 'রেফারেল প্রোগ্রাম' : 'Referral Program'}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight leading-tight">
            {lang === 'bn' ? 'বন্ধুদের রেফার করুন, আনলিমিটেড বোনাস পান!' : 'Refer Friends, Earn Unlimited Bonus!'}
          </h2>
          <p className="text-xs text-emerald-50/80 font-medium leading-relaxed max-w-[220px]">
            {lang === 'bn' 
              ? `আপনার রেফারেল কোড ব্যবহার করে কেউ সাইন আপ করলেই আপনি পাবেন ৳${bonusAmount} বোনাস!` 
              : `Earn ৳${bonusAmount} instantly for every friend who signs up using your unique code!`}
          </p>
        </div>
        
        {/* Decorative elements */}
        <Coins className="absolute -bottom-6 -right-6 h-32 w-32 text-white/10 rotate-12" />
        <Sparkles className="absolute top-4 right-4 h-8 w-8 text-white/20 animate-pulse" />
      </div>

      {/* Referral Code Display Section */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-sm space-y-4">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {lang === 'bn' ? 'আপনার ইউনিক কোড' : 'Your Unique Code'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-black text-slate-900 tracking-tighter">
              {referralCode || '------'}
            </span>
            <button 
              onClick={handleCopyCode}
              className={`p-2 rounded-xl transition-all active:scale-90 cursor-pointer ${
                copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {copied ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-2xl text-xs font-black transition-all hover:bg-slate-800 active:scale-95 cursor-pointer shadow-md"
          >
            <Share2 className="h-4 w-4" />
            <span>{lang === 'bn' ? 'শেয়ার করুন' : 'Share Now'}</span>
          </button>
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 py-3.5 rounded-2xl text-xs font-black transition-all hover:bg-emerald-100 active:scale-95 cursor-pointer border border-emerald-100"
          >
            <Copy className="h-4 w-4" />
            <span>{lang === 'bn' ? 'কপি কোড' : 'Copy Code'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50/50 border border-blue-100 rounded-[24px] p-4 flex flex-col items-center text-center space-y-1">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mb-1">
            <Users className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">
            {lang === 'bn' ? 'মোট রেফারেল' : 'Total Referrals'}
          </span>
          <p className="text-xl font-black text-blue-900 font-mono">
            {referralCount}
          </p>
        </div>

        <div className="bg-amber-50/50 border border-amber-100 rounded-[24px] p-4 flex flex-col items-center text-center space-y-1">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl mb-1">
            <Coins className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
            {lang === 'bn' ? 'মোট আয়' : 'Total Earnings'}
          </span>
          <p className="text-xl font-black text-amber-900 font-mono">
            ৳{referralEarnings}
          </p>
        </div>
      </div>

      {/* How it works section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {lang === 'bn' ? 'কিভাবে কাজ করে?' : 'How It Works?'}
        </h3>
        
        <div className="space-y-2.5">
          {[
            { 
              icon: <Smartphone className="h-4 w-4" />, 
              textBn: 'আপনার বন্ধুদের এই অ্যাপে আমন্ত্রন জানান।', 
              textEn: 'Invite your friends to join the app.' 
            },
            { 
              icon: <Percent className="h-4 w-4" />, 
              textBn: 'সাইন আপ করার সময় আপনার কোড দিতে বলুন।', 
              textEn: 'Ask them to use your code during signup.' 
            },
            { 
              icon: <Gift className="h-4 w-4" />, 
              textBn: 'সফলভাবে সাইন আপ করলেই আপনার ওয়ালেটে বোনাস যোগ হবে।', 
              textEn: 'Get instant bonus in your wallet after signup.' 
            }
          ].map((step, i) => (
            <div key={i} className="bg-white border border-slate-50 p-3 rounded-2xl flex items-start gap-3">
              <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                {step.icon}
              </div>
              <p className="text-[11px] font-semibold text-slate-600 leading-tight">
                {lang === 'bn' ? step.textBn : step.textEn}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
