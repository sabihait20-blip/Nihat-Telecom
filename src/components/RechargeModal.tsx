import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ArrowLeft, Smartphone, ShieldCheck, CheckCircle2,
  AlertTriangle, CreditCard, Download, Share2,
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
  // Navigation steps: 'form' | 'pin' | 'success'
  const [step, setStep] = useState<'form' | 'pin' | 'success'>('form');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedOp, setSelectedOp] = useState<Operator>('GP');
  const [isManualOp, setIsManualOp] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType>('Prepaid');
  const [amount, setAmount] = useState<string>('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // States for low balance alert
  const [showLowBalanceAlert, setShowLowBalanceAlert] = useState(false);
  const [lowBalanceRequired, setLowBalanceRequired] = useState(0);

  // Contact book state managers
  const [showContactBook, setShowContactBook] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const t = TRANSLATIONS[lang];

  // Load initial promo selections if available
  useEffect(() => {
    if (isOpen) {
      if (initialOperator) {
        setSelectedOp(initialOperator);
        setIsManualOp(true);
      }
      if (initialAmount) {
        setAmount(initialAmount.toString());
      }
    } else {
      // Reset Modal on exit
      setStep('form');
      setPhoneNumber('');
      setSelectedOp('GP');
      setIsManualOp(false);
      setConnectionType('Prepaid');
      setAmount('');
      setPin('');
      setPinError(false);
      setShowContactBook(false);
      setContactSearch('');
      setShowLowBalanceAlert(false);
      setLowBalanceRequired(0);
    }
  }, [isOpen, initialOperator, initialAmount]);

  // Handle number prefixes and auto-detect operator unless manually overridden
  useEffect(() => {
    if (phoneNumber.length >= 3 && !isManualOp) {
      const prefix = phoneNumber.slice(0, 3);
      for (const [opCode, details] of Object.entries(OPERATORS)) {
        if (details.prefixes.includes(prefix)) {
          setSelectedOp(opCode as Operator);
          break;
        }
      }
    }
  }, [phoneNumber, isManualOp]);

  if (!isOpen) return null;

  const handleRechargeSubmit = () => {
    if (phoneNumber.length !== 11 || !phoneNumber.startsWith('01')) {
      return;
    }
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt < 10 || numAmt > 5000) {
      return;
    }
    if (numAmt > currentBalance) {
      setLowBalanceRequired(numAmt);
      setShowLowBalanceAlert(true);
      return;
    }
    setStep('pin');
  };

  const handlePinSubmit = () => {
    const savedPin = localStorage.getItem('secure_wallet_pin') || '1234';
    if (pin === savedPin) {
      setPinError(false);
      setStep('success');
      onSuccess(parseFloat(amount), selectedOp, phoneNumber);
    } else {
      setPinError(true);
      setPin('');
    }
  };

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
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-100"
      >
        {/* Header banner */}
        <div className={`px-5 py-4 flex items-center justify-between text-white bg-gradient-to-r ${currentOpDetails?.gradient || 'from-blue-600 to-indigo-600'} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 h-20 w-20 bg-white/5 rounded-full translate-x-4 -translate-y-4 blur-md" />
          
          <div className="flex items-center gap-2 relative z-10">
            {step === 'pin' && (
              <button
                onClick={() => setStep('form')}
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

          {/* FORM STEP: Unified Single Page Recharge Interface */}
          {step === 'form' && (
            <div className="space-y-4">
              {/* 1. Phone Number Input */}
              <div className="space-y-1.5">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.enterNumber}
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 rounded-lg text-blue-600 font-bold text-xs select-none font-mono">
                    +88
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder={t.phonePlaceholder}
                    className="w-full text-slate-900 bg-slate-50 border-2 border-slate-200/60 rounded-2xl py-3.5 pl-17 pr-14 outline-none font-mono text-lg font-bold tracking-widest text-left focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowContactBook(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center border-0 outline-none shadow-xs"
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

              {/* 2. Operator Selection Tabs */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {t.selectOperator}
                  </label>
                  {isManualOp && (
                    <button
                      type="button"
                      onClick={() => setIsManualOp(false)}
                      className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      {lang === 'bn' ? 'অটো-ডিটেক্ট করুন' : 'Auto-detect'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(OPERATORS).map(([code, op]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setSelectedOp(code as Operator);
                        setIsManualOp(true);
                      }}
                      className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                        selectedOp === code
                          ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-xs scale-[1.02]'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className={`h-7 w-7 rounded-lg overflow-hidden flex items-center justify-center mb-1 border border-slate-200/50 shadow-xs bg-white`}>
                        {op.logoUrl ? (
                          <img src={op.logoUrl} alt={op.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          code.slice(0, 2)
                        )}
                      </span>
                      <span className="text-[10px] font-extrabold tracking-tight truncate w-full">
                        {code}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Connection Type Tabs */}
              <div className="space-y-1.5">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.selectConnection}
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['Prepaid', 'Postpaid', 'Skitto'] as ConnectionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setConnectionType(type)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        connectionType === type
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Amount Input */}
              <div className="space-y-1.5">
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

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-6 gap-1.5">
                {suggAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className={`py-2 px-1 text-[11px] font-bold border rounded-xl font-display cursor-pointer transition-all ${
                      amount === amt.toString()
                        ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    ৳{amt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleRechargeSubmit}
                disabled={phoneNumber.length !== 11 || !amount || parseFloat(amount) < 10 || parseFloat(amount) > 5000}
                className="w-full h-12 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-2xl shadow-md cursor-pointer transition-colors mt-2"
              >
                {lang === 'bn' ? 'রিচার্জ করুন' : 'Recharge Now'}
              </button>
            </div>
          )}

          {/* PIN STEP: 4-Digit Security PIN Validation */}
          {step === 'pin' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2 text-center">
                <div className="mx-auto h-12 w-12 bg-blue-50 border border-blue-100/50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 stroke-[1.8]" />
                </div>
                <h3 className="text-slate-900 font-bold text-sm">
                  {t.enterPin}
                </h3>
              </div>

              {/* Receipt Quick Overview */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.rechargeTarget}</span>
                  <span className="text-slate-900 font-mono font-bold">{phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.rechargeAmount}</span>
                  <span className="text-blue-600 font-bold">৳{parseFloat(amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
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

              <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="flex-1 h-11 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={handlePinSubmit}
                  disabled={pin.length !== 4}
                  className="flex-1 h-11 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl shadow-md cursor-pointer"
                >
                  {lang === 'bn' ? 'কনফার্ম' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS STEP: Successful Reception & Financial Receipt */}
          {step === 'success' && (
            <div className="space-y-5 text-center py-4">
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
              </div>

              <div className="flex justify-center gap-2 max-w-[90%] mx-auto">
                <button
                  type="button"
                  onClick={() => alert(lang === 'bn' ? 'রসিদ সংরক্ষিত হয়েছে!' : 'Receipt downloaded!')}
                  className="flex-1 py-2 text-[10px] font-bold border border-slate-200 text-slate-700 bg-white rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t.downloadReceipt}</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert(lang === 'bn' ? 'শেয়ারিং লিঙ্ক কপি করা হয়েছে!' : 'Sharing link copied!')}
                  className="px-3.5 py-2 text-[10px] border border-slate-200 text-slate-700 bg-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                  title="Share"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-11 text-xs font-bold text-white bg-slate-950 hover:bg-slate-900 rounded-xl cursor-pointer"
                >
                  {t.close}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CONTACT BOOK OVERLAY */}
        <AnimatePresence>
          {showContactBook && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute inset-0 bg-white z-30 flex flex-col"
            >
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

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                {favorites.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.number.includes(contactSearch)).length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <div className="p-3 bg-slate-50 w-fit rounded-full mx-auto">
                      <Users className="h-7 w-7 text-slate-300 stroke-[1.5]" />
                    </div>
                    <p className="text-xs font-bold">
                      {lang === 'bn' ? 'কোনো কন্টাক্ট নম্বর খুঁজে পাওয়া যায়নি' : 'No contacts matching search'}
                    </p>
                  </div>
                ) : (
                  favorites.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.number.includes(contactSearch)).map((contact, idx) => {
                    const opDetails = OPERATORS[contact.operator];
                    return (
                      <button
                        key={`${contact.id || contact.number || 'contact'}-${idx}`}
                        type="button"
                        onClick={() => {
                          setPhoneNumber(contact.number);
                          if (contact.operator) {
                            setSelectedOp(contact.operator);
                            setIsManualOp(true);
                          }
                          setShowContactBook(false);
                          setContactSearch('');
                        }}
                        className="w-full text-left p-3.5 flex items-center justify-between rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${opDetails?.gradient || 'from-blue-600 to-sky-400'} text-white font-black flex items-center justify-center text-xs tracking-tight shadow-xs uppercase font-display`}>
                            {contact.name.slice(0, 1)}
                          </div>
                          <div>
                            <h4 className="text-xs text-slate-900 font-extrabold tracking-tight">
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
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* LOW BALANCE ALERT MODAL */}
          {showLowBalanceAlert && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-white/98 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center text-slate-800"
            >
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
