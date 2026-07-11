import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Gamepad2, Tv, Sparkles, Check, ShieldCheck, 
  AlertCircle, ArrowRight, ChevronLeft, Gift, RefreshCw, Lock,
  Zap, Disc
} from 'lucide-react';
import { Language } from '../types';

interface VoucherModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: (
    amount: number, 
    item: string, 
    packName: string, 
    targetAccount: string, 
    category: 'Gaming' | 'OTT'
  ) => void;
}

interface VoucherItem {
  id: string;
  name: string;
  category: 'Gaming' | 'OTT';
  badge: string;
  color: string;
  bgGrad: string;
  icon: any;
  inputLabelBn: string;
  inputLabelEn: string;
  inputPlaceholder: string;
  packages: { id: string; name: string; price: number; extra?: string }[];
}

export default function VoucherModal({ lang, isOpen, onClose, currentBalance, onSuccess }: VoucherModalProps) {
  const [activeTab, setActiveTab] = useState<'Gaming' | 'OTT'>('Gaming');
  const [selectedItem, setSelectedItem] = useState<VoucherItem | null>(null);
  const [selectedPack, setSelectedPack] = useState<{ id: string; name: string; price: number; extra?: string } | null>(null);
  const [accountInput, setAccountInput] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  
  // Validation & step states
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Select Item/Pack, 2: Input ID & Verify, 3: Success
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const VOUCHERS: VoucherItem[] = [
    // Gaming Vouchers
    {
      id: 'freefire',
      name: 'Free Fire Diamond',
      category: 'Gaming',
      badge: 'INSTANT TOPUP',
      color: 'text-rose-600 border-rose-500/30 bg-rose-500/10',
      bgGrad: 'from-rose-500 to-pink-600',
      icon: Gamepad2,
      inputLabelBn: 'প্লেয়ার ইউআইডি (Player UID)',
      inputLabelEn: 'Player UID',
      inputPlaceholder: 'যেমন: 2381948291',
      packages: [
        { id: 'ff-115', name: '115 Diamonds', price: 85, extra: '+10 Bonus' },
        { id: 'ff-240', name: '240 Diamonds', price: 175, extra: '+20 Bonus' },
        { id: 'ff-610', name: '610 Diamonds', price: 445, extra: 'Hot Deal' },
        { id: 'ff-weekly', name: 'Weekly Pass', price: 165, extra: '450 Dia Total' },
        { id: 'ff-monthly', name: 'Monthly Pass', price: 820, extra: '2600 Dia Total' },
      ]
    },
    {
      id: 'pubg',
      name: 'PUBG Mobile UC',
      category: 'Gaming',
      badge: 'GLOBAL / KR',
      color: 'text-amber-600 border-amber-500/30 bg-amber-500/10',
      bgGrad: 'from-amber-500 to-orange-600',
      icon: Disc,
      inputLabelBn: 'প্লেয়ার ক্যারেক্টার আইডি (Character ID)',
      inputLabelEn: 'Player Character ID',
      inputPlaceholder: 'যেমন: 5183928192',
      packages: [
        { id: 'pubg-60', name: '60 UC', price: 85 },
        { id: 'pubg-325', name: '325 UC', price: 430, extra: '+25 Bonus' },
        { id: 'pubg-660', name: '660 UC', price: 850, extra: '+60 Bonus' },
        { id: 'pubg-1800', name: '1800 UC', price: 2150, extra: 'Pro Pack' },
      ]
    },
    // OTT Vouchers
    {
      id: 'chorki',
      name: 'Chorki Subscription',
      category: 'OTT',
      badge: 'ORIGINAL FILMS',
      color: 'text-red-600 border-red-500/30 bg-red-500/10',
      bgGrad: 'from-red-600 to-rose-700',
      icon: Tv,
      inputLabelBn: 'চরকি একাউন্ট নম্বর বা ইমেইল',
      inputLabelEn: 'Chorki Phone / Email',
      inputPlaceholder: 'যেমন: 017XXXXXXXX বা name@gmail.com',
      packages: [
        { id: 'chorki-1m', name: '1 Month All Access', price: 50 },
        { id: 'chorki-6m', name: '6 Months Plan', price: 275, extra: 'Save 15%' },
        { id: 'chorki-1y', name: '1 Year Premium', price: 499, extra: 'Best Value' },
      ]
    },
    {
      id: 'hoichoi',
      name: 'Hoichoi Subscription',
      category: 'OTT',
      badge: 'BENGALI SERIES',
      color: 'text-crimson-600 border-rose-600/30 bg-rose-600/10 text-rose-600',
      bgGrad: 'from-rose-600 to-red-600',
      icon: Tv,
      inputLabelBn: 'হইচই একাউন্ট মোবাইল নম্বর',
      inputLabelEn: 'Hoichoi Phone Number',
      inputPlaceholder: 'যেমন: 018XXXXXXXX',
      packages: [
        { id: 'hoi-3m', name: '3 Months Subscription', price: 149 },
        { id: 'hoi-1y', name: '1 Year 2 Screens', price: 499, extra: 'Ultra HD' },
      ]
    },
    {
      id: 'netflix',
      name: 'Netflix Vouchers',
      category: 'OTT',
      badge: 'OFFICIAL PIN',
      color: 'text-slate-900 border-slate-900/30 bg-slate-900/10',
      bgGrad: 'from-slate-900 to-red-950',
      icon: Tv,
      inputLabelBn: 'নেটফ্লিক্স একাউন্ট ইমেইল',
      inputLabelEn: 'Netflix Account Email',
      inputPlaceholder: 'যেমন: user@gmail.com',
      packages: [
        { id: 'nf-mob', name: 'Mobile Plan (1 Month)', price: 299, extra: '1 Phone/Tablet' },
        { id: 'nf-std', name: 'Standard Plan (1 Month)', price: 799, extra: 'Full HD 1080p' },
        { id: 'nf-prm', name: 'Premium 4K (1 Month)', price: 1199, extra: '4 Screens HDR' },
      ]
    }
  ];

  const filteredItems = VOUCHERS.filter(v => v.category === activeTab);

  const handleSelectItem = (item: VoucherItem) => {
    setSelectedItem(item);
    setSelectedPack(item.packages[0]); // default select first pack
    setErrorMsg('');
  };

  const handleProceedToVerify = () => {
    if (!selectedPack || !selectedItem) return;
    if (selectedPack.price > currentBalance) {
      setErrorMsg(lang === 'bn' ? 'দুঃখিত, আপনার ওয়ালেট ব্যালেন্স অপর্যাপ্ত!' : 'Insufficient wallet balance for this voucher!');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPack || !selectedItem) return;

    if (!accountInput.trim()) {
      setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে সঠিক একাউন্ট তথ্য বা প্লেয়ার আইডি দিন!' : 'Please enter valid player UID or account details.');
      return;
    }

    const savedPin = localStorage.getItem('secure_wallet_pin') || '1234';
    if (pinInput !== savedPin) {
      setErrorMsg(lang === 'bn' ? `ভুল পিন নম্বর! (টেস্ট পিন: ${savedPin})` : `Invalid PIN! (Demo PIN: ${savedPin})`);
      return;
    }

    if (selectedPack.price > currentBalance) {
      setErrorMsg(lang === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স!' : 'Insufficient balance!');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setStep(3);

      setTimeout(() => {
        onSuccess(
          selectedPack.price,
          selectedItem.name,
          selectedPack.name,
          accountInput.trim(),
          selectedItem.category
        );
        onClose();
        // Reset
        setStep(1);
        setSelectedItem(null);
        setSelectedPack(null);
        setAccountInput('');
        setPinInput('');
      }, 1800);
    }, 1500);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs cursor-pointer"
      />

      {/* Main Bottom Sheet Container */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-white w-full rounded-t-[32px] max-h-[94%] overflow-y-auto flex flex-col p-6 shadow-2xl border-t border-slate-100 z-10 font-sans select-none"
      >
        {/* Handle pill */}
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2 className="text-slate-900 font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                <Gift className="h-5 w-5 text-indigo-600 stroke-[2.5]" />
                <span>{lang === 'bn' ? 'গেমিং ও ওটিটি ভাউচার' : 'Gaming & OTT Vouchers'}</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                {lang === 'bn' ? 'ইনস্ট্যান্ট ডায়মন্ড টপআপ ও প্রিমিয়াম ওটিটি সাবস্ক্রিপশন' : 'Instant Game Diamonds & Premium OTT Subscription Vouchers'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Balance Badge */}
        <div className="mb-4 bg-indigo-50/70 border border-indigo-100 p-3 rounded-2xl flex justify-between items-center text-xs font-bold text-indigo-900">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            {lang === 'bn' ? 'বর্তমান ওয়ালেট ব্যালেন্স:' : 'Available Wallet Balance:'}
          </span>
          <span className="text-sm font-extrabold text-indigo-700 font-mono">
            ৳{currentBalance.toLocaleString()}
          </span>
        </div>

        {/* STEP 1: SELECT ITEM & PACKAGE */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Category Switch Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => { setActiveTab('Gaming'); setSelectedItem(null); }}
                className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'Gaming' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Gamepad2 className="h-4 w-4 text-rose-500" />
                <span>{lang === 'bn' ? 'গেমিং ভাউচার' : 'Gaming Vouchers'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('OTT'); setSelectedItem(null); }}
                className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'OTT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Tv className="h-4 w-4 text-red-500" />
                <span>{lang === 'bn' ? 'ওটিটি সাবস্ক্রিপশন' : 'OTT Subscription'}</span>
              </button>
            </div>

            {/* Voucher Grid */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {lang === 'bn' ? 'সার্ভিস নির্বাচন করুন' : 'Select Service Platform'}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const IconComp = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs scale-[1.01]' 
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${item.bgGrad} text-white shadow-xs`}>
                          <IconComp className="h-5 w-5" />
                        </div>
                        {isSelected && (
                          <span className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[9px] font-black tracking-wider text-slate-400 block mb-0.5">
                          {item.badge}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                          {item.name}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Package List if item selected */}
            {selectedItem && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2.5 pt-2 border-t border-slate-100"
              >
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {lang === 'bn' ? `${selectedItem.name} প্যাকেজ সমূহ` : `${selectedItem.name} Packages`}
                  </label>
                  <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                    <Zap className="h-3 w-3 fill-indigo-600" />
                    <span>{lang === 'bn' ? 'তাৎক্ষণিক ডেলিভারি' : 'Fast Delivery'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedItem.packages.map((pack) => {
                    const isPackSelected = selectedPack?.id === pack.id;
                    return (
                      <div
                        key={pack.id}
                        onClick={() => { setSelectedPack(pack); setErrorMsg(''); }}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isPackSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isPackSelected ? 'border-white bg-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isPackSelected && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold block">{pack.name}</span>
                            {pack.extra && (
                              <span className={`text-[10px] font-bold ${isPackSelected ? 'text-indigo-200' : 'text-rose-500'}`}>
                                ★ {pack.extra}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-black font-mono block ${isPackSelected ? 'text-white' : 'text-slate-900'}`}>
                            ৳{pack.price}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleProceedToVerify}
                  disabled={!selectedPack}
                  className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  <span>{lang === 'bn' ? 'পরবর্তী ধাপে যান' : 'Proceed to Account Input'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* STEP 2: ACCOUNT INPUT & PIN VERIFICATION */}
        {step === 2 && selectedItem && selectedPack && (
          <form onSubmit={handleConfirmPurchase} className="space-y-4">
            {/* Selected Summary Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${selectedItem.bgGrad} text-white`}>
                  <selectedItem.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">{selectedItem.name}</h4>
                  <span className="text-[11px] font-bold text-indigo-600 block">{selectedPack.name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold">{lang === 'bn' ? 'মূল্য' : 'Price'}</span>
                <span className="text-sm font-black text-slate-900 font-mono">৳{selectedPack.price}</span>
              </div>
            </div>

            {/* Input field for UID/Email */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                {lang === 'bn' ? selectedItem.inputLabelBn : selectedItem.inputLabelEn} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={accountInput}
                onChange={(e) => setAccountInput(e.target.value)}
                placeholder={selectedItem.inputPlaceholder}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-900 font-mono"
              />
              <p className="text-[9px] text-slate-400 font-medium">
                {lang === 'bn' 
                  ? '⚠️ সঠিক আইডি বা একাউন্ট তথ্য দিন। ভুল তথ্যের কারণে ডেলিভারি না হলে কর্তৃপক্ষ দায়ী নয়।'
                  : '⚠️ Double check your player ID or account email before confirming.'}
              </p>
            </div>

            {/* PIN verification */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                <span>{lang === 'bn' ? '৪ ডিজিটের সিকিউরিটি পিন' : 'Enter 4-Digit Wallet PIN'}</span>
                <span className="text-indigo-600 lowercase font-mono">demo: 1234</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-xs font-black tracking-widest outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-900 font-mono"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer select-none"
              >
                {lang === 'bn' ? 'পিছনে যান' : 'Back'}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer select-none shadow-md disabled:bg-indigo-400"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{lang === 'bn' ? 'ভেরিফাই হচ্ছে...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>{lang === 'bn' ? 'নিশ্চিত করুন' : 'Confirm Buy'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 3 && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              <Check className="h-8 w-8 stroke-[3]" />
            </motion.div>
            <div className="space-y-1">
              <h3 className="text-slate-900 font-extrabold text-base">
                {lang === 'bn' ? 'ভাউচার অনুরোধ সফল হয়েছে!' : 'Voucher Request Submitted!'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold max-w-[280px]">
                {lang === 'bn' 
                  ? '৫-১৫ মিনিটের মধ্যে আপনার একাউন্টে ডায়মন্ড বা সাবস্ক্রিপশন অ্যাক্টিভ হয়ে যাবে।'
                  : 'Your topup/voucher delivery request is pending admin completion.'}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
