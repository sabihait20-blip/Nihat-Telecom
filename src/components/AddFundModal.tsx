import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Landmark, Smartphone, LandmarkIcon, Check, ShieldCheck, 
  HelpCircle, Sparkles, Plus, RefreshCw, AlertCircle, ArrowRight 
} from 'lucide-react';
import { Language } from '../types';

interface AddFundModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number, method: string, trxId: string, senderNumber: string) => void;
}

type DepositMethod = 'bkash' | 'nagad' | 'rocket';

export default function AddFundModal({ lang, isOpen, onClose, onSuccess }: AddFundModalProps) {
  const [method, setMethod] = useState<DepositMethod>('bkash');
  const [amountInput, setAmountInput] = useState<string>('');
  const [senderNumber, setSenderNumber] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  
  // Checking & validation states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<boolean>(false);

  if (!isOpen) return null;

  // Localized string packs
  const labels = {
    title: lang === 'bn' ? 'ওয়ালেটে টাকা যোগ করুন' : 'Add Fund to Wallet',
    subtitle: lang === 'bn' ? 'মোবাইল ব্যাংকিংয়ের মাধ্যমে ব্যালেন্স রিচার্জ করুন' : 'Deposit balance securely via mobile banking send money',
    selectMethod: lang === 'bn' ? 'টাকা যোগ করার মাধ্যম নির্বাচন করুন' : 'Select Deposit Method',
    merchantInstr: lang === 'bn' ? 'টাকা পাঠানোর নিয়মাবলী (Send Money)' : 'Instructions (Send Money)',
    amtLabel: lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Enter Amount (৳)',
    senderLabel: lang === 'bn' ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন' : 'Your Sender Number / Account',
    trxLabel: lang === 'bn' ? 'লেনদেনের ট্রানজেকশন আইডি (TrxID)' : 'Payment Transaction ID (TrxID)',
    placeholderTrx: lang === 'bn' ? 'যেমন: bK92H7K0L' : 'e.g. BK92H7K0L',
    placeholderSender: lang === 'bn' ? 'যেমন: 017XXXXXXXX' : 'e.g. 017XXXXXXXX',
    placeholderAmt: lang === 'bn' ? 'ন্যূনতম ১০০ টাকা' : 'Minimum ৳100',
    cancel: lang === 'bn' ? 'বাতিল' : 'Cancel',
    submit: lang === 'bn' ? 'টাকা যোগ করুন' : 'Verify & Add Fund',
    successTitle: lang === 'bn' ? 'টাকা যোগ সফল হয়েছে!' : 'Fund Added Successfully!',
    successDesc: lang === 'bn' ? 'আপনার ব্যালেন্স সাথে সাথে আপডেট করা হয়েছে।' : 'Your digital wallet balance has been updated instantly.',
    fees: lang === 'bn' ? 'সার্ভিস চার্জ: ৳ ০.০০ (ফ্রি)' : 'Service Charge: ৳0.00 (Free)',
  };

  const getPersonalNumber = (m: DepositMethod) => {
    switch (m) {
      case 'bkash': return '01970250988';
      case 'nagad': return '01970250988';
      case 'rocket': return '019702509883';
      default: return '01970250988';
    }
  };

  const getMethodColor = (m: DepositMethod) => {
    switch (m) {
      case 'bkash': return 'border-pink-500 bg-pink-500/10 text-pink-600';
      case 'nagad': return 'border-orange-500 bg-orange-500/10 text-orange-600';
      case 'rocket': return 'border-purple-600 bg-purple-600/10 text-purple-700';
    }
  };

  const getMethodName = (m: DepositMethod) => {
    switch (m) {
      case 'bkash': return 'bKash';
      case 'nagad': return 'Nagad';
      case 'rocket': return 'Rocket';
    }
  };

  // Pre-fill TrxID generator for ease of simulation
  const handleAutoFillTrx = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTrxId(result);
    setSenderNumber('017' + Math.floor(10000000 + Math.random() * 90000000).toString());
    setValidationError('');
  };

  const handleAddFundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt < 100) {
      setValidationError(lang === 'bn' ? 'অনুগ্রহ করে কমপক্ষে ১০০ টাকা বা তার বেশি প্রবেশ করান!' : 'Minimum deposit limit is ৳100.');
      return;
    }

    if (amt > 25000) {
      setValidationError(lang === 'bn' ? 'একবারে সর্বোচ্চ ২৫,০০০ টাকা যোগ করা যাবে!' : 'Maximum deposit limit is ৳25,000 per request.');
      return;
    }

    if (!senderNumber.trim()) {
      setValidationError(lang === 'bn' ? 'প্রেরক নম্বর বা অ্যাকাউন্ট আইডিটি দিন!' : 'Sender account number is required.');
      return;
    }

    if (!trxId.trim() || trxId.length < 6) {
      setValidationError(lang === 'bn' ? 'সঠিক পেমেন্ট ট্রানজেকশন আইডি (TrxID) দিন!' : 'Please input a valid transaction ID of 6+ characters.');
      return;
    }

    setIsLoading(true);

    // Simulate payment API secure check latency
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessOverlay(true);
      
      // Complete transaction sync callback after success screen animations
      setTimeout(() => {
        onSuccess(amt, getMethodName(method), trxId, senderNumber);
        setShowSuccessOverlay(false);
        // Reset states
        setAmountInput('');
        setSenderNumber('');
        setTrxId('');
        onClose();
      }, 2000);
    }, 1800);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center">
      
      {/* Backdrop overlay blur */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Modal Slide Drawer */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 24, stiffness: 220 }}
        className="relative bg-white w-full max-h-[92%] rounded-t-[36px] shadow-2xl p-6 border-t border-slate-150 flex flex-col space-y-4 relative z-10 overflow-y-auto"
      >
        {/* Top drag notch bar */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />

        {/* Modal Title Row */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mt-1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-slate-900 font-black text-sm tracking-tight">{labels.title}</h3>
              <p className="text-[10px] text-slate-400 font-semibold">{labels.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selector Panel block of MFS operators */}
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block ml-1">
            {labels.selectMethod}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* bKash MFS */}
            <button
              type="button"
              onClick={() => setMethod('bkash')}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                method === 'bkash' 
                  ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-[0_4px_12px_rgba(236,72,153,0.15)] font-black' 
                  : 'border-slate-150 hover:border-slate-300 text-slate-500'
              }`}
            >
              <div className="h-7 w-7 rounded-lg bg-pink-100 flex items-center justify-center text-pink-500 font-black text-xs font-mono mb-1">
                BK
              </div>
              <span className="text-[10px] font-bold">bKash</span>
            </button>

            {/* Nagad MFS */}
            <button
              type="button"
              onClick={() => setMethod('nagad')}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                method === 'nagad' 
                  ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-[0_4px_12px_rgba(249,115,22,0.15)] font-black' 
                  : 'border-slate-150 hover:border-slate-300 text-slate-500'
              }`}
            >
              <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-xs font-mono mb-1">
                NG
              </div>
              <span className="text-[10px] font-bold">Nagad</span>
            </button>

            {/* Rocket MFS */}
            <button
              type="button"
              onClick={() => setMethod('rocket')}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                method === 'rocket' 
                  ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-[0_4px_12px_rgba(147,51,234,0.15)] font-black' 
                  : 'border-slate-150 hover:border-slate-300 text-slate-500'
              }`}
            >
              <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-500 font-bold text-xs font-mono mb-1">
                RK
              </div>
              <span className="text-[10px] font-bold">Rocket</span>
            </button>
          </div>
        </div>

        {/* Dynamic Payment Instruction Panel */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
            <HelpCircle className="h-4 w-4 text-blue-500" />
            <span>{labels.merchantInstr}</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-1 leading-relaxed font-medium">
            <p>
              ১. আপনার {getMethodName(method)} অ্যাপে অথবা ডায়াল মেনুতে যান এবং{' '}
              <strong className="text-slate-900">Send Money (টাকা পাঠান)</strong> অপশনটি নির্বাচন করুন।
            </p>
            <p>
              ২. প্রাপক/প্রাপ্ত নাম্বার হিসেবে আমাদের এই পার্সোনাল নম্বরটি দিন:{' '}
              <strong className="text-blue-600 select-all font-mono text-xs">{getPersonalNumber(method)}</strong>
            </p>
            <p>
              ৩. টাকা পাঠানো হয়ে গেলে আপনার ট্রানজেকশন আইডি{' '}
              <strong className="text-slate-900">(TrxID)</strong> এবং আপনার প্রেরক নম্বর নিচে বসিয়ে সাবমিট করুন।
            </p>
          </div>
        </div>

        {/* Input fields form */}
        <form onSubmit={handleAddFundSubmit} className="space-y-3.5">
          {/* Amount input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                {labels.amtLabel}
              </label>
              <span className="text-[9.5px] font-extrabold text-indigo-600">{labels.fees}</span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-extrabold text-xs">
                ৳
              </span>
              <input
                type="number"
                required
                min="100"
                max="25000"
                placeholder={labels.placeholderAmt}
                value={amountInput}
                onChange={(e) => {
                  setValidationError('');
                  setAmountInput(e.target.value.replace(/\D/g, ''));
                }}
                className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-2xl py-3 pl-8 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Quick preset amount select tags */}
          <div className="flex gap-2 justify-start overflow-x-auto pb-1">
            {['100', '500', '1000', '2000', '5000'].map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setAmountInput(preset)}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all text-[10px] text-slate-600 font-extrabold border border-slate-200/40 cursor-pointer"
              >
                +৳{preset}
              </button>
            ))}
          </div>

          {/* Sender number input */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block ml-1">
              {labels.senderLabel}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Smartphone className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                placeholder={labels.placeholderSender}
                value={senderNumber}
                onChange={(e) => {
                  setValidationError('');
                  setSenderNumber(e.target.value);
                }}
                className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Trx ID input with auto-fill helper */}
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                {labels.trxLabel}
              </label>
              <button
                type="button"
                onClick={handleAutoFillTrx}
                className="text-[9.5px] font-black text-blue-600 hover:underline cursor-pointer"
              >
                {lang === 'bn' ? 'অটোফিল আইডি জেনারেট' : 'Auto-Generate Fake TrxID'}
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                placeholder={labels.placeholderTrx}
                value={trxId}
                onChange={(e) => {
                  setValidationError('');
                  setTrxId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                }}
                className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all font-mono uppercase"
              />
            </div>
          </div>

          {/* Native validation error message banner */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-600 text-[10.5px] font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Form Actions footer */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-center"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-800 disabled:to-indigo-800 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 focus:outline-none"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <span>{labels.submit}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Success Animation Fullscreen Overlay Drawer */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white text-center">
            {/* Visual pulsing rings */}
            <div className="relative mb-6 h-28 w-28 flex items-center justify-center">
              <motion.div
                animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full bg-emerald-500/20"
              />
              <div className="h-20 w-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                <Check className="h-10 w-10 stroke-[3]" />
              </div>
            </div>

            <h3 className="text-lg font-black font-display text-emerald-400 mb-1">
              {labels.successTitle}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mb-8">
              {labels.successDesc}
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-xs flex flex-col space-y-2 text-left font-mono">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{lang === 'bn' ? 'জমাকৃত মাধ্যম:' : 'Deposit Via:'}</span>
                <span className="text-white font-bold">{getMethodName(method)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{lang === 'bn' ? 'টাকার পরিমাণ:' : 'Amount Added:'}</span>
                <span className="text-emerald-400 font-bold">৳{amountInput}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{lang === 'bn' ? 'ট্রানজেকশন আইডি:' : 'TrxID:'}</span>
                <span className="text-blue-300 font-bold tracking-wider">{trxId}</span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
