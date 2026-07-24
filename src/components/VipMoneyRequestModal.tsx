import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Coins, X, Check, AlertCircle, Sparkles, Send } from 'lucide-react';
import { Language } from '../types';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface VipMoneyRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  userData: any;
}

export default function VipMoneyRequestModal({
  isOpen,
  onClose,
  lang,
  userData,
}: VipMoneyRequestModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const currentUser = auth.currentUser;
  const isVip = userData?.isVip || false;

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg(lang === 'bn' ? 'সঠিক টাকার পরিমাণ লিখুন!' : 'Please enter a valid amount!');
      return;
    }

    if (!currentUser) {
      setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে পুনরায় লগইন করুন!' : 'Please sign in first!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const reqId = `req-vip-${Date.now()}`;
      const txId = `VIP-${Math.floor(100000 + Math.random() * 900000)}`;
      const dateStr = new Date().toISOString();

      const requestData = {
        id: reqId,
        type: 'VIP_Money_Request',
        amount: numAmount,
        date: dateStr,
        txId: txId,
        status: 'Pending',
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: userData?.displayName || currentUser.displayName || 'VIP Member',
        targetNumber: userData?.phone || '',
        details: note.trim() || (lang === 'bn' ? 'ভিআইপি মানি রিকুয়েস্ট (জরুরি ক্রেডিট)' : 'VIP Money Request (Urgent Credit)'),
        isVip: true
      };

      // 1. Submit to collective admin_requests
      await setDoc(doc(db, 'admin_requests', reqId), requestData);

      // 2. Submit to user's personal transactions history
      await setDoc(doc(db, 'users', currentUser.uid, 'transactions', reqId), requestData);

      setSuccessMsg(
        lang === 'bn'
          ? 'আপনার ভিআইপি মানি রিকুয়েস্ট সফলভাবে অ্যাডমিনের কাছে পাঠানো হয়েছে! 👑'
          : 'Your VIP Money Request has been submitted to admin successfully! 👑'
      );

      setAmount('');
      setNote('');
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      console.error("Error sending VIP money request: ", err);
      setErrorMsg(err.message || 'Failed to submit VIP request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
      />

      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 text-white w-full max-w-md rounded-[32px] p-6 shadow-2xl border border-amber-500/30 relative z-10 animate-scale-up space-y-5">
        
        {/* Header with Golden VIP Crown */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20">
              <Crown className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-white font-extrabold text-sm font-display tracking-tight">
                  {lang === 'bn' ? 'ভিআইপি মানি রিকুয়েস্ট' : 'VIP Money Request'}
                </h3>
                <span className="bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  👑 VIP
                </span>
              </div>
              <p className="text-[10px] text-amber-200/70 font-semibold mt-0.5">
                {lang === 'bn' ? 'এডমিনের কাছে সরাসরি ব্যালেন্স লোনের আবেদন' : 'Direct credit request priority pipeline to Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isVip && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
            <p className="leading-snug text-[11px]">
              {lang === 'bn' 
                ? 'অনুরোধটি পাঠানোর পর এডমিন আপনার অ্যাকাউন্ট রিভিউ করবেন। আপনার VIP ব্যাজ সক্রিয় থাকলে রিকুয়েস্ট দ্রুত প্রসেস হবে।' 
                : 'Notice: VIP privilege processing applies. The admin will review and verify your request.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-[10px] font-black text-amber-300 uppercase tracking-widest mb-1.5">
              {lang === 'bn' ? 'অনুরোধের পরিমাণ (৳)' : 'Requested Amount (৳)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-lg font-mono">
                ৳
              </span>
              <input 
                type="number"
                required
                min="1"
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-900 border border-amber-500/30 focus:border-amber-400 rounded-2xl py-3 pl-8 pr-4 text-white text-lg font-black font-mono outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Quick Amount Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt.toString())}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black font-mono transition-all cursor-pointer border ${
                    amount === amt.toString()
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                      : 'bg-white/5 text-amber-200/80 border-white/10 hover:bg-white/10'
                  }`}
                >
                  ৳{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Reason / Note input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {lang === 'bn' ? 'কারণ বা বিবরণ (ঐচ্ছিক)' : 'Note / Reason for Admin (Optional)'}
            </label>
            <textarea
              rows={2}
              placeholder={lang === 'bn' ? 'যেমন: জরুরি ফ্লেক্সিলোড / শপ বিজনেস ব্যালেন্স' : 'e.g. Urgent shop business float credit'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 focus:border-amber-400/50 rounded-2xl p-3 text-xs text-white placeholder:text-slate-600 outline-none transition-all"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:from-amber-400 hover:to-yellow-300 rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? (
              <span>{lang === 'bn' ? 'পাঠানো হচ্ছে...' : 'Submitting Request...'}</span>
            ) : (
              <>
                <Send className="h-4 w-4 stroke-[2.5]" />
                <span>{lang === 'bn' ? 'এডমিনকে রিকুয়েস্ট পাঠান' : 'Send VIP Money Request'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
