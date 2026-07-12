import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, CheckCircle2, AlertCircle, Info, Lock, Smartphone, RefreshCw, Copy, Check } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Transaction } from '../types';

interface ScratchCard {
  id: string;
  operator: string;
  title: string;
  price: number;
  pin: string;
  validity?: string;
  dialCode?: string;
  status: 'available' | 'sold';
  createdAt: number;
}

interface ScratchCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'bn';
  balance: number;
  uid: string | null;
  onSuccess: (amount: number) => void;
}

export default function ScratchCardModal({ isOpen, onClose, lang, balance, uid, onSuccess }: ScratchCardModalProps) {
  const [cards, setCards] = useState<ScratchCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ScratchCard | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableCards();
      setRevealedPin(null);
      setCopied(false);
      setSelectedCard(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  const fetchAvailableCards = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'scratch_cards'), where('status', '==', 'available'));
      const snap = await getDocs(q);
      const list: ScratchCard[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as ScratchCard);
      });
      // Sort by price
      list.sort((a, b) => a.price - b.price);
      setCards(list);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleBuy = async () => {
    if (!selectedCard || !uid) return;
    if (balance < selectedCard.price) {
      setErrorMsg(lang === 'bn' ? 'পর্যাপ্ত ব্যালেন্স নেই' : 'Insufficient balance');
      return;
    }

    setBuyLoading(true);
    setErrorMsg('');
    try {
      const batch = writeBatch(db);
      
      // Update card status
      const cardRef = doc(db, 'scratch_cards', selectedCard.id);
      batch.update(cardRef, {
        status: 'sold',
        boughtBy: uid,
        boughtAt: Date.now()
      });

      // Update user balance
      const newBalance = balance - selectedCard.price;
      const balanceRef = doc(db, 'users', uid, 'wallet', 'balance_doc');
      batch.set(balanceRef, { balance: newBalance });

      // Update user profile balance
      const profileRef = doc(db, 'registered_users', uid);
      batch.update(profileRef, { balance: newBalance });

      // Add transaction history
      const txId = 'SC-' + Math.floor(100000 + Math.random() * 900000);
      const txRef = doc(db, 'users', uid, 'transactions', txId);
      const txObj: Transaction = {
        id: txId,
        type: 'ScratchCard',
        operator: selectedCard.operator as any,
        amount: selectedCard.price,
        date: new Date().toISOString(),
        status: 'Success',
        targetNumber: selectedCard.operator + ' Scratch Card',
        details: selectedCard.title,
        voucherCode: selectedCard.pin,
        txId: txId
      };
      batch.set(txRef, txObj);

      await batch.commit();
      
      setRevealedPin(selectedCard.pin);
      onSuccess(selectedCard.price);
      
      // Remove from list
      setCards(cards.filter(c => c.id !== selectedCard.id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Transaction failed');
    }
    setBuyLoading(false);
  };

  const handleCopy = () => {
    if (revealedPin) {
      navigator.clipboard.writeText(revealedPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const operators = Array.from(new Set(cards.map(c => c.operator))) as string[];

  const toBnDigits = (text: string) => {
    return text.replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[parseInt(d)]);
  };

  const parseTitle = (title: string) => {
    const match = title.match(/^(\d+)\s*(.*)$/);
    if (match) {
      return {
        number: match[1],
        rest: match[2]
      };
    }
    return { number: title, rest: '' };
  };

  const renderOperatorLogo = (op: string) => {
    const lo = op.toLowerCase();
    let src = '';
    if (lo.includes('grameen') || lo.includes('gp')) src = 'input_file_1.png';
    else if (lo.includes('banglalink') || lo.includes('bl')) src = 'input_file_0.png';
    else if (lo.includes('robi')) src = 'input_file_2.png';
    else if (lo.includes('airtel')) src = 'input_file_3.png';
    else if (lo.includes('teletalk')) src = 'input_file_4.png';

    if (src) {
      return (
        <img 
          src={src} 
          alt={op} 
          className="w-10 h-10 object-contain" 
          referrerPolicy="no-referrer"
        />
      );
    }

    return (
      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-black">
        {op.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  const localizeOperatorName = (op: string) => {
    const lo = op.toLowerCase();
    if (lo.includes('grameen') || lo.includes('gp')) return lang === 'bn' ? 'গ্রামীণফোন' : 'Grameenphone';
    if (lo.includes('robi')) return lang === 'bn' ? 'রবি' : 'Robi';
    if (lo.includes('banglalink') || lo.includes('bl')) return lang === 'bn' ? 'বাংলালিংক' : 'Banglalink';
    if (lo.includes('airtel')) return lang === 'bn' ? 'এয়ারটেল' : 'Airtel';
    if (lo.includes('teletalk')) return lang === 'bn' ? 'টেলিটক' : 'Teletalk';
    return op;
  };

  const getOperatorCardColors = (op: string) => {
    const lo = op.toLowerCase();
    if (lo.includes('grameen') || lo.includes('gp')) return { bg: 'from-[#daf1ff] to-[#f0f9ff]', border: 'border-[#bae6fd]' };
    if (lo.includes('robi')) return { bg: 'from-[#ffe4e6] to-[#fff1f2]', border: 'border-[#fecdd3]' };
    if (lo.includes('banglalink') || lo.includes('bl')) return { bg: 'from-[#ffedd5] to-[#fff7ed]', border: 'border-[#fed7aa]' };
    if (lo.includes('airtel')) return { bg: 'from-[#ffe4e6] to-[#fff5f5]', border: 'border-[#fecdd3]' };
    if (lo.includes('teletalk')) return { bg: 'from-[#dcfce7] to-[#f0fdf4]', border: 'border-[#bbf7d0]' };
    return { bg: 'from-[#f1f5f9] to-[#f8fafc]', border: 'border-slate-300' };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[400px] h-[85vh] sm:h-[600px] bg-slate-50 sm:rounded-[2rem] rounded-t-[2rem] z-50 overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                  <CreditCard className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-slate-800 font-extrabold text-sm tracking-tight">
                    {lang === 'bn' ? 'স্ক্র্যাচ কার্ড' : 'Scratch Cards'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {lang === 'bn' ? 'গোপন নম্বর কিনুন' : 'Buy Secret PINs'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {revealedPin ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-emerald-600 font-bold">
                      {lang === 'bn' ? 'ক্রয় সফল হয়েছে!' : 'Purchase Successful!'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {lang === 'bn' ? 'আপনার স্ক্র্যাচ কার্ডের গোপন নম্বর:' : 'Your Scratch Card PIN:'}
                    </p>
                  </div>
                  <div 
                    onClick={handleCopy}
                    className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between cursor-pointer group hover:border-orange-200 hover:shadow-md transition-all relative overflow-hidden"
                  >
                    <span className="text-2xl font-black font-mono tracking-widest text-slate-800 select-all">
                      {revealedPin}
                    </span>
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:bg-orange-50 transition-colors">
                      {copied ? (
                        <Check className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Copy className="h-5 w-5 text-slate-400 group-hover:text-orange-500" />
                      )}
                    </div>
                  </div>
                  {copied && (
                    <p className="text-[10px] font-bold text-emerald-500 animate-pulse !mt-2">
                      {lang === 'bn' ? 'কপি করা হয়েছে!' : 'Copied to clipboard!'}
                    </p>
                  )}
                  <button
                    onClick={() => { setRevealedPin(null); setSelectedCard(null); }}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl"
                  >
                    {lang === 'bn' ? 'আরও কার্ড দেখুন' : 'View More Cards'}
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0" />
                    <p className="text-xs font-medium text-blue-800">
                      {lang === 'bn' 
                        ? 'নিচের স্ক্র্যাচ কার্ডগুলো থেকে আপনার পছন্দেরটি বেছে নিন। কার্ডটি কিনলে গোপন নম্বরটি দেখতে পাবেন।' 
                        : 'Choose a scratch card below. Upon purchase, the secret PIN will be revealed.'}
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  ) : cards.length === 0 ? (
                    <div className="text-center p-8 bg-slate-100 rounded-3xl">
                      <p className="text-sm font-bold text-slate-400">
                        {lang === 'bn' ? 'কোনো কার্ড উপলব্ধ নেই' : 'No cards available'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {operators.map(op => (
                        <div key={op} className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-2">
                            {localizeOperatorName(op)}
                          </h4>
                          <div className="grid grid-cols-1 gap-4">
                            {cards.filter(c => c.operator === op).map(card => {
                              const parsed = parseTitle(card.title);
                              const colors = getOperatorCardColors(op);
                              return (
                                <button
                                  key={card.id}
                                  onClick={() => setSelectedCard(card)}
                                  className={`w-full text-left rounded-[20px] transition-all relative overflow-hidden group border-2 ${
                                    selectedCard?.id === card.id 
                                      ? 'border-orange-500 shadow-xl ring-4 ring-orange-500/20 scale-[1.02]' 
                                      : 'border-slate-200 hover:border-orange-300 hover:shadow-md'
                                  }`}
                                >
                                  {/* বাংলাদেশী পতাকা থিম স্ক্র্যাচ কার্ড (৩.৫:১) */}
                                  <div className="aspect-[3.5/1] w-full bg-gradient-to-br from-[#006a4e] to-[#f42a41] rounded-xl shadow-lg border-2 border-white p-3 flex flex-col justify-between text-white select-none relative overflow-hidden group-hover:shadow-xl transition-all">
                                    {/* Top Section */}
                                    <div className="flex justify-between items-center relative z-10">
                                      <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-bold tracking-wider border border-white/10 uppercase">
                                        {localizeOperatorName(card.operator)}
                                      </div>
                                      <div className="text-lg font-black drop-shadow-md flex items-center gap-1.5">
                                        <span className="text-xs opacity-90">৳</span>
                                        <span>{lang === 'bn' ? toBnDigits(String(card.price)) : card.price}</span>
                                        <span className="text-[12px] font-bold opacity-90 ml-1">
                                          ({lang === 'bn' ? `${toBnDigits(parsed.number || card.title)} ${parsed.rest}` : `${parsed.number || card.title} ${parsed.rest}`})
                                        </span>
                                      </div>
                                    </div>

                                    {/* Middle: Scratch Area Placeholder */}
                                    <div className="bg-[#d1d5db] py-1.5 rounded-lg text-center relative overflow-hidden border border-white/30 shadow-inner">
                                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#d1d5db,#d1d5db_8px,#9ca3af_8px,#9ca3af_16px)]" />
                                      <span className="relative z-10 text-[11px] font-black text-slate-800 tracking-[5px] uppercase">
                                        {lang === 'bn' ? 'স্ক্র্যাচ করুন' : 'SCRATCH HERE'}
                                      </span>
                                    </div>

                                    {/* Bottom Section */}
                                    <div className="flex justify-between items-center text-[10px] font-bold opacity-90 tracking-tight relative z-10">
                                      <div className="flex items-center gap-1">
                                        {lang === 'bn' ? `মেয়াদ: ${card.validity || '২ দিন'}` : `Validity: ${card.validity || '2 Days'}`}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {lang === 'bn' ? `ডায়াল: ${card.dialCode || '*১২১*পিন#'}` : `Dial: ${card.dialCode || '*121*PIN#'}`}
                                      </div>
                                    </div>

                                    {/* Glossy overlay effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
                                  </div>

                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Actions */}
            {!revealedPin && selectedCard && (
              <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                {errorMsg && (
                  <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {errorMsg}
                  </div>
                )}
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-xs font-bold text-slate-500">
                    {lang === 'bn' ? 'মোট মূল্য:' : 'Total Price:'}
                  </span>
                  <span className="text-xl font-black text-slate-800">
                    ৳{selectedCard.price}
                  </span>
                </div>
                <button
                  onClick={handleBuy}
                  disabled={buyLoading}
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50"
                >
                  {buyLoading ? 'Processing...' : (lang === 'bn' ? 'নিশ্চিত করুন ও কিনুন' : 'Confirm & Buy')}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
