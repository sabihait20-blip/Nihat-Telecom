import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ArrowLeft, Smartphone, ShieldCheck, CheckCircle2,
  AlertTriangle, CreditCard, ChevronRight, Download, Share2, HelpCircle,
  Users, Search, AlertCircle
} from 'lucide-react';
import { Operator, ConnectionType, Language, FavoriteContact } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { OPERATORS } from '../data/mockData';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentBalance: number;
  onSuccess: (amount: number, operator: Operator, number: string) => void;
  initialOperator?: Operator | null;
  initialAmount?: number | null;
  favorites?: FavoriteContact[];
  onAddFundRedirect?: () => void;
}

export default function RechargeModal({
  isOpen,
  onClose,
  lang,
  currentBalance,
  onSuccess,
  initialOperator,
  initialAmount,
  favorites = [],
  onAddFundRedirect,
}: RechargeModalProps) {
  // Navigation steps: 'number' | 'operator' | 'amount' | 'pin' | 'confirm' | 'success'
  const [step, setStep] = useState<'number' | 'operator' | 'amount' | 'pin' | 'confirm' | 'success'>('number');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedOp, setSelectedOp] = useState<Operator>('GP');
  const [connectionType, setConnectionType] = useState<ConnectionType>('Prepaid');
  const [amount, setAmount] = useState<string>('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // States for custom beautiful balance alert popups
  const [showLowBalanceAlert, setShowLowBalanceAlert] = useState(false);
  const [lowBalanceRequired, setLowBalanceRequired] = useState(0);

  // Contact book state managers
  const [showContactBook, setShowContactBook] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  
  // Hold-to-confirm animation states
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const t = TRANSLATIONS[lang];

  // Load initial promo selections if available
  useEffect(() => {
    if (isOpen) {
      if (initialOperator) {
        setSelectedOp(initialOperator);
        setStep('number'); // Go back to number entry first, but with pre-filled operator guess
      }
      if (initialAmount) {
        setAmount(initialAmount.toString());
      }
    } else {
      // Reset Modal on exit
      setStep('number');
      setPhoneNumber('');
      setSelectedOp('GP');
      setConnectionType('Prepaid');
      setAmount('');
      setPin('');
      setPinError(false);
      setHoldProgress(0);
      setIsHolding(false);
      setShowContactBook(false);
      setContactSearch('');
      setShowLowBalanceAlert(false);
      setLowBalanceRequired(0);
    }
  }, [isOpen, initialOperator, initialAmount]);

  // Handle number prefixes and auto-detect operator
  useEffect(() => {
    if (phoneNumber.length >= 3) {
      const prefix = phoneNumber.slice(0, 3);
      for (const [opCode, details] of Object.entries(OPERATORS)) {
        if (details.prefixes.includes(prefix)) {
          setSelectedOp(opCode as Operator);
          break;
        }
      }
    }
  }, [phoneNumber]);

  if (!isOpen) return null;

  const handleNumberNext = () => {
    if (phoneNumber.length === 11 && phoneNumber.startsWith('01')) {
      setStep('operator');
    }
  };

  const handleOperatorNext = () => {
    setStep('amount');
  };

  const handleAmountNext = () => {
    const numAmt = parseFloat(amount);
    if (!isNaN(numAmt) && numAmt >= 10 && numAmt <= 5000) {
      if (numAmt > currentBalance) {
        setLowBalanceRequired(numAmt);
        setShowLowBalanceAlert(true);
        return;
      }
      setStep('pin');
    }
  };

  const handlePinNext = () => {
    const savedPin = localStorage.getItem('secure_wallet_pin') || '1234';
    if (pin === savedPin) {
      setPinError(false);
      setStep('confirm');
    } else {
      setPinError(true);
      setPin('');
    }
  };

  // Safe HOLD TO CONFIRM action handlers
  const startHolding = () => {
    setIsHolding(true);
    const startTime = Date.now();
    const duration = 1500; // Hold down for 1.5s

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setHoldProgress(progress * 100);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        // Successful lock! Trigger transactional payload
        setIsHolding(false);
        setStep('success');
        onSuccess(parseFloat(amount), selectedOp, phoneNumber);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const stopHolding = () => {
    setIsHolding(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    // Slowly discharge progress bar
    const discharge = () => {
      setHoldProgress((prev) => {
        if (prev <= 0) return 0;
        const newProgress = Math.max(prev - 8, 0);
        if (newProgress > 0) {
          setTimeout(discharge, 16);
        }
        return newProgress;
      });
    };
    discharge();
  };

  const handleNumberInput = (num: string) => {
    if (phoneNumber.length < 11) {
      setPhoneNumber((prev) => prev + num);
    }
  };

  const handleDeleteNumber = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  // Keyboard keypad suggestions
  const suggAmounts = [20, 50, 100, 200, 500, 1000];

  const currentOpDetails = OPERATORS[selectedOp];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop glass blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
      >
        {/* Step Indicator Header banner */}
        <div className={`px-5 py-4 flex items-center justify-between text-white bg-gradient-to-r ${currentOpDetails.gradient} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 h-20 w-20 bg-white/5 rounded-full translate-x-4 -translate-y-4 blur-md" />
          
          <div className="flex items-center gap-2 relative z-10">
            {step !== 'number' && step !== 'success' && (
              <button
                onClick={() => {
                  if (step === 'operator') setStep('number');
                  else if (step === 'amount') setStep('operator');
                  else if (step === 'pin') setStep('amount');
                  else if (step === 'confirm') setStep('pin');
                }}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="font-bold text-base tracking-tight font-display flex items-center gap-1.5">
              <Smartphone className="h-4.5 w-4.5" />
              {t.mobileRecharge}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-all cursor-pointer relative z-10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">

          {/* STEP 1: Phone Number Input */}
          {step === 'number' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.enterNumber}
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 rounded-lg text-blue-600 font-bold text-xs select-none">
                    +88
                  </div>
                  <input
                    type="text"
                    value={phoneNumber}
                    placeholder={t.phonePlaceholder}
                    readOnly
                    className="w-full text-slate-900 bg-slate-50 border-2 border-slate-200/60 rounded-2xl py-3.5 pl-17 pr-14 outline-none font-mono text-lg font-bold tracking-widest text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowContactBook(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center border-0 outline-none"
                    title={lang === 'bn' ? 'কন্টাক্ট তালিকা এবং ফোন ডিরেক্টরি' : 'Choose from contact book'}
                  >
                    <Users className="h-5 w-5" />
                  </button>
                </div>
                {phoneNumber.length > 0 && phoneNumber.length < 11 && (
                  <p className="text-rose-500 text-[10px] font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t.invalidNumber}
                  </p>
                )}
              </div>

              {/* Grid numeric pad layout */}
              <div className="grid grid-cols-3 gap-2 py-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleNumberInput(val)}
                    className="h-12 border border-slate-100 hover:bg-slate-50 bg-white shadow-xs rounded-xl flex items-center justify-center font-display text-slate-800 text-sm font-bold cursor-pointer transition-colors"
                  >
                    {val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumberInput('0')}
                  className="h-12 border border-slate-100 hover:bg-slate-50 bg-white shadow-xs rounded-xl flex items-center justify-center font-display text-slate-800 text-sm font-bold cursor-pointer transition-colors col-span-2 text-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleDeleteNumber}
                  className="h-12 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 text-sm font-semibold cursor-pointer transition-colors"
                >
                  {lang === 'bn' ? 'মুছুন' : 'Delete'}
                </button>
              </div>

              <button
                onClick={handleNumberNext}
                disabled={phoneNumber.length !== 11}
                className="w-full h-11 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                {t.next}
              </button>
            </div>
          )}

          {/* STEP 2: Operator Custom Select & connection segments */}
          {step === 'operator' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.selectOperator}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(OPERATORS).map(([code, op]) => (
                    <button
                      key={code}
                      onClick={() => setSelectedOp(code as Operator)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        selectedOp === code
                          ? 'border-blue-600 bg-blue-50/65 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={`h-8 w-8 rounded-xl ${op.color} text-white font-bold text-xs flex items-center justify-center flex-shrink-0`}>
                        {code.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h4 className="text-slate-900 font-bold text-xs tracking-tight">
                          {lang === 'bn' ? op.nameBn : op.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {op.prefixes.join(', ')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Connection Type segmented selection */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.selectConnection}
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl">
                  {(['Prepaid', 'Postpaid', 'Skitto'] as ConnectionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setConnectionType(type)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        connectionType === type
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setStep('number')}
                  className="flex-1 h-11 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {t.back}
                </button>
                <button
                  onClick={handleOperatorNext}
                  className="flex-1 h-11 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Enter Amount with keyboard assistance */}
          {step === 'amount' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {t.enterAmount}
                  </label>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {lang === 'bn' ? 'ব্যালেন্স: ৳' : 'Balance: ৳'}{currentBalance.toLocaleString()}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-slate-400 text-xl font-semibold">
                    ৳
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="৳১০ - ৳৫,০০০"
                    className="w-full text-slate-950 font-display font-bold text-2xl bg-slate-50 border-2 border-slate-200/60 rounded-2xl py-3 pl-9 pr-4 outline-none focus:border-blue-500 text-left"
                    min="10"
                    max="5000"
                  />
                </div>
              </div>

              {/* Suggested keyboard shortcut buttons */}
              <div className="space-y-2">
                <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  {t.popularAmounts}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {suggAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      className={`py-2 px-1 text-xs font-bold border rounded-xl font-display cursor-pointer transition-all ${
                        amount === amt.toString()
                          ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setStep('operator')}
                  className="flex-1 h-11 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {t.back}
                </button>
                <button
                  onClick={handleAmountNext}
                  disabled={!amount || parseFloat(amount) < 10 || parseFloat(amount) > 5000}
                  className="flex-1 h-11 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl shadow-md cursor-pointer"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Mock 4-Digit Security PIN validation */}
          {step === 'pin' && (
            <div className="space-y-4">
              <div className="space-y-2 text-center">
                <div className="mx-auto h-12 w-12 bg-blue-50 border border-blue-100/50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 stroke-[1.8]" />
                </div>
                <h3 className="text-slate-900 font-bold text-sm">
                  {t.enterPin}
                </h3>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 4) setPin(val);
                  }}
                  maxLength={4}
                  placeholder={t.pinPlaceholder}
                  className="w-40 mx-auto block text-center text-slate-950 text-2xl font-bold tracking-[1.5em] bg-slate-100 border border-slate-200 rounded-2xl py-3 outline-none focus:border-blue-500 font-mono"
                />
                
                {pinError && (
                  <p className="text-center text-rose-500 text-[10px] font-bold">
                    {lang === 'bn' ? 'ভুল পিন দিয়েছেন! পুনরায় চেষ্টা করুন।' : 'Incorrect PIN! Please try again.'}
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setStep('amount')}
                  className="flex-1 h-11 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {t.back}
                </button>
                <button
                  onClick={handlePinNext}
                  disabled={pin.length !== 4}
                  className="flex-1 h-11 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl shadow-md cursor-pointer"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: HOLD TO CONFIRM Swiper screen */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center">
                {t.confirmDetails}
              </h3>

              {/* Receipt metadata overview block */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">{t.rechargeTarget}</span>
                  <span className="text-slate-900 font-bold font-mono text-xs">{phoneNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">{lang === 'bn' ? 'অপারেটর' : 'Operator'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-4.5 w-4.5 rounded-md ${currentOpDetails.color} text-white font-mono text-[9px] font-bold flex items-center justify-center`}>
                      {selectedOp[0]}
                    </span>
                    <span className="text-slate-900 font-bold text-xs">{selectedOp}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">{t.connectionType}</span>
                  <span className="text-slate-900 font-bold text-xs">{connectionType}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-500 font-bold">{t.rechargeAmount}</span>
                  <span className="text-blue-600 font-display font-extrabold text-sm">৳{parseFloat(amount).toLocaleString()}</span>
                </div>
              </div>

              {/* SWIPE HELD confirm area */}
              <div className="relative pt-4 flex flex-col items-center">
                <button
                  onMouseDown={startHolding}
                  onMouseUp={stopHolding}
                  onMouseLeave={stopHolding}
                  onTouchStart={startHolding}
                  onTouchEnd={stopHolding}
                  id="hold-confirm-bar-btn"
                  className="relative overflow-hidden w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-xs tracking-wide flex items-center justify-center cursor-pointer select-none border border-slate-800"
                >
                  {/* Dynamic slider progress filter */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-blue-600 opacity-90 transition-all duration-75"
                    style={{ width: `${holdProgress}%` }}
                  />

                  <span className="relative z-10 flex items-center gap-2 font-display text-[11px] uppercase tracking-wider">
                    {isHolding ? t.recharging : t.holdToConfirm}
                  </span>
                </button>

                {/* Progress helper guidelines */}
                <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                  {lang === 'bn' ? 'কনফার্ম করতে বাটনটি চেপে ধরে রাখুন' : 'Keep pressing down on the button to validate.'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Successful reception & financial receipt output */}
          {step === 'success' && (
            <div className="space-y-5 text-center py-4">
              {/* Confetti floating layout wrapper */}
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 h-16 w-16 bg-emerald-100 rounded-full animate-ping opacity-25" />
                <div className="h-16 w-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 relative z-10">
                  <CheckCircle2 className="h-10 w-10 stroke-[2]" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-emerald-600 font-extrabold font-display text-lg tracking-tight">
                  {t.successTitle}
                </h3>
                <p className="text-slate-500 text-xs">
                  {t.successDesc}
                </p>
              </div>

              {/* Fancy receipt output */}
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2.5 max-w-[90%] mx-auto font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.rechargeTarget}</span>
                  <span className="text-slate-900 font-mono font-bold">{phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.rechargeAmount}</span>
                  <span className="text-slate-900 font-bold">৳{parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.txId}</span>
                  <span className="text-indigo-600 font-mono font-bold tracking-tight">FLX{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.date}</span>
                  <span className="text-slate-900 font-mono font-bold">2026-06-21 11:58 PST</span>
                </div>
              </div>

              {/* Receipt sharing buttons */}
              <div className="flex justify-center gap-2 max-w-[90%] mx-auto">
                <button
                  onClick={() => alert(lang === 'bn' ? 'রসিদ সংরক্ষিত হয়েছে!' : 'Receipt PDF downloaded!')}
                  id="download-receipt-btn"
                  className="flex-1 py-2 text-[10px] font-bold border border-slate-200 text-slate-700 bg-white rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t.downloadReceipt}</span>
                </button>
                <button
                  onClick={() => alert(lang === 'bn' ? 'শেয়ারিং লিঙ্ক কপি করা হয়েছে!' : 'Sharing link copied!')}
                  id="share-receipt-btn"
                  className="px-3.5 py-2 text-[10px] border border-slate-200 text-slate-700 bg-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                  title="Share"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  id="recharge-close-btn"
                  className="w-full h-11 text-xs font-bold text-white bg-slate-950 hover:bg-slate-900 rounded-xl cursor-pointer"
                >
                  {t.close}
                </button>
              </div>
            </div>
          )}
        </div>

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
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200/80 rounded-xl py-3 pl-10 pr-10 outline-none focus:border-blue-500 font-medium transition-all"
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

              {/* Secure Phone Native Contact Exporter Link (If applicable) */}
              {typeof navigator !== 'undefined' && 'contacts' in navigator && typeof (navigator as any).contacts?.select === 'function' && (typeof window !== 'undefined' && window.self === window.top) && (
                <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-500 text-white rounded-lg">
                      <Smartphone className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-[11px] text-blue-800 font-black">
                        {lang === 'bn' ? 'ডিভাইসের কন্টাক্ট ডিরেক্টরি' : 'Device Address Book'}
                      </h4>
                      <p className="text-[9px] text-blue-500 mt-0.5 font-bold">
                        {lang === 'bn' ? 'সরাসরি ফোনের কন্টাক্ট বুক থেকে বাছুন' : 'Import securely from device storage'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const props = ['name', 'tel'];
                        const opts = { multiple: false };
                        // @ts-ignore
                        const contactsSelected = await navigator.contacts.select(props, opts);
                        if (contactsSelected && contactsSelected.length > 0) {
                          const contact = contactsSelected[0];
                          if (contact.tel && contact.tel.length > 0) {
                            let rawNum = contact.tel[0].replace(/\s+/g, '').replace(/-/g, '');
                            if (rawNum.startsWith('+880')) {
                              rawNum = rawNum.substring(3);
                            } else if (rawNum.startsWith('880')) {
                              rawNum = rawNum.substring(2);
                            } else if (rawNum.startsWith('+88')) {
                              rawNum = rawNum.replace('+88', '');
                            }
                            
                            if (rawNum.length === 11 && rawNum.startsWith('01')) {
                              setPhoneNumber(rawNum);
                            } else if (rawNum.length === 10 && rawNum.startsWith('1')) {
                              setPhoneNumber('0' + rawNum);
                            } else {
                              const digitOnly = rawNum.replace(/\D/g, '');
                              if (digitOnly.startsWith('880')) {
                                setPhoneNumber(digitOnly.substring(2));
                              } else if (digitOnly.length === 11) {
                                setPhoneNumber(digitOnly);
                              } else {
                                alert(lang === 'bn' ? `দুঃখিত, নম্বরটি সঠিক ফরম্যাটে নেই: ${rawNum}` : `Parsed number format invalid: ${rawNum}`);
                              }
                            }
                            setShowContactBook(false);
                            setContactSearch('');
                          }
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black tracking-wide transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    {lang === 'bn' ? 'খুলুন' : 'Open'}
                  </button>
                </div>
              )}

              {/* Dynamic Database Contacts list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                {(() => {
                  const contactsToDisplay = favorites;
                  const filtered = contactsToDisplay.filter(contact => {
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
                    const opDetails = OPERATORS[contact.operator];
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => {
                          setPhoneNumber(contact.number);
                          if (contact.operator) {
                            setSelectedOp(contact.operator);
                          }
                          setShowContactBook(false);
                          setContactSearch('');
                        }}
                        className="w-full text-left p-3.5 flex items-center justify-between rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-100/70"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${opDetails?.gradient || 'from-blue-600 to-sky-400'} text-white font-black flex items-center justify-center text-xs tracking-tight shadow-xs uppercase font-display`}>
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

                        {opDetails && (
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg text-white ${opDetails.color} shadow-xs`}>
                             {lang === 'bn' ? opDetails.nameBn : opDetails.id}
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}

          {showLowBalanceAlert && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-white/98 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center text-slate-800"
            >
              {/* Pulsing light-red glowing ring surrounding AlertCircle */}
              <div className="relative mb-5 flex items-center justify-center">
                <div className="absolute inset-0 h-16 w-16 bg-rose-100 rounded-full animate-ping opacity-35" />
                <div className="h-16 w-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600 relative z-10 shadow-md">
                  <AlertCircle className="h-8 w-8 stroke-[2]" />
                </div>
              </div>

              <div className="space-y-2 mb-6 max-w-xs">
                <h3 className="text-slate-900 font-extrabold text-base font-display tracking-tight">
                  {lang === 'bn' ? 'পর্যাপ্ত ব্যালেন্স নেই!' : 'Insufficient Balance!'}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                  {lang === 'bn' 
                    ? 'দুঃখিত, রিচার্জ করার জন্য আপনার ওয়ালেটে পর্যাপ্ত পরিমাণ অর্থ নেই।' 
                    : 'Sorry, your wallet balance is insufficient to complete this recharge.'}
                </p>
              </div>

              {/* Amount side-by-side comparison boxes */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-left">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                    {lang === 'bn' ? 'আপনার বর্তমান ব্যালেন্স' : 'Current Balance'}
                  </span>
                  <span className="text-slate-800 font-display font-extrabold text-xs block mt-1">
                    ৳{currentBalance.toLocaleString()}
                  </span>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3 text-left">
                  <span className="text-[10px] text-rose-400 font-black uppercase tracking-wider block">
                    {lang === 'bn' ? 'প্রয়োজনীয় ব্যালেন্স' : 'Recharge Sum'}
                  </span>
                  <span className="text-rose-600 font-display font-extrabold text-xs block mt-1">
                    ৳{lowBalanceRequired.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="space-y-2 w-full max-w-xs">
                {onAddFundRedirect && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLowBalanceAlert(false);
                      onAddFundRedirect();
                    }}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-all active:scale-98 cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4 text-white" />
                    <span>{lang === 'bn' ? 'টাকা যোগ করুন' : 'Add Fund Now'}</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setShowLowBalanceAlert(false)}
                  className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-98 cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল করুন' : 'Cancel & Go Back'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
