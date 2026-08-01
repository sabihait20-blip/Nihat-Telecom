import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Landmark, Smartphone, Check, ShieldCheck, 
  HelpCircle, Sparkles, Plus, RefreshCw, AlertCircle, ArrowRight,
  QrCode, Download, Copy, ExternalLink, CheckCircle2
} from 'lucide-react';
import { Language } from '../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import QRCode from 'qrcode';

interface AddFundModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number, method: string, trxId: string, senderNumber: string) => void;
}

type DepositMethod = 'bkash' | 'nagad' | 'rocket';
type TabType = 'trx' | 'qr';

export default function AddFundModal({ lang, isOpen, onClose, onSuccess }: AddFundModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('qr'); // Default to Dynamic QR as requested
  const [method, setMethod] = useState<DepositMethod>('bkash');
  const [amountInput, setAmountInput] = useState<string>('500');
  const [senderNumber, setSenderNumber] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  
  // QR generation state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  
  // Checking & validation states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<boolean>(false);

  // Dynamic system settings configuration
  const [settings, setSettings] = useState({
    bkashNumber: '01970250988',
    nagadNumber: '01970250988',
    rocketNumber: '019702509883',
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
          bkashNumber: data.bkashNumber || '01970250988',
          nagadNumber: data.nagadNumber || '01970250988',
          rocketNumber: data.rocketNumber || '019702509883',
          minAddFund: typeof data.minAddFund === 'number' ? data.minAddFund : 100,
          maxAddFund: typeof data.maxAddFund === 'number' ? data.maxAddFund : 25000,
        });
      }
    }, (error) => {
      console.error("Error loading settings in AddFundModal: ", error);
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Generate Dynamic QR code whenever amount, method, or number changes
  useEffect(() => {
    if (!isOpen) return;
    const amt = parseFloat(amountInput) || 0;
    const targetNumber = getPersonalNumber(method);
    const paymentUri = `mfs://${method}?to=${targetNumber}&amount=${amt}&ref=NIBP-${Date.now()}&v=2.0`;
    
    const darkColor = method === 'bkash' ? '#e2136e' : method === 'nagad' ? '#ec1c24' : '#8c35b3';

    QRCode.toDataURL(paymentUri, {
      width: 280,
      margin: 2,
      color: {
        dark: darkColor,
        light: '#ffffff',
      }
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("QR generation error:", err);
      });
  }, [isOpen, method, amountInput, settings]);

  if (!isOpen) return null;

  // Localized string packs
  const labels = {
    title: lang === 'bn' ? 'ওয়ালেটে টাকা যোগ করুন' : 'Add Fund to Wallet',
    subtitle: lang === 'bn' ? 'ডায়নামিক QR কোড স্ক্যান বা সেন্ড মানির মাধ্যমে ব্যালেন্স রিচার্জ করুন' : 'Deposit instantly via Dynamic QR Code or Send Money',
    selectMethod: lang === 'bn' ? 'মাধ্যমে নির্বাচন করুন' : 'Select Operator',
    merchantInstr: lang === 'bn' ? 'ডায়নামিক QR কোড পেমেন্ট নির্দেশিকা' : 'Dynamic QR Code Payment Guide',
    amtLabel: lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Enter Amount (৳)',
    senderLabel: lang === 'bn' ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন' : 'Your Sender Number / Account',
    trxLabel: lang === 'bn' ? 'লেনদেনের ট্রানজেকশন আইডি (TrxID)' : 'Payment Transaction ID (TrxID)',
    placeholderTrx: lang === 'bn' ? 'যেমন: bK92H7K0L' : 'e.g. BK92H7K0L',
    placeholderSender: lang === 'bn' ? 'যেমন: 017XXXXXXXX' : 'e.g. 017XXXXXXXX',
    placeholderAmt: lang === 'bn' ? `ন্যূনতম ${settings.minAddFund} টাকা` : `Minimum ৳${settings.minAddFund}`,
    cancel: lang === 'bn' ? 'বাতিল' : 'Cancel',
    submit: lang === 'bn' ? 'পেমেন্ট ভেরিফাই করুন' : 'Verify & Add Fund',
    successTitle: lang === 'bn' ? 'টাকা যোগ সফল হয়েছে!' : 'Fund Added Successfully!',
    successDesc: lang === 'bn' ? 'আপনার ব্যালেন্স সাথে সাথে আপডেট করা হয়েছে।' : 'Your digital wallet balance has been updated instantly.',
    fees: lang === 'bn' ? 'সার্ভিস চার্জ: ৳ ০.০০ (ফ্রি)' : 'Service Charge: ৳0.00 (Free)',
    tabQr: lang === 'bn' ? 'ডায়নামিক QR কোড' : 'Dynamic QR Code',
    tabTrx: lang === 'bn' ? 'ম্যানুয়াল TrxID' : 'Manual TrxID',
    scanHint: lang === 'bn' ? 'আপনার মোবাইল ব্যাংকিং অ্যাপ দিয়ে স্ক্যান করুন' : 'Scan with your banking app to pay instantly',
    copyLink: lang === 'bn' ? 'পেমেন্ট লিংক কপি করুন' : 'Copy Payment Data',
    copiedText: lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!',
    simulateScan: lang === 'bn' ? 'সরাসরি পেমেন্ট সম্পন্ন করুন (Simulate Scan)' : 'Simulate Scan & Instant Pay',
  };

  const getPersonalNumber = (m: DepositMethod) => {
    switch (m) {
      case 'bkash': return settings.bkashNumber;
      case 'nagad': return settings.nagadNumber;
      case 'rocket': return settings.rocketNumber;
      default: return settings.bkashNumber;
    }
  };

  const getMethodName = (m: DepositMethod) => {
    switch (m) {
      case 'bkash': return 'bKash';
      case 'nagad': return 'Nagad';
      case 'rocket': return 'Rocket';
    }
  };

  const handleCopyQrData = () => {
    const data = `MFS: ${getMethodName(method)} | To: ${getPersonalNumber(method)} | Amount: ৳${amountInput || 0}`;
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateQrPayment = () => {
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt < settings.minAddFund) {
      setValidationError(lang === 'bn' ? `অনুগ্রহ করে কমপক্ষে ${settings.minAddFund} টাকা প্রবেশ করান!` : `Minimum deposit is ৳${settings.minAddFund}.`);
      setActiveTab('qr');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessOverlay(true);
      setTimeout(() => {
        const dummyTrx = 'QR' + Math.random().toString(36).substring(2, 8).toUpperCase();
        onSuccess(amt, getMethodName(method), dummyTrx, 'QR-DYNAMIC-PAY');
        setShowSuccessOverlay(false);
        onClose();
      }, 1800);
    }, 1500);
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

    if (!trxId.trim() || trxId.length < 6) {
      setValidationError(lang === 'bn' ? 'সঠিক পেমেন্ট ট্রানজেকশন আইডি (TrxID) দিন!' : 'Please input a valid transaction ID of 6+ characters.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessOverlay(true);
      
      setTimeout(() => {
        onSuccess(amt, getMethodName(method), trxId, senderNumber);
        setShowSuccessOverlay(false);
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
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-gradient-to-br from-pink-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-pink-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-slate-900 font-black text-sm tracking-tight">{labels.title}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-extrabold text-[9px] border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> Dynamic QR Active
                </span>
              </div>
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

        {/* Tab Switcher: Dynamic QR vs Manual TrxID */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="h-4 w-4 text-pink-600" />
            <span>{labels.tabQr}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trx')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'trx'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>{labels.tabTrx}</span>
          </button>
        </div>

        {/* Selector Panel block of MFS operators */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block ml-1">
            {labels.selectMethod}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* bKash MFS */}
            <button
              type="button"
              onClick={() => setMethod('bkash')}
              className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                method === 'bkash' 
                  ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-[0_4px_12px_rgba(236,72,153,0.15)] font-black' 
                  : 'border-slate-150 hover:border-slate-300 text-slate-500'
              }`}
            >
              <div className="h-6 w-6 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-black text-xs font-mono mb-1">
                BK
              </div>
              <span className="text-[10px] font-bold">bKash</span>
            </button>

            {/* Nagad MFS */}
            <button
              type="button"
              onClick={() => setMethod('nagad')}
              className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                method === 'nagad' 
                  ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-[0_4px_12px_rgba(249,115,22,0.15)] font-black' 
                  : 'border-slate-150 hover:border-slate-300 text-slate-500'
              }`}
            >
              <div className="h-6 w-6 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs font-mono mb-1">
                NG
              </div>
              <span className="text-[10px] font-bold">Nagad</span>
            </button>

            {/* Rocket MFS */}
            <button
              type="button"
              onClick={() => setMethod('rocket')}
              className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                method === 'rocket' 
                  ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-[0_4px_12px_rgba(147,51,234,0.15)] font-black' 
                  : 'border-slate-150 hover:border-slate-300 text-slate-500'
              }`}
            >
              <div className="h-6 w-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs font-mono mb-1">
                RK
              </div>
              <span className="text-[10px] font-bold">Rocket</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DYNAMIC QR CODE VIEW */}
        {activeTab === 'qr' && (
          <div className="space-y-4">
            {/* Amount Input for Dynamic QR generation */}
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

            {/* Dynamic QR Card Display Box */}
            <div className="bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200 rounded-3xl p-5 flex flex-col items-center text-center shadow-inner relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className={`px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider text-white shadow-sm ${
                  method === 'bkash' ? 'bg-pink-600' : method === 'nagad' ? 'bg-orange-600' : 'bg-purple-700'
                }`}>
                  {getMethodName(method)} QR
                </span>
              </div>

              <div className="mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  {lang === 'bn' ? 'স্ক্যান করুন পেমেন্টের জন্য' : 'Scan to Pay'}
                </span>
                <h4 className="text-base font-black text-slate-900 font-mono">
                  ৳{amountInput ? parseInt(amountInput).toLocaleString() : '0'}
                </h4>
              </div>

              {/* Generated QR Image Frame */}
              <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 my-2 relative group">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="Dynamic MFS QR Code" 
                    className="h-44 w-44 object-contain rounded-xl"
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2 backdrop-blur-xs">
                  <a
                    href={qrDataUrl}
                    download={`${method}-qr-${amountInput || 100}.png`}
                    className="p-2.5 bg-white text-slate-800 rounded-xl shadow-lg hover:bg-slate-100 transition-colors"
                    title="Download QR"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-medium space-y-0.5 mt-1">
                <p>
                  {lang === 'bn' ? 'মার্চেন্ট নম্বর:' : 'Merchant Number:'}{' '}
                  <strong className="text-slate-900 font-mono">{getPersonalNumber(method)}</strong>
                </p>
                <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {labels.scanHint}
                </p>
              </div>

              {/* QR Action Toolbar */}
              <div className="grid grid-cols-2 gap-2 w-full mt-4">
                <button
                  type="button"
                  onClick={handleCopyQrData}
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[11px] font-black border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-blue-600" />}
                  <span>{copied ? labels.copiedText : labels.copyLink}</span>
                </button>
                <a
                  href={qrDataUrl}
                  download={`${method}-qr-${amountInput || 100}.png`}
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[11px] font-black border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{lang === 'bn' ? 'QR ডাউনলোড' : 'Save QR'}</span>
                </a>
              </div>
            </div>

            {/* Validation error */}
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-600 text-[10.5px] font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Simulate Instant Scan & Pay CTA */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSimulateQrPayment}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{lang === 'bn' ? 'পেমেন্ট ভেরিফাই হচ্ছে...' : 'Verifying Payment...'}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{labels.simulateScan}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: MANUAL TRxID SUBMISSION VIEW */}
        {activeTab === 'trx' && (
          <form onSubmit={handleAddFundSubmit} className="space-y-3.5">
            {/* Dynamic Payment Instruction Panel */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                <HelpCircle className="h-4 w-4 text-blue-500" />
                <span>{labels.merchantInstr}</span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 leading-relaxed font-medium">
                <p>
                  ১. আপনার {getMethodName(method)} অ্যাপে Send Money করুন এই নম্বরে:{' '}
                  <strong className="text-blue-600 select-all font-mono text-xs">{getPersonalNumber(method)}</strong>
                </p>
                <p>
                  ২. টাকা পাঠানো হয়ে গেলে আপনার ট্রানজেকশন আইডি <strong className="text-slate-900">(TrxID)</strong> এবং আপনার প্রেরক নম্বর নিচে দিন।
                </p>
              </div>
            </div>

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
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                {labels.trxLabel}
              </label>
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
        )}
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
                <span className="text-slate-400">{lang === 'bn' ? 'ট্রানজেকশন আইডি:' : 'Method:'}</span>
                <span className="text-blue-300 font-bold tracking-wider">{activeTab === 'qr' ? 'Dynamic QR Code' : trxId}</span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
