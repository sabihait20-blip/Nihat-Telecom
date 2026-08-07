import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Landmark, Smartphone, Check, ShieldCheck, 
  HelpCircle, Sparkles, Plus, RefreshCw, AlertCircle, ArrowRight,
  UserCheck, Building2, Copy, CheckCircle2, ShieldAlert, Zap
} from 'lucide-react';
import { Language } from '../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface AddFundModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number, method: string, trxId: string, senderNumber: string, accountType: string) => void;
}

type DepositMethod = 'bkash' | 'nagad' | 'rocket' | 'upay';
type AccountType = 'agent' | 'personal';

export default function AddFundModal({ lang, isOpen, onClose, onSuccess }: AddFundModalProps) {
  const [accountType, setAccountType] = useState<AccountType>('agent');
  const [method, setMethod] = useState<DepositMethod>('bkash');
  const [amountInput, setAmountInput] = useState<string>('500');
  const [senderNumber, setSenderNumber] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<boolean>(false);

  const [settings, setSettings] = useState({
    agentBkashNumber: '01970250988',
    agentNagadNumber: '01970250988',
    agentRocketNumber: '019702509883',
    agentUpayNumber: '01970250988',
    personalBkashNumber: '01970250988',
    personalNagadNumber: '01970250988',
    personalRocketNumber: '019702509883',
    personalUpayNumber: '01970250988',
    personalCharge: '1.5% (প্রতি হাজারে ১৫ টাকা)',
    minAddFund: 100,
    maxAddFund: 25000,
  });

  useEffect(() => {
    if (!isOpen) return;
    const settingsDocRef = doc(db, 'settings', 'app_config');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          agentBkashNumber: data.agentBkashNumber || data.bkashNumber || '01970250988',
          agentNagadNumber: data.agentNagadNumber || data.nagadNumber || '01970250988',
          agentRocketNumber: data.agentRocketNumber || data.rocketNumber || '019702509883',
          agentUpayNumber: data.agentUpayNumber || data.bkashNumber || '01970250988',
          personalBkashNumber: data.personalBkashNumber || data.bkashNumber || '01970250988',
          personalNagadNumber: data.personalNagadNumber || data.nagadNumber || '01970250988',
          personalRocketNumber: data.personalRocketNumber || data.rocketNumber || '019702509883',
          personalUpayNumber: data.personalUpayNumber || data.bkashNumber || '01970250988',
          personalCharge: data.personalCharge || '1.5% (প্রতি হাজারে ১৫ টাকা)',
          minAddFund: typeof data.minAddFund === 'number' ? data.minAddFund : 100,
          maxAddFund: typeof data.maxAddFund === 'number' ? data.maxAddFund : 25000,
          autoAddFundEnabled: data.autoAddFundEnabled !== false,
        });
      }
    }, (error) => {
      console.error("Error loading settings in AddFundModal: ", error);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const labels = {
    title: lang === 'bn' ? 'ওয়ালেটে টাকা যোগ করুন' : 'Add Fund to Wallet',
    subtitle: lang === 'bn' ? 'এজেন্ট বা পার্সোনাল নম্বরে ক্যাশ আউট/সেন্ড মানি করে পেমেন্ট নিশ্চিত করুন' : 'Deposit via Agent Cash Out or Personal Send Money accounts',
    selectType: lang === 'bn' ? 'অ্যাকাউন্টের ধরন নির্বাচন করুন' : 'Select Account Type',
    selectMethod: lang === 'bn' ? 'মাধ্যম নির্বাচন করুন' : 'Select Operator',
    amtLabel: lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Enter Amount (৳)',
    senderLabel: lang === 'bn' ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন' : 'Your Sender Number / Account',
    trxLabel: lang === 'bn' ? 'ট্রানজেকশন আইডি (TrxID)' : 'Transaction ID (TrxID)',
    placeholderTrx: lang === 'bn' ? 'যেমন: 9H7K0L12M3' : 'e.g. 9H7K0L12M3',
    placeholderSender: lang === 'bn' ? 'যেমন: 017XXXXXXXX' : 'e.g. 017XXXXXXXX',
    placeholderAmt: lang === 'bn' ? `ন্যূনতম ${settings.minAddFund} টাকা` : `Minimum ৳${settings.minAddFund}`,
    cancel: lang === 'bn' ? 'বাতিল' : 'Cancel',
    submit: lang === 'bn' ? 'পেমেন্ট ভেরিফাই করুন' : 'Verify & Add Fund',
    successTitle: lang === 'bn' ? 'অনুরোধ সফল হয়েছে!' : 'Request Submitted!',
    successDesc: lang === 'bn' ? 'আপনার পেমেন্ট তথ্য অ্যাডমিন ভেরিফিকেশনের জন্য পাঠানো হয়েছে।' : 'Your deposit details have been sent for admin verification.',
    agentLabel: lang === 'bn' ? 'এজেন্ট (Cash Out)' : 'Agent (Cash Out)',
    personalLabel: lang === 'bn' ? 'পার্সোনাল (Send Money)' : 'Personal (Send Money)',
    copyNumber: lang === 'bn' ? 'নম্বর কপি করুন' : 'Copy Number',
    copiedText: lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!',
  };

  const getTargetNumber = () => {
    if (accountType === 'agent') {
      switch (method) {
        case 'bkash': return settings.agentBkashNumber;
        case 'nagad': return settings.agentNagadNumber;
        case 'rocket': return settings.agentRocketNumber;
        case 'upay': return settings.agentUpayNumber;
        default: return settings.agentBkashNumber;
      }
    } else {
      switch (method) {
        case 'bkash': return settings.personalBkashNumber;
        case 'nagad': return settings.personalNagadNumber;
        case 'rocket': return settings.personalRocketNumber;
        case 'upay': return settings.personalUpayNumber;
        default: return settings.personalBkashNumber;
      }
    }
  };

  const getMethodName = (m: DepositMethod) => {
    switch (m) {
      case 'bkash': return 'bKash';
      case 'nagad': return 'Nagad';
      case 'rocket': return 'Rocket';
      case 'upay': return 'Upay';
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(getTargetNumber());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt < settings.minAddFund) {
      setValidationError(lang === 'bn' ? `অনুগ্রহ করে কমপক্ষে ${settings.minAddFund} টাকা বা তার বেশি প্রবেশ করান!` : `Minimum deposit limit is ৳${settings.minAddFund}.`);
      return;
    }

    if (amt > settings.maxAddFund) {
      setValidationError(lang === 'bn' ? `একবারে সর্বোচ্চ ${settings.maxAddFund.toLocaleString()} টাকা যোগ করা যাবে!` : `Maximum deposit limit is ৳${settings.maxAddFund.toLocaleString()} per request.`);
      return;
    }

    if (!senderNumber.trim()) {
      setValidationError(lang === 'bn' ? 'প্রেরক নম্বর বা অ্যাকাউন্ট আইডিটি দিন!' : 'Sender account number is required.');
      return;
    }

    const cleanTrx = trxId.trim().toUpperCase();
    if (!cleanTrx || cleanTrx.length < 4) {
      setValidationError(lang === 'bn' ? 'সঠিক পেমেন্ট ট্রানজেকশন আইডি (TrxID) দিন!' : 'Please input a valid transaction ID.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessOverlay(true);

      setTimeout(() => {
        const fullMethodName = `${getMethodName(method)} (${accountType === 'agent' ? 'Agent' : 'Personal'})`;
        onSuccess(amt, fullMethodName, cleanTrx, senderNumber, accountType);
        setShowSuccessOverlay(false);
        setAmountInput('');
        setSenderNumber('');
        setTrxId('');
        onClose();
      }, 1800);
    }, 1000);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer" />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 24, stiffness: 220 }}
        className="relative bg-white w-full max-h-[92%] rounded-t-[36px] shadow-2xl p-6 border-t border-slate-150 flex flex-col space-y-4 relative z-10 overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />

        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mt-1">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-slate-900 font-black text-sm tracking-tight">{labels.title}</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-extrabold text-[9px] border border-blue-200 uppercase tracking-wide">
                  {accountType === 'agent' ? labels.agentLabel : labels.personalLabel}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">{labels.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account Type Selector: Agent vs Personal */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block ml-1">
            {labels.selectType}
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setAccountType('agent')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                accountType === 'agent'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>{labels.agentLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('personal')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                accountType === 'personal'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>{labels.personalLabel}</span>
            </button>
          </div>
        </div>

        {/* Method Selector: bKash, Nagad, Rocket, Upay */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block ml-1">
            {labels.selectMethod}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'bkash', name: 'bKash', color: 'pink', logo: 'https://mohammadalinijhoom.com/wp-content/uploads/2024/07/bKash-Logo.png' },
              { id: 'nagad', name: 'Nagad', color: 'orange', logo: 'https://play-lh.googleusercontent.com/a4Qhv-EDolTnZlCq5p1ybZRF4J0dHKjDQEYrfOXqjsHvsKX5EXHVc8M0Vbh7Qfsn8LeNBIWdP6pbzHkEPMs3MQ=w600-h300-pc0xffffff-pd' },
              { id: 'rocket', name: 'Rocket', color: 'purple', logo: 'https://static.vecteezy.com/system/resources/thumbnails/068/706/013/small/rocket-color-logo-mobile-banking-icon-free-png.png' },
              { id: 'upay', name: 'Upay', color: 'teal', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Upay_logo.svg/250px-Upay_logo.svg.png' },
            ].map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id as DepositMethod)}
                className={`p-2 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                  method === m.id 
                    ? `border-${m.color}-500 bg-${m.color}-50 text-${m.color}-700 shadow-sm font-black` 
                    : 'border-slate-150 hover:border-slate-300 text-slate-500'
                }`}
              >
                <div className="h-8 w-8 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-150 shadow-2xs mb-1 overflow-hidden shrink-0">
                  <img src={m.logo} alt={m.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[10px] font-bold">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Number Display & Copy Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
              <img 
                src={
                  method === 'bkash' ? 'https://mohammadalinijhoom.com/wp-content/uploads/2024/07/bKash-Logo.png' :
                  method === 'nagad' ? 'https://play-lh.googleusercontent.com/a4Qhv-EDolTnZlCq5p1ybZRF4J0dHKjDQEYrfOXqjsHvsKX5EXHVc8M0Vbh7Qfsn8LeNBIWdP6pbzHkEPMs3MQ=w600-h300-pc0xffffff-pd' :
                  method === 'rocket' ? 'https://static.vecteezy.com/system/resources/thumbnails/068/706/013/small/rocket-color-logo-mobile-banking-icon-free-png.png' :
                  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Upay_logo.svg/250px-Upay_logo.svg.png'
                }
                alt={getMethodName(method)}
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">
                {getMethodName(method)} {accountType === 'agent' ? 'Agent Number' : 'Personal Number'}
              </span>
              <span className="text-sm font-black text-slate-900 font-mono tracking-wide">
                {getTargetNumber()}
              </span>
              {accountType === 'personal' && settings.personalCharge && (
                <p className="text-[9.5px] text-amber-600 font-bold mt-0.5">
                  {lang === 'bn' ? `চার্জ: ${settings.personalCharge}` : `Charge: ${settings.personalCharge}`}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyNumber}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? labels.copiedText : labels.copyNumber}</span>
          </button>
        </div>

        {/* Manual Deposit Form */}
        <form onSubmit={handleAddFundSubmit} className="space-y-3.5">
          {/* Amount input */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block ml-1">
              {labels.amtLabel}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-extrabold text-xs">
                ৳
              </span>
              <input
                type="number"
                required
                min={settings.minAddFund}
                max={settings.maxAddFund}
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

          {/* Preset quick buttons */}
          <div className="flex gap-2 justify-start overflow-x-auto pb-1">
            {['100', '500', '1000', '2000', '5000', '10000'].map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setAmountInput(preset)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                  amountInput === preset
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200/40'
                }`}
              >
                ৳{preset}
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
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder={labels.placeholderSender}
                value={senderNumber}
                onChange={(e) => {
                  setValidationError('');
                  setSenderNumber(e.target.value.replace(/\D/g, ''));
                }}
                className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Trx ID input */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block ml-1">
              {labels.trxLabel}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
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
                className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all font-mono uppercase tracking-wider"
              />
            </div>
          </div>

          {/* Validation error message */}
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
                <span className="text-slate-400">{lang === 'bn' ? 'মাধ্যম:' : 'Method:'}</span>
                <span className="text-white font-bold">{getMethodName(method)} ({accountType})</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{lang === 'bn' ? 'টাকার পরিমাণ:' : 'Amount:'}</span>
                <span className="text-emerald-400 font-bold">৳{amountInput}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">{lang === 'bn' ? 'TrxID:' : 'TrxID:'}</span>
                <span className="text-blue-300 font-bold tracking-wider">{trxId}</span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
