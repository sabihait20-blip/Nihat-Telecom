import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Landmark, Smartphone, Check, ShieldCheck, 
  HelpCircle, Sparkles, RefreshCw, AlertCircle, ArrowUpRight,
  Users, ArrowLeft, Search
} from 'lucide-react';
import { Language, FavoriteContact } from '../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface TransferModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: (amount: number, method: 'bKash' | 'Nagad' | 'Rocket' | 'Upay', targetNumber: string) => void;
  favorites?: FavoriteContact[];
}

type TransferMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Upay';

export default function TransferModal({ lang, isOpen, onClose, currentBalance, onSuccess, favorites = [] }: TransferModalProps) {
  const [method, setMethod] = useState<TransferMethod>('bKash');
  const [amountInput, setAmountInput] = useState<string>('');
  const [targetNumber, setTargetNumber] = useState<string>('');
  
  // Checking & validation states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<boolean>(false);

  // Contact book state managers
  const [showContactBook, setShowContactBook] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Dynamic limits configuration
  const [settings, setSettings] = useState({
    minTransfer: 50,
    maxTransfer: 25000,
  });

  useEffect(() => {
    if (!isOpen) return;
    const settingsDocRef = doc(db, 'settings', 'app_config');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          minTransfer: typeof data.minTransfer === 'number' ? data.minTransfer : 50,
          maxTransfer: typeof data.maxTransfer === 'number' ? data.maxTransfer : 25000,
        });
      }
    }, (error) => {
      console.error("Error loading settings in TransferModal: ", error);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // Localized string packs
  const labels = {
    title: lang === 'bn' ? 'ব্যালেন্স ট্রান্সফার করুন' : 'Transfer Balance',
    subtitle: lang === 'bn' ? 'আপনার ব্যালেন্স বিকাশ, নগদ, রকেট বা উপায়ে ট্রান্সফার করুন' : 'Transfer wallet funds to mobile financial services instantly',
    selectMethod: lang === 'bn' ? 'ট্রান্সফারের মাধ্যম নির্বাচন করুন' : 'Select Transfer Method',
    amtLabel: lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Enter Amount (৳)',
    targetLabel: lang === 'bn' ? 'প্রাপকের মোবাইল নম্বর' : 'Recipient Account Number',
    placeholderNumber: lang === 'bn' ? 'যেমন: 017XXXXXXXX' : 'e.g. 017XXXXXXXX',
    placeholderAmt: lang === 'bn' ? `ন্যূনতম ${settings.minTransfer} টাকা` : `Minimum ৳${settings.minTransfer}`,
    cancel: lang === 'bn' ? 'বাতিল' : 'Cancel',
    submit: lang === 'bn' ? 'টাকা ট্রান্সফার করুন' : 'Transfer Balance',
    successTitle: lang === 'bn' ? 'ট্রান্সফার সফল হয়েছে!' : 'Transfer Submitted!',
    successDesc: lang === 'bn' ? 'আপনার ট্রান্সফার অনুরোধটি এডমিন ভেরিফিকেশনের জন্য পাঠানো হয়েছে।' : 'Your transfer request is being processed and will complete shortly.',
    fees: lang === 'bn' ? 'সার্ভিস চার্জ: ৳ ০.০০ (ফ্রি)' : 'Service Charge: ৳0.00 (Free)',
    balWarning: lang === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স!' : 'Insufficient wallet balance!',
    currBal: lang === 'bn' ? `বর্তমান ব্যালেন্স: ৳${currentBalance.toLocaleString()}` : `Current Balance: ৳${currentBalance.toLocaleString()}`,
  };

  const getMethodColor = (m: TransferMethod) => {
    switch (m) {
      case 'bKash': return 'border-pink-500 bg-pink-500/10 text-pink-600';
      case 'Nagad': return 'border-orange-500 bg-orange-500/10 text-orange-600';
      case 'Rocket': return 'border-purple-600 bg-purple-600/10 text-purple-700';
      case 'Upay': return 'border-blue-500 bg-blue-500/10 text-blue-600';
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt < settings.minTransfer) {
      setValidationError(lang === 'bn' ? `অনুগ্রহ করে কমপক্ষে ${settings.minTransfer} টাকা বা তার বেশি প্রবেশ করান!` : `Minimum transfer limit is ৳${settings.minTransfer}.`);
      return;
    }

    if (amt > settings.maxTransfer) {
      setValidationError(lang === 'bn' ? `একবারে সর্বোচ্চ ${settings.maxTransfer.toLocaleString()} টাকা ট্রান্সফার করা যাবে!` : `Maximum transfer limit is ৳${settings.maxTransfer.toLocaleString()} per request.`);
      return;
    }

    if (amt > currentBalance) {
      setValidationError(lang === 'bn' ? 'দুঃখিত, আপনার ওয়ালেট ব্যালেন্স অপর্যাপ্ত!' : 'Sorry, your wallet balance is insufficient.');
      return;
    }

    if (!targetNumber.trim() || targetNumber.length < 11) {
      setValidationError(lang === 'bn' ? 'সঠিক ১১ সংখ্যার প্রাপক নম্বর দিন!' : 'Please input a valid 11-digit recipient number.');
      return;
    }

    setIsLoading(true);

    // Simulate transfer submit delay
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessOverlay(true);
      
      setTimeout(() => {
        onSuccess(amt, method, targetNumber);
        setShowSuccessOverlay(false);
        // Reset states
        setAmountInput('');
        setTargetNumber('');
        onClose();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center">
      
      {/* Backdrop overlay blur */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Main Bottom Sheet Panel Container */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-white w-full rounded-t-[32px] max-h-[92%] overflow-y-auto flex flex-col p-6 shadow-2xl border-t border-slate-100 z-10 font-sans select-none"
      >
        {/* Decorative Top Pill handle */}
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-5" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h2 className="text-slate-900 font-extrabold text-sm tracking-tight flex items-center gap-1.5">
              <ArrowUpRight className="h-5 w-5 text-violet-600 stroke-[2.5]" />
              <span>{labels.title}</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[320px]">
              {labels.subtitle}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Available Wallet Balance Pill */}
        <div className="mb-5 bg-violet-50/50 border border-violet-100/50 p-3 rounded-2xl flex justify-between items-center text-xs font-bold text-violet-800">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            {labels.currBal}
          </span>
          <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold font-mono">
            SECURE
          </span>
        </div>

        {/* Form Element */}
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          {/* MFS Method Selection */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {labels.selectMethod}
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {(['bKash', 'Nagad', 'Rocket', 'Upay'] as TransferMethod[]).map((m) => {
                const isSelected = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden cursor-pointer ${
                      isSelected 
                        ? `${getMethodColor(m)} border-2 shadow-xs scale-102`
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {/* Tiny tick badge if selected */}
                    {isSelected && (
                      <span className="absolute top-1 right-1 h-3 w-3 bg-violet-600 rounded-full flex items-center justify-center text-white">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </span>
                    )}
                    <span className="text-[11px] font-black tracking-tight">{m}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number Input Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {labels.targetLabel} ({method})
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-black select-none pointer-events-none">
                BD
              </div>
              <input
                type="tel"
                pattern="[0-9]*"
                maxLength={11}
                required
                value={targetNumber}
                onChange={(e) => setTargetNumber(e.target.value.replace(/\D/g, ''))}
                placeholder={labels.placeholderNumber}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-12 text-xs font-bold outline-none focus:border-violet-500 focus:bg-white transition-all text-slate-800 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowContactBook(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center border-0 outline-none"
                title={lang === 'bn' ? 'কন্টাক্ট তালিকা এবং ফোন ডিরেক্টরি' : 'Choose from contact book'}
              >
                <Users className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Amount input block */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {labels.amtLabel}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-black font-mono select-none pointer-events-none">
                ৳
              </span>
              <input
                type="number"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={labels.placeholderAmt}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-9 pr-4 text-xs font-extrabold outline-none focus:border-violet-500 focus:bg-white transition-all text-slate-800 font-mono"
              />
            </div>
            
            {/* Quick prefill shortcut buttons */}
            <div className="flex gap-2 mt-1.5 overflow-x-auto scrollbar-none pb-1">
              {[50, 100, 200, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountInput(String(val))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-extrabold py-1.5 px-3 rounded-full cursor-pointer transition-colors shrink-0"
                >
                  +৳{val}
                </button>
              ))}
            </div>
          </div>

          {/* Fee Indicator & Policy note */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-1">
            <p className="text-[10px] text-slate-500 font-bold flex justify-between items-center">
              <span>{labels.fees}</span>
              <span className="text-emerald-600 uppercase font-mono tracking-wider font-extrabold text-[9px]">NO COST</span>
            </p>
            <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
              {lang === 'bn' 
                ? `💡 অনুগ্রহ করে প্রাপকের নম্বরটি দুবার পরীক্ষা করুন। ভুল নম্বরে টাকা পাঠানোর জন্য কর্তৃপক্ষ দায়ী নয়।`
                : '💡 Please make sure the recipient number is correct. Admin approval happens in 5-30 minutes.'}
            </p>
          </div>

          {/* Validation Errors banner */}
          <AnimatePresence>
            {validationError && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-2xl flex items-start gap-2.5"
              >
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{validationError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dialog Action button triggers */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer select-none"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="py-3.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer select-none shadow-md disabled:bg-violet-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{lang === 'bn' ? 'প্রসেসিং...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4.5 w-4.5 stroke-[2.5]" />
                  <span>{labels.submit}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Success complete overlay */}
        <AnimatePresence>
          {showSuccessOverlay && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 z-40 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-emerald-600 stroke-[3]" />
              </div>
              <h3 className="text-slate-900 font-extrabold text-sm leading-tight mb-1.5">
                {labels.successTitle}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold max-w-[280px] leading-relaxed">
                {labels.successDesc}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECURE OVERLAY CONTACT PICKER & DIRECTORY COMPONENT */}
        <AnimatePresence>
          {showContactBook && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute inset-0 bg-white z-30 flex flex-col"
            >
              {/* Directory Header Banner */}
              <div className="px-5 py-4.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactBook(false);
                      setContactSearch('');
                    }}
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="font-extrabold text-sm text-slate-800 tracking-tight">
                    {lang === 'bn' ? 'কন্টাক্ট নম্বর সিলেক্ট করুন' : 'Select Contact Number'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowContactBook(false);
                    setContactSearch('');
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Dynamic Instant Search Filter */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder={lang === 'bn' ? 'নাম বা ফোন নম্বর দিয়ে খুঁজুন...' : 'Search name or mobile number...'}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200/80 rounded-xl py-3 pl-10 pr-10 outline-none focus:border-violet-500 font-medium transition-all"
                  />
                  {contactSearch && (
                    <button
                      type="button"
                      onClick={() => setContactSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-slate-200 text-slate-500 text-[10px] hover:bg-slate-300 font-bold flex items-center justify-center cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Database Contacts list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                {(() => {
                  const filtered = favorites.filter(contact => {
                    const query = contactSearch.toLowerCase();
                    return contact.name.toLowerCase().includes(query) || contact.number.includes(query);
                  });
                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <div className="p-3 bg-slate-50 w-fit rounded-full mx-auto">
                          <Users className="h-7 w-7 text-slate-350 stroke-[1.5]" />
                        </div>
                        <p className="text-xs font-bold">
                          {lang === 'bn' ? 'কোনো কন্টাক্ট নম্বর খুঁজে পাওয়া যায়নি' : 'No contacts matching search'}
                        </p>
                      </div>
                    );
                  }
                  return filtered.map((contact) => {
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => {
                          setTargetNumber(contact.number);
                          setShowContactBook(false);
                          setContactSearch('');
                        }}
                        className="w-full text-left p-3.5 flex items-center justify-between rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-100/70"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${contact.color || 'from-violet-600 to-indigo-400'} text-white font-black flex items-center justify-center text-xs tracking-tight shadow-xs uppercase font-display`}>
                            {contact.name.slice(0, 1)}
                          </div>
                          <div>
                            <h4 className="text-xs text-slate-850 font-extrabold tracking-tight">
                              {contact.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-mono font-bold mt-0.5 tracking-wider">
                              {contact.number}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-violet-50 text-violet-600">
                          {contact.operator}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
