import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calculator, Smartphone, Check, HelpCircle, Sparkles, 
  ArrowLeft, Search, Wallet, Coins, Percent, Info, ArrowUpRight, CheckCircle2, UserCheck, ShieldAlert
} from 'lucide-react';
import { Language, FavoriteContact, Transaction } from '../types';
import { doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface CashOutCalculatorModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: (amount: number, charge: number, method: string, agentNumber: string) => void;
  favorites?: FavoriteContact[];
}

type MfsMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Upay';
type ActiveTab = 'calculator' | 'simulator';
type CalcDirection = 'amount' | 'total'; // amount: input how much cashout; total: input how much total balance

export default function CashOutCalculatorModal({ 
  lang, 
  isOpen, 
  onClose, 
  currentBalance, 
  onSuccess,
  favorites = []
}: CashOutCalculatorModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [method, setMethod] = useState<MfsMethod>('bKash');
  const [rateType, setRateType] = useState<'app' | 'ussd' | 'favorite'>('app');
  
  // Calculator inputs & directions
  const [calcDirection, setCalcDirection] = useState<CalcDirection>('amount');
  const [inputValue, setInputValue] = useState<string>('');
  
  // Simulator states
  const [simStep, setSimStep] = useState<1 | 2 | 3>(1); // 1: Agent & Method, 2: Amount & PIN, 3: Success Receipt
  const [agentNumber, setAgentNumber] = useState<string>('');
  const [simAmount, setSimAmount] = useState<string>('');
  const [simPin, setSimPin] = useState<string>('');
  const [showSimPin, setShowSimPin] = useState<boolean>(false);
  const [realWalletDeduct, setRealWalletDeduct] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const pressTimerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  
  // Generated success metadata
  const [generatedTxId, setGeneratedTxId] = useState<string>('');
  const [successTime, setSuccessTime] = useState<string>('');
  const [finalCalculatedCharge, setFinalCalculatedCharge] = useState<number>(0);

  // Contact list search
  const [showContacts, setShowContacts] = useState<boolean>(false);
  const [contactSearch, setContactSearch] = useState<string>('');

  // Rates definition per MFS
  const rates: Record<MfsMethod, { app: number; ussd: number; favorite: number }> = {
    bKash: { app: 1.75, ussd: 1.85, favorite: 1.49 }, // 17.50, 18.50, 14.90
    Nagad: { app: 1.25, ussd: 1.49, favorite: 1.25 }, // 12.50, 14.90, 12.50
    Rocket: { app: 1.50, ussd: 1.80, favorite: 1.50 }, // 15.00, 18.00, 15.00
    Upay: { app: 1.40, ussd: 1.40, favorite: 1.40 } // 14.00, 14.00, 14.00
  };

  const getRatePercentage = (m: MfsMethod, type: 'app' | 'ussd' | 'favorite') => {
    return rates[m][type];
  };

  // Calculations
  const parsedInput = parseFloat(inputValue) || 0;
  let computedAmount = 0;
  let computedCharge = 0;
  let computedTotal = 0;

  const currentRate = getRatePercentage(method, rateType);

  if (calcDirection === 'amount') {
    // We enter Cash Out Amount
    computedAmount = parsedInput;
    computedCharge = Math.round((computedAmount * (currentRate / 100)) * 100) / 100;
    computedTotal = computedAmount + computedCharge;
  } else {
    // We enter Total Wallet Balance to be empty-cleared
    computedTotal = parsedInput;
    // Total = Amount + Amount * Rate/100 = Amount * (1 + Rate/100)
    computedAmount = Math.round((computedTotal / (1 + currentRate / 100)) * 100) / 100;
    computedCharge = Math.round((computedTotal - computedAmount) * 100) / 100;
  }

  // Pre-fill simulator when switching
  useEffect(() => {
    if (activeTab === 'simulator' && computedAmount > 0) {
      setSimAmount(Math.round(computedAmount).toString());
    }
  }, [activeTab]);

  const handleSelectContact = (num: string) => {
    setAgentNumber(num);
    setShowContacts(false);
  };

  const getMethodTheme = (m: MfsMethod) => {
    switch (m) {
      case 'bKash': return {
        bg: 'bg-pink-500',
        text: 'text-pink-500',
        lightBg: 'bg-pink-50',
        border: 'border-pink-500',
        accent: '#e2125d',
        gradient: 'from-pink-500 to-rose-600',
        focusRing: 'focus:ring-pink-500'
      };
      case 'Nagad': return {
        bg: 'bg-orange-500',
        text: 'text-orange-600',
        lightBg: 'bg-orange-50',
        border: 'border-orange-500',
        accent: '#f26122',
        gradient: 'from-orange-500 to-red-500',
        focusRing: 'focus:ring-orange-500'
      };
      case 'Rocket': return {
        bg: 'bg-purple-600',
        text: 'text-purple-600',
        lightBg: 'bg-purple-50',
        border: 'border-purple-600',
        accent: '#8c1d88',
        gradient: 'from-purple-600 to-indigo-700',
        focusRing: 'focus:ring-purple-600'
      };
      case 'Upay': return {
        bg: 'bg-blue-600',
        text: 'text-blue-600',
        lightBg: 'bg-blue-50',
        border: 'border-blue-600',
        accent: '#0d4ca1',
        gradient: 'from-blue-600 to-sky-700',
        focusRing: 'focus:ring-blue-600'
      };
    }
  };

  const activeTheme = getMethodTheme(method);

  // Custom tap and hold logic
  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!agentNumber || agentNumber.length < 11) {
      alert(lang === 'bn' ? 'দয়া করে ১১ সংখ্যার সঠিক এজেন্ট নম্বর দিন!' : 'Please enter a valid 11-digit agent number.');
      return;
    }
    const amt = parseFloat(simAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(lang === 'bn' ? 'সঠিক টাকার পরিমাণ দিন!' : 'Please enter a valid amount.');
      return;
    }
    if (realWalletDeduct && amt + (amt * currentRate / 100) > currentBalance) {
      alert(lang === 'bn' ? 'ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই!' : 'Insufficient wallet balance for this live transaction.');
      return;
    }
    if (!simPin || simPin.length < 4) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে ৪ বা ৫ সংখ্যার সঠিক পিন দিন!' : 'Please enter a valid 4 or 5-digit PIN.');
      return;
    }

    setIsPressing(true);
    const start = Date.now();
    const duration = 2200; // 2.2 seconds holding time

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setSimulationProgress(pct);
      
      if (pct >= 100) {
        clearInterval(progressIntervalRef.current);
        handleSimulationSuccess();
      }
    }, 30);
  };

  const handlePressEnd = () => {
    setIsPressing(false);
    clearInterval(progressIntervalRef.current);
    // Smooth reset
    let curr = simulationProgress;
    const resetInterval = setInterval(() => {
      curr = Math.max(curr - 8, 0);
      setSimulationProgress(curr);
      if (curr === 0) {
        clearInterval(resetInterval);
      }
    }, 15);
  };

  const handleSimulationSuccess = async () => {
    const amt = parseFloat(simAmount);
    const charge = Math.round((amt * (currentRate / 100)) * 100) / 100;
    const totalDeducted = amt + charge;
    setFinalCalculatedCharge(charge);
    setGeneratedTxId(`TXN${Math.random().toString(36).substr(2, 10).toUpperCase()}`);
    setSuccessTime(new Date().toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }));

    if (realWalletDeduct) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const newTxId = `tx-${Date.now()}`;
        const txReferenceId = `CSH${Math.random().toString(36).substr(2, 11).toUpperCase()}`;
        const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
        const userEmail = currentUser.email || 'user@test.com';

        const newTx: Transaction = {
          id: newTxId,
          type: 'Transfer', // Use 'Transfer' type to process nicely through existing ledger pipelines
          amount: amt,
          targetNumber: agentNumber,
          transferMethod: method,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          txId: txReferenceId,
          status: 'Pending',
          userId: currentUser.uid,
          userEmail,
          userName
        };

        const addedNotifId = `notif-${Date.now()}`;
        const addedNotif = {
          id: addedNotifId,
          title: 'Cash Out Simulation Pending',
          titleBn: 'ক্যাশ আউট সিমুলেশন অনুরোধ পেন্ডিং',
          desc: `Your simulated cash out of ৳${amt} (Fee: ৳${charge}) to agent ${agentNumber} is submitted.`,
          descBn: `আপনার এজেন্ট নম্বর (${agentNumber}) এ ৳${amt} টাকা ক্যাশ আউট সিমুলেশন (চার্জ: ৳${charge}) ভেরিফিকেশনের জন্য পাঠানো হয়েছে।`,
          time: 'Just now',
          read: false,
        };

        try {
          const batch = writeBatch(db);
          batch.set(doc(db, 'users', currentUser.uid, 'transactions', newTxId), newTx);
          batch.set(doc(db, 'admin_requests', newTxId), newTx);
          batch.set(doc(db, 'users', currentUser.uid, 'notifications', addedNotifId), addedNotif);
          
          const newBalanceVal = Math.max(currentBalance - totalDeducted, 0);
          batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });
          await batch.commit();

          onSuccess(amt, charge, method, agentNumber);
        } catch (error) {
          console.error("Error committing real simulator deduction: ", error);
        }
      }
    }

    setSimStep(3);
  };

  const handleResetSimulator = () => {
    setSimStep(1);
    setSimPin('');
    setSimulationProgress(0);
    setIsPressing(false);
  };

  const filteredFavorites = favorites.filter(fav => {
    const term = contactSearch.toLowerCase();
    return fav.name.toLowerCase().includes(term) || fav.number.includes(term);
  });

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer transition-opacity duration-300"
      />

      {/* Modal Card */}
      <motion.div 
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-w-lg bg-slate-50 rounded-t-[36px] overflow-hidden shadow-2xl relative z-10 border-t border-slate-200/80 max-h-[92vh] flex flex-col font-sans"
      >
        {/* Header decoration bar */}
        <div className="mx-auto my-3 w-12 h-1.5 bg-slate-300 rounded-full shrink-0" />

        {/* Dynamic Operator Header Badge Color */}
        <div className={`${activeTheme.bg} px-6 py-4 flex items-center justify-between text-white relative`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight font-display">
                {lang === 'bn' ? 'ক্যাশ আউট ক্যালকুলেটর ও সিমুলেটর' : 'Cash Out Calculator & Simulator'}
              </h3>
              <p className="text-white/80 text-xs font-medium">
                {lang === 'bn' ? 'অপারেটর ফি হিসেব করুন ও লাইভ ক্যাশআউট ডেমো দেখুন' : 'Calculate accurate MFS cashout fees & run simulations'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-white border-b border-slate-100 px-6 py-2 flex gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
              activeTab === 'calculator'
                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calculator className="h-4 w-4" />
            {lang === 'bn' ? 'ফি ক্যালকুলেটর' : 'Fee Calculator'}
          </button>
          <button
            onClick={() => {
              setActiveTab('simulator');
              handleResetSimulator();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
              activeTab === 'simulator'
                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            {lang === 'bn' ? 'ক্যাশ আউট সিমুলেটর' : 'Cash Out Simulator'}
          </button>
        </div>

        {/* Core Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* MFS Brand Selector (Only if not in receipt step) */}
          {!(activeTab === 'simulator' && simStep === 3) && (
            <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-xs space-y-2.5">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {lang === 'bn' ? 'মোবাইল ফিন্যান্সিয়াল সার্ভিস (MFS) নির্বাচন করুন' : 'Select Mobile Financial Service'}
              </span>
              <div className="grid grid-cols-4 gap-2.5">
                {(['bKash', 'Nagad', 'Rocket', 'Upay'] as MfsMethod[]).map((m) => {
                  const mTheme = getMethodTheme(m);
                  const isSelected = method === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all cursor-pointer ${
                        isSelected 
                          ? `${mTheme.border} ${mTheme.lightBg} font-extrabold shadow-sm scale-102` 
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span className={`text-[11px] uppercase font-mono tracking-wider ${isSelected ? mTheme.text : 'text-slate-400'}`}>
                        {m}
                      </span>
                      <span className="text-[10px] font-bold block text-slate-600">
                        {rates[m].app}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: CALCULATOR PANEL */}
          {activeTab === 'calculator' && (
            <div className="space-y-4">
              
              {/* Rate Type Selection */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {lang === 'bn' ? 'রেট টাইপ সিলেক্ট করুন' : 'Choose Cash Out Rate'}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full">
                    <Percent className="h-3.5 w-3.5" />
                    <span>{currentRate}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setRateType('app')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all ${
                      rateType === 'app' 
                        ? 'bg-slate-900 border-slate-900 text-white font-extrabold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {lang === 'bn' ? 'অ্যাপ রেট' : 'App Rate'}
                  </button>
                  <button
                    onClick={() => setRateType('ussd')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all ${
                      rateType === 'ussd' 
                        ? 'bg-slate-900 border-slate-900 text-white font-extrabold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    USSD (*247#)
                  </button>
                  <button
                    onClick={() => setRateType('favorite')}
                    disabled={method === 'Upay'}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all ${
                      method === 'Upay' ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      rateType === 'favorite' 
                        ? 'bg-slate-900 border-slate-900 text-white font-extrabold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {lang === 'bn' ? 'প্রিয় এজেন্ট' : 'Fav Agent'}
                  </button>
                </div>
              </div>

              {/* Input direction toggle & input value box */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                
                {/* Direction switcher tabs */}
                <div className="flex border-b border-slate-100 pb-1.5 gap-4">
                  <button
                    onClick={() => {
                      setCalcDirection('amount');
                      setInputValue('');
                    }}
                    className={`pb-1 px-1 text-xs font-bold transition-all relative cursor-pointer border-b-2 ${
                      calcDirection === 'amount'
                        ? `${activeTheme.border} ${activeTheme.text} font-extrabold`
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {lang === 'bn' ? 'ক্যাশ আউট এমাউন্ট লিখুন' : 'Enter Cash Out Amount'}
                  </button>
                  <button
                    onClick={() => {
                      setCalcDirection('total');
                      setInputValue('');
                    }}
                    className={`pb-1 px-1 text-xs font-bold transition-all relative cursor-pointer border-b-2 ${
                      calcDirection === 'total'
                        ? `${activeTheme.border} ${activeTheme.text} font-extrabold`
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {lang === 'bn' ? 'মোট ব্যালেন্স অনুযায়ী হিসেব' : 'Based on Total Balance'}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {calcDirection === 'amount' 
                        ? (lang === 'bn' ? 'ক্যাশ আউট করার পরিমাণ (৳)' : 'Cash Out Amount (৳)')
                        : (lang === 'bn' ? 'অ্যাকাউন্টে থাকা মোট টাকা (৳)' : 'Total Amount inside Wallet (৳)')}
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {lang === 'bn' ? `ব্যালেন্স: ৳${currentBalance.toLocaleString()}` : `Balance: ৳${currentBalance.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4.5 top-1/2 -translate-y-1/2 font-extrabold text-lg text-slate-400 font-display">৳</span>
                    <input
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={calcDirection === 'amount' ? 'e.g. 5000' : 'e.g. 5087'}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-10 pr-16 text-lg font-extrabold outline-none transition-all ${activeTheme.focusRing} text-slate-900 font-display`}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button 
                        onClick={() => setInputValue('1000')}
                        className="bg-white border border-slate-200 text-[10px] font-black px-2 py-1 rounded-lg hover:border-slate-300 transition-colors cursor-pointer text-slate-600"
                      >
                        ১,০০০
                      </button>
                      <button 
                        onClick={() => setInputValue('5000')}
                        className="bg-white border border-slate-200 text-[10px] font-black px-2 py-1 rounded-lg hover:border-slate-300 transition-colors cursor-pointer text-slate-600"
                      >
                        ৫,০০০
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Cost breakdown */}
              {parsedInput > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 shadow-lg space-y-4 font-sans"
                >
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                      {lang === 'bn' ? `${method} ফি এবং খরচ হিসাব বিবরণী` : `${method} Fee Breakdown Audit`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{lang === 'bn' ? 'ক্যাশ আউট এমাউন্ট' : 'Cash Out Amount'}</span>
                      <p className="font-extrabold text-sm font-display text-white">৳{computedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{lang === 'bn' ? 'সার্ভিস চার্জ (ফি)' : 'Service Fee'}</span>
                      <p className="font-extrabold text-sm font-display text-pink-400">৳{computedCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 col-span-2 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          {calcDirection === 'amount' 
                            ? (lang === 'bn' ? 'মোট টাকা কেটে নেওয়া হবে' : 'Total Money Deducted')
                            : (lang === 'bn' ? 'নির্ধারিত ওয়ালেট ব্যালেন্স' : 'Allocated Wallet Balance')}
                        </span>
                        <p className="font-black text-lg font-display text-emerald-400">৳{computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">{lang === 'bn' ? 'এজেন্ট থেকে হাতে পাবেন' : 'You Receive in Cash'}</span>
                        <p className="font-black text-lg font-display text-indigo-400">৳{computedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Informational advice */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-300">
                    <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                    <div>
                      {lang === 'bn' ? (
                        <span>
                          আপনি যদি <strong className="text-white">{method}</strong> এজেন্ট থেকে ক্যাশ আউট করেন, তাহলে <strong>১০০০ টাকায় ৳{currentRate}</strong> হিসেবে চার্জ কাটা হবে।
                        </span>
                      ) : (
                        <span>
                          Cashing out from <strong className="text-white">{method}</strong> costs <strong>৳{currentRate} per 1,000 Taka</strong>.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Simulator Redirect Button */}
                  <button
                    onClick={() => {
                      setSimAmount(Math.round(computedAmount).toString());
                      setActiveTab('simulator');
                      handleResetSimulator();
                    }}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-sm"
                  >
                    <span>{lang === 'bn' ? 'এই লেনদেনটি সিমুলেট করুন' : 'Simulate this transaction'}</span>
                    <ArrowUpRight className="h-4 w-4 text-slate-900" />
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 2: SIMULATOR PANEL */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              
              {/* STEP 1: Enter Agent details */}
              {simStep === 1 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5" />
                        {lang === 'bn' ? 'এজেন্ট মোবাইল নম্বর দিন' : 'Enter MFS Agent Number'}
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowContacts(!showContacts)}
                        className={`text-xs font-bold flex items-center gap-1 ${activeTheme.text} hover:opacity-85`}
                      >
                        <UserCheck className="h-4 w-4" />
                        {lang === 'bn' ? 'প্রিয় কন্টাক্ট বুক' : 'Contact Book'}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="tel"
                        value={agentNumber}
                        onChange={(e) => setAgentNumber(e.target.value.replace(/[^0-9]/g, '').substring(0, 11))}
                        placeholder={lang === 'bn' ? 'যেমন: 01XXXXXXXXX' : 'e.g. 01XXXXXXXXX'}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-extrabold outline-none transition-all ${activeTheme.focusRing} text-slate-900 font-mono`}
                      />
                      {agentNumber.length === 11 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-emerald-50 text-emerald-600 rounded-full">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Contacts dropdown toggle */}
                    {showContacts && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-slate-100 rounded-2xl p-3 bg-slate-50 space-y-2 max-h-48 overflow-y-auto"
                      >
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input 
                            type="text"
                            placeholder={lang === 'bn' ? 'কন্টাক্ট খুঁজুন...' : 'Search contacts...'}
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs font-bold text-slate-700 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          {filteredFavorites.length > 0 ? (
                            filteredFavorites.map(fav => (
                              <button
                                key={fav.id}
                                onClick={() => handleSelectContact(fav.number)}
                                className="w-full text-left bg-white hover:bg-slate-100 p-2.5 rounded-xl flex items-center justify-between border border-slate-100"
                              >
                                <div>
                                  <span className="text-xs font-extrabold text-slate-800 block">{fav.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono block">{fav.number}</span>
                                </div>
                                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500 uppercase">{fav.operator}</span>
                              </button>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 text-center py-2 font-bold">{lang === 'bn' ? 'কোনো কন্টাক্ট পাওয়া যায়নি' : 'No contacts found'}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (!agentNumber || agentNumber.length < 11) {
                        alert(lang === 'bn' ? 'দয়া করে সঠিক ১১ সংখ্যার এজেন্ট নম্বর দিন!' : 'Please enter a valid 11-digit agent number.');
                        return;
                      }
                      setSimStep(2);
                    }}
                    className={`w-full text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 ${activeTheme.bg}`}
                  >
                    <span>{lang === 'bn' ? 'পরবর্তী ধাপে যান' : 'Proceed to Next Step'}</span>
                    <ArrowLeft className="h-4 w-4 rotate-180 text-white" />
                  </button>
                </motion.div>
              )}

              {/* STEP 2: Enter Amount & PIN, then Tap & Hold */}
              {simStep === 2 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Amount and PIN Fields */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
                    
                    {/* Back Arrow */}
                    <button
                      onClick={() => setSimStep(1)}
                      className="text-xs font-bold text-slate-400 flex items-center gap-1 hover:text-slate-600 mb-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {lang === 'bn' ? 'আগের ধাপে ফিরে যান' : 'Go Back'}
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Amount Input */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          {lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Enter Amount (৳)'}
                        </label>
                        <input
                          type="number"
                          value={simAmount}
                          onChange={(e) => setSimAmount(e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-base font-extrabold outline-none text-slate-800"
                        />
                      </div>

                      {/* PIN Input */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          {lang === 'bn' ? 'পিন নম্বর' : 'MFS PIN'}
                        </label>
                        <div className="relative">
                          <input
                            type={showSimPin ? 'text' : 'password'}
                            value={simPin}
                            onChange={(e) => setSimPin(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 12345"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-base font-bold outline-none tracking-widest text-slate-800 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSimPin(!showSimPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-extrabold uppercase"
                          >
                            {showSimPin ? (lang === 'bn' ? 'লুকান' : 'Hide') : (lang === 'bn' ? 'দেখুন' : 'Show')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live balance deduction toggler */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-2.5">
                          <Wallet className={`h-4.5 w-4.5 shrink-0 text-slate-500 mt-0.5`} />
                          <div>
                            <span className="text-xs font-extrabold text-slate-800 block">
                              {lang === 'bn' ? 'লাইভ ওয়ালেট ব্যালেন্স থেকে সিমুলেশন' : 'Live Wallet Balance Deduction'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {lang === 'bn' ? 'এটি অন করলে আপনার আসল ব্যালেন্স থেকে হিসেব করে চার্জসহ টাকা কাটা হবে।' : 'Deducts from real account balance and logs to dashboard ledger.'}
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={realWalletDeduct}
                          onChange={(e) => setRealWalletDeduct(e.target.checked)}
                          className={`h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer`}
                        />
                      </div>
                    </div>

                    {/* Fee Calculation Alert */}
                    {parseFloat(simAmount) > 0 && (
                      <div className="border border-slate-200 bg-white p-3 rounded-2xl grid grid-cols-2 gap-y-2 text-xs">
                        <div className="text-slate-500 font-medium">{lang === 'bn' ? 'ক্যাশ আউট চার্জ:' : 'Cash Out Fee:'}</div>
                        <div className="text-right font-bold text-slate-800">৳{Math.round((parseFloat(simAmount) * (currentRate / 100)) * 100) / 100}</div>
                        <div className="text-slate-500 font-medium">{lang === 'bn' ? 'মোট কাটা হবে:' : 'Total Deducted:'}</div>
                        <div className="text-right font-black text-rose-500">৳{Math.round((parseFloat(simAmount) * (1 + currentRate / 100)) * 100) / 100}</div>
                      </div>
                    )}
                  </div>

                  {/* TAP AND HOLD CONTAINER */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
                    
                    <div className="text-center">
                      <p className="text-xs font-extrabold text-slate-800">
                        {lang === 'bn' ? 'ক্যাশ আউট করতে ট্যাপ করে ধরে রাখুন' : 'Tap and Hold to Confirm Cash Out'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {lang === 'bn' ? '২ সেকেন্ড সম্পূর্ণ চেপে ধরে রাখুন' : 'Hold continuously for 2 seconds to simulate MFS request'}
                      </p>
                    </div>

                    {/* BKash style spring progress hold circle button */}
                    <div className="relative w-36 h-36 flex items-center justify-center select-none">
                      {/* Outer Ring boundary */}
                      <svg className="absolute inset-0 w-full h-full rotate-270">
                        <circle
                          cx="72"
                          cy="72"
                          r="62"
                          fill="transparent"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="62"
                          fill="transparent"
                          stroke={activeTheme.accent}
                          strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 62}
                          strokeDashoffset={2 * Math.PI * 62 * (1 - simulationProgress / 100)}
                          strokeLinecap="round"
                          className="transition-all duration-30"
                        />
                      </svg>

                      {/* Inner Hold trigger */}
                      <button
                        onMouseDown={handlePressStart}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={handlePressStart}
                        onTouchEnd={handlePressEnd}
                        className={`w-28 h-28 rounded-full flex flex-col items-center justify-center text-white font-extrabold shadow-lg cursor-pointer transition-all active:scale-95 select-none ${
                          isPressing ? 'opacity-90' : ''
                        } ${activeTheme.bg}`}
                        style={{
                          boxShadow: `0 8px 24px -4px ${activeTheme.accent}50`
                        }}
                      >
                        {isPressing ? (
                          <div className="space-y-1">
                            <span className="text-center font-black text-xl font-display">{Math.round(simulationProgress)}%</span>
                            <span className="text-[9px] uppercase font-bold tracking-wider block text-white/80">{lang === 'bn' ? 'ধরে রাখুন...' : 'Holding...'}</span>
                          </div>
                        ) : (
                          <div className="space-y-1 flex flex-col items-center">
                            <Smartphone className="h-7 w-7 text-white" />
                            <span className="text-[10px] tracking-tight uppercase font-black">{lang === 'bn' ? 'চেপে রাখুন' : 'Hold Now'}</span>
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Progress details */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-30 ${activeTheme.bg}`}
                        style={{ width: `${simulationProgress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Successful Digital Receipt */}
              {simStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Receipt Outer Frame */}
                  <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-lg relative">
                    
                    {/* Top colored aesthetic bar representing success */}
                    <div className={`h-4.5 ${activeTheme.bg}`} />

                    <div className="p-6 space-y-6">
                      
                      {/* MFS Success Header Stamp */}
                      <div className="flex flex-col items-center justify-center text-center space-y-2">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full animate-bounce">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div>
                          <h4 className="text-slate-900 font-black text-base">
                            {lang === 'bn' ? `${method} ক্যাশ আউট সফল!` : `${method} Cash Out Success!`}
                          </h4>
                          <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full inline-block">
                            {lang === 'bn' ? 'লেনদেনটি সফল হয়েছে' : 'Simulated Ledger Verified'}
                          </span>
                        </div>
                      </div>

                      {/* Transaction Audit Table */}
                      <div className="border border-slate-100 bg-slate-50 rounded-2xl p-4.5 space-y-3.5 text-xs">
                        
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                          <span className="text-slate-500 font-medium">{lang === 'bn' ? 'এজেন্ট নম্বর' : 'MFS Agent Number'}</span>
                          <span className="font-extrabold text-slate-800 font-mono">{agentNumber}</span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                          <span className="text-slate-500 font-medium">{lang === 'bn' ? 'টাকার পরিমাণ' : 'Cash Out Amount'}</span>
                          <span className="font-black text-slate-900 text-sm font-display">৳{parseFloat(simAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                          <span className="text-slate-500 font-medium">{lang === 'bn' ? 'সার্ভিস চার্জ (ফি)' : 'Calculated Service Fee'}</span>
                          <span className="font-bold text-pink-600 font-display">৳{finalCalculatedCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                          <span className="text-slate-500 font-medium">{lang === 'bn' ? 'মোট কর্তনকৃত টাকা' : 'Total Deduction Cost'}</span>
                          <span className="font-black text-rose-600 text-sm font-display">৳{(parseFloat(simAmount) + finalCalculatedCharge).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                          <span className="text-slate-500 font-medium">Transaction ID</span>
                          <span className="font-extrabold text-indigo-600 font-mono text-[11px] select-all cursor-pointer hover:underline">
                            {generatedTxId}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">{lang === 'bn' ? 'তারিখ ও সময়' : 'Time Stamp'}</span>
                          <span className="font-bold text-slate-700 text-[10px]">{successTime}</span>
                        </div>

                      </div>

                      {/* Advice on Sandbox vs Real balance */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl flex items-start gap-2.5 border border-slate-100">
                        <ShieldAlert className="h-4.5 w-4.5 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-extrabold text-slate-800">
                            {realWalletDeduct 
                              ? (lang === 'bn' ? 'আপনার আসল ওয়ালেট থেকে টাকা কর্তন করা হয়েছে।' : 'Deducted from your real live account balance!')
                              : (lang === 'bn' ? 'স্যান্ডবক্স সিমুলেশন (আসল টাকা কাটা হয়নি)' : 'Sandbox Simulation (No actual money debited)')}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {realWalletDeduct 
                              ? (lang === 'bn' ? 'একটি পেন্ডিং ট্রান্সফার রিকোয়েস্ট লগ করা হয়েছে। এডমিন এটি ভেরিফাই করবেন।' : 'A pending request is logged in the dashboard. Admin will verify shortly.')
                              : (lang === 'bn' ? 'এটি শুধুমাত্র একটি সিমুলেশন এবং শিক্ষামূলক হিসাব পরীক্ষা ডেমো।' : 'This is an educational calculation playground simulator demo.')}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Actions to Reset */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleResetSimulator}
                      className="flex-1 py-3 border border-slate-200 hover:bg-slate-100 text-slate-700 bg-white font-extrabold text-xs rounded-2xl cursor-pointer transition-colors"
                    >
                      {lang === 'bn' ? 'নতুন সিমুলেশন' : 'New Simulation'}
                    </button>
                    <button
                      onClick={onClose}
                      className={`flex-1 py-3 text-white font-extrabold text-xs rounded-2xl cursor-pointer transition-all active:scale-98 text-center ${activeTheme.bg}`}
                    >
                      {lang === 'bn' ? 'বন্ধ করুন' : 'Close Panel'}
                    </button>
                  </div>
                </motion.div>
              )}

            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
