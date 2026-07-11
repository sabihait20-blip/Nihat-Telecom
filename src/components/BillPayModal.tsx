import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ArrowLeft, Landmark, CreditCard, ShieldCheck, CheckCircle2,
  AlertTriangle, Eye, HelpCircle, Check, Search, ChevronRight, AlertCircle
} from 'lucide-react';
import { BillProvider, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { BILL_PROVIDERS } from '../data/mockData';

interface BillPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentBalance: number;
  onSuccess: (amount: number, billerName: string, billerNameBn: string) => void;
  billers?: BillProvider[];
  onAddFundRedirect?: () => void;
}

export default function BillPayModal({
  isOpen,
  onClose,
  lang,
  currentBalance,
  onSuccess,
  billers = BILL_PROVIDERS,
  onAddFundRedirect,
}: BillPayModalProps) {
  // Navigation steps: 'select' | 'details' | 'pin' | 'confirm' | 'success'
  const [step, setStep] = useState<'select' | 'details' | 'pin' | 'confirm' | 'success'>('select');
  const [selectedBiller, setSelectedBiller] = useState<BillProvider>(billers[0] || BILL_PROVIDERS[0]);
  const [customerId, setCustomerId] = useState('');
  const [billAmount, setBillAmount] = useState<string>('');
  
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // States for custom beautiful balance alert popups
  const [showLowBalanceAlert, setShowLowBalanceAlert] = useState(false);
  const [lowBalanceRequired, setLowBalanceRequired] = useState(0);

  // Update selected Biller when billers prop changes
  useEffect(() => {
    if (billers && billers.length > 0) {
      setSelectedBiller(billers[0]);
    }
  }, [billers]);

  // Hold-to-confirm animations
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setCustomerId('');
      setBillAmount('');
      setPin('');
      setPinError(false);
      setHoldProgress(0);
      setIsHolding(false);
      setSearchQuery('');
      setShowLowBalanceAlert(false);
      setLowBalanceRequired(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Custom bill amount generation based on customer ID length or random indices to make it feel "fetched"
  const fetchMockBill = () => {
    if (customerId.length >= 6) {
      const generatedBill = (parseInt(customerId.slice(-3)) || 0) + 180;
      if (generatedBill > currentBalance) {
        setLowBalanceRequired(generatedBill);
        setShowLowBalanceAlert(true);
        return;
      }
      setBillAmount(generatedBill.toString());
      setStep('pin');
    }
  };

  const handleBillerTap = (biller: BillProvider) => {
    setSelectedBiller(biller);
    setStep('details');
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
        setIsHolding(false);
        setStep('success');
        onSuccess(parseFloat(billAmount), selectedBiller.name, selectedBiller.nameBn);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const stopHolding = () => {
    setIsHolding(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
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

  // Filter bills in directory
  const filteredBillers = billers.filter((biller) => {
    const q = searchQuery ? searchQuery.toLowerCase() : '';
    const bName = biller.name || '';
    const bNameBn = biller.nameBn || '';
    return bName.toLowerCase().includes(q) || bNameBn.toLowerCase().includes(q);
  });

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
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
      >
        {/* Modal Top Branding Layout */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'select' && step !== 'success' && (
              <button
                onClick={() => {
                  if (step === 'details') setStep('select');
                  else if (step === 'pin') setStep('details');
                  else if (step === 'confirm') setStep('pin');
                }}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="font-bold text-base tracking-tight font-display flex items-center gap-1.5 text-blue-400">
              <Landmark className="h-4.5 w-4.5" />
              {t.billPayment}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Modal Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">

          {/* STEP 1: Select Biller Directory */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.selectBiller}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === 'bn' ? 'সেবাদাতা খুঁজুন...' : 'Search biller name...'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Grid directory list in high visual styling */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredBillers.map((biller) => (
                  <button
                    key={biller.id}
                    onClick={() => handleBillerTap(biller)}
                    id={`biller-tap-${biller.id}`}
                    className="w-full text-left p-3 rounded-2xl border border-slate-100 hover:border-blue-500 bg-white hover:bg-blue-50/10 flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      {biller.imageUrl ? (
                        <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center shadow-xs bg-slate-50">
                          <img 
                            src={biller.imageUrl} 
                            alt={biller.name} 
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`h-10 w-10 rounded-xl ${biller.logoColor} text-white font-bold text-sm flex items-center justify-center shadow-xs`}>
                          {biller.name[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="text-slate-900 font-bold text-xs">
                          {lang === 'bn' ? biller.nameBn : biller.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          {lang === 'bn' ? biller.categoryBn : biller.category}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-350 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Cust ID Input or balance verify */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                {selectedBiller.imageUrl ? (
                  <div className="h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-slate-150 bg-white flex items-center justify-center">
                    <img 
                      src={selectedBiller.imageUrl} 
                      alt={selectedBiller.name} 
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`h-11 w-11 rounded-xl ${selectedBiller.logoColor} text-white font-bold flex items-center justify-center`}>
                    {selectedBiller.name[0]}
                  </div>
                )}
                <div>
                  <h4 className="text-slate-950 font-extrabold text-sm font-display">
                    {lang === 'bn' ? selectedBiller.nameBn : selectedBiller.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {lang === 'bn' ? selectedBiller.categoryBn : selectedBiller.category}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.enterCustId}
                </label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.custNoPlaceholder}
                  className="w-full text-slate-900 bg-slate-50 border-2 border-slate-200/60 rounded-2xl py-3 px-4 outline-none font-mono text-base font-bold tracking-widest text-left focus:border-blue-500 transition-colors"
                />
                
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  {lang === 'bn'
                    ? 'আপনার গ্রাহক বিল অ্যাকাউন্টে বকেয়া বিল স্বয়ংক্রিয়ভাবে দেখাবে।'
                    : 'Your outstanding utility due index will be fetched from this ID code.'}
                </p>
              </div>

              <button
                onClick={fetchMockBill}
                disabled={customerId.length < 6}
                className="w-full h-11 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                {lang === 'bn' ? 'বিল খুঁজুন' : 'Find Outstanding Bill'}
              </button>
            </div>
          )}

          {/* STEP 3: Security PIN validator */}
          {step === 'pin' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wide">{t.billAmount}</h4>
                  <p className="text-xl font-display font-extrabold text-slate-900">৳{parseFloat(billAmount).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-slate-900 font-bold text-sm">
                  {t.enterPin}
                </h3>
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
                  onClick={() => setStep('details')}
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

          {/* STEP 4: Confirm billhold swipe */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center font-display">
                {t.confirmDetails}
              </h3>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">{lang === 'bn' ? 'বিলার সেবাদাতা' : 'Utility Provider'}</span>
                  <span className="text-slate-900 font-bold text-xs">{selectedBiller.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">{lang === 'bn' ? 'গ্রাহক আইডি' : 'Customer Account ID'}</span>
                  <span className="text-slate-900 font-bold font-mono text-xs">{customerId}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-500 font-bold">{lang === 'bn' ? 'পরিশোধের পরিমাণ' : 'Payment Amount'}</span>
                  <span className="text-red-500 font-display font-extrabold text-sm">৳{parseFloat(billAmount).toLocaleString()}</span>
                </div>
              </div>

              {/* Hold swipe down section */}
              <div className="relative pt-4 flex flex-col items-center">
                <button
                  onMouseDown={startHolding}
                  onMouseUp={stopHolding}
                  onMouseLeave={stopHolding}
                  onTouchStart={startHolding}
                  onTouchEnd={stopHolding}
                  id="bill-hold-confirm-btn"
                  className="relative overflow-hidden w-full h-14 bg-slate-950 text-white rounded-2xl font-bold text-xs tracking-wide flex items-center justify-center cursor-pointer select-none border border-slate-800"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-blue-600 opacity-90 transition-all duration-75"
                    style={{ width: `${holdProgress}%` }}
                  />
                  <span className="relative z-10 flex items-center gap-2 font-display text-[11px] uppercase tracking-wider">
                    {isHolding ? t.recharging : t.holdToConfirm}
                  </span>
                </button>
                <p className="text-[10px] text-slate-400 mt-2 text-center font-semibold">
                  {lang === 'bn' ? 'কনফার্ম করতে বাটনটি চেপে ধরুন' : 'Keep pressing the button down to approve bill pay.'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Bill Pay receipt */}
          {step === 'success' && (
            <div className="space-y-5 text-center py-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 h-16 w-16 bg-blue-100 rounded-full animate-ping opacity-25" />
                <div className="h-16 w-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/20 relative z-10">
                  <CheckCircle2 className="h-10 w-10 stroke-[2]" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-blue-600 font-extrabold font-display text-lg tracking-tight">
                  {lang === 'bn' ? 'বিল পে সফল হয়েছে' : 'Bill Paid Successfully!'}
                </h3>
                <p className="text-slate-500 text-xs">
                  {t.billSuccessDesc}
                </p>
              </div>

              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2.5 max-w-[90%] mx-auto font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'bn' ? 'সেবাদাতা' : 'Biller'}</span>
                  <span className="text-slate-900 font-bold">{selectedBiller.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'bn' ? 'গ্রাহক আইডি' : 'Customer Account'}</span>
                  <span className="text-slate-900 font-mono font-bold">{customerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === 'bn' ? 'পরিশোধিত বিল' : 'Paid Amount'}</span>
                  <span className="text-slate-900 font-bold">৳{parseFloat(billAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.txId}</span>
                  <span className="text-indigo-600 font-mono font-bold tracking-tight">FLX{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  id="bill-close-btn"
                  className="w-full h-11 text-xs font-bold text-white bg-slate-950 hover:bg-slate-900 rounded-xl cursor-pointer"
                >
                  {t.close}
                </button>
              </div>
            </div>
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
                    ? 'দুঃখিত, এই ইউটিলিটি বিলটি পরিশোধ করার জন্য আপনার ওয়ালেটে পর্যাপ্ত পরিমাণ অর্থ নেই।' 
                    : 'Sorry, your wallet balance is insufficient to complete this utility bill payment.'}
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
                    {lang === 'bn' ? 'দাবিকৃত বিলের পরিমাণ' : 'Outstanding Bill'}
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
        </div>
      </motion.div>
    </div>
  );
}
