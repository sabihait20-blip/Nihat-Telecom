import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Smartphone, CreditCard, CheckCircle2, AlertTriangle, 
  MapPin, User, ShieldCheck, Heart, Search, Check, AlertCircle, ShoppingBag, Truck
} from 'lucide-react';
import { Language, Operator } from '../types';
import { doc, getDoc, writeBatch, collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface SimCardModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
}

interface SimOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  contactPhone: string;
  operator: Operator;
  simType: 'Prepaid' | 'Postpaid' | 'eSIM';
  chosenNumber: string;
  nidNumber: string;
  deliveryAddress: string;
  totalCost: number;
  bookingFee?: number;
  dueAmount?: number;
  numberDocId?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  note?: string;
}

export default function SimCardModal({ lang, isOpen, onClose, walletBalance }: SimCardModalProps) {
  const [operator, setOperator] = useState<Operator>('GP');
  const [simType, setSimType] = useState<'Prepaid' | 'Postpaid' | 'eSIM'>('Prepaid');
  const [numberSelectionMode, setNumberSelectionMode] = useState<'random' | 'regular' | 'premium' | 'custom'>('random');
  const [selectedGalleryNumber, setSelectedGalleryNumber] = useState<string>('');
  const [customSuffix, setCustomSuffix] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  
  // Forms
  const [fullName, setFullName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');

  // Execution states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  // Prefill phone and name
  useEffect(() => {
    if (isOpen && currentUser) {
      setFullName(currentUser.displayName || '');
      setSuccessOrderId(null);
      setErrorText(null);
      // Retrieve registered user phone
      const userDocRef = doc(db, 'registered_users', currentUser.uid);
      getDoc(userDocRef).then((snap) => {
        if (snap.exists() && snap.data().phone) {
          setContactPhone(snap.data().phone);
        }
      }).catch(err => console.log("Prefill error:", err));
    }
  }, [isOpen, currentUser]);

  // Listen for SIM numbers & seed if empty
  useEffect(() => {
    const q = collection(db, 'sim_numbers');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id });
      });
      
      // Seed default numbers if collection is entirely empty
      if (list.length === 0) {
        const batch = writeBatch(db);
        
        const defaultVIPs: Record<Operator, string[]> = {
          GP: ['01711-223344', '01712-998877', '01708-777888', '01312-555666'],
          Robi: ['01819-112233', '01818-887766', '01889-444555', '01899-777999'],
          Airtel: ['01611-334455', '01616-990011', '01688-222333', '01699-555555'],
          Banglalink: ['01911-556677', '01919-887766', '01988-333444', '01999-888999'],
          Teletalk: ['01511-224466', '01555-777222', '01588-444888', '01599-999000']
        };

        const defaultRegulars: Record<Operator, string[]> = {
          GP: ['01710-102030', '01710-506070'],
          Robi: ['01810-102030', '01810-506070'],
          Airtel: ['01610-102030', '01610-506070'],
          Banglalink: ['01910-102030', '01910-506070'],
          Teletalk: ['01510-102030', '01510-506070']
        };

        Object.entries(defaultVIPs).forEach(([op, nums]) => {
          nums.forEach((num, index) => {
            const id = `sim-num-vip-${op.toLowerCase()}-${index}`;
            const docRef = doc(db, 'sim_numbers', id);
            batch.set(docRef, {
              id,
              number: num,
              operator: op,
              type: 'VIP',
              status: 'Available',
              fullPrice: 450,
              bookingFee: 100
            });
          });
        });

        Object.entries(defaultRegulars).forEach(([op, nums]) => {
          nums.forEach((num, index) => {
            const id = `sim-num-reg-${op.toLowerCase()}-${index}`;
            const docRef = doc(db, 'sim_numbers', id);
            batch.set(docRef, {
              id,
              number: num,
              operator: op,
              type: 'Regular',
              status: 'Available',
              fullPrice: 150,
              bookingFee: 50
            });
          });
        });

        batch.commit().catch(err => console.error("Error seeding sim_numbers:", err));
      } else {
        setAvailableNumbers(list);
      }
    }, (error) => {
      console.error("Error subscribing to sim_numbers:", error);
    });
    return () => unsubscribe();
  }, []);

  // Reset selected gallery number when operator or selection mode changes
  useEffect(() => {
    const matched = availableNumbers.filter(n => 
      n.operator === operator && 
      n.status === 'Available' &&
      (numberSelectionMode === 'regular' ? n.type === 'Regular' : n.type === 'VIP')
    );
    if (matched.length > 0) {
      setSelectedGalleryNumber(matched[0].number);
    } else {
      setSelectedGalleryNumber('');
    }
    setSearchStatus(null);
  }, [operator, numberSelectionMode, availableNumbers]);

  if (!isOpen) return null;

  // Calculate pricing based on current configuration and active database selections
  let finalFullPrice = 150;
  let finalBookingFee = 50;

  // Find corresponding database number if applicable
  const selectedNumObj = availableNumbers.find(n => 
    n.operator === operator && 
    n.status === 'Available' && 
    (numberSelectionMode === 'regular' || numberSelectionMode === 'premium') &&
    n.number === selectedGalleryNumber
  );

  if (selectedNumObj) {
    finalFullPrice = selectedNumObj.fullPrice || (selectedNumObj.type === 'VIP' ? 450 : 150);
    finalBookingFee = selectedNumObj.bookingFee || (selectedNumObj.type === 'VIP' ? 100 : 50);
  } else {
    // Custom suffix or random automatic selection pricing defaults
    if (numberSelectionMode === 'custom') {
      finalFullPrice = 350; // 150 base + 200 custom suffix surcharge
      finalBookingFee = 100;
    } else {
      // Random
      finalFullPrice = 150;
      finalBookingFee = 50;
    }
  }

  // eSIM surcharge (+৳100 to overall cost)
  if (simType === 'eSIM') {
    finalFullPrice += 100;
  }

  const finalDueAmount = finalFullPrice - finalBookingFee;

  const handleSearchCustomNumber = () => {
    if (!customSuffix || customSuffix.length !== 4 || isNaN(Number(customSuffix))) {
      setSearchStatus(lang === 'bn' ? 'দয়া করে ৪ ডিজিটের সঠিক সংখ্যা লিখুন' : 'Please enter a valid 4-digit number');
      return;
    }
    setSearchStatus('loading');
    setTimeout(() => {
      setSearchStatus('available');
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!fullName.trim()) {
      alert(lang === 'bn' ? 'দয়া করে আপনার সম্পূর্ণ নাম লিখুন!' : 'Please enter your full name!');
      return;
    }
    if (!contactPhone.trim() || contactPhone.length < 11) {
      alert(lang === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন!' : 'Please enter a valid 11-digit phone number!');
      return;
    }
    if (!nidNumber.trim() || nidNumber.length < 10) {
      alert(lang === 'bn' ? 'দয়া করে সঠিক ১০ বা ১৭ ডিজিটের এনআইডি (NID) নম্বর দিন!' : 'Please enter a valid National ID (NID) number!');
      return;
    }
    if (!deliveryAddress.trim()) {
      alert(lang === 'bn' ? 'দয়া করে ডেলিভারি ঠিকানা প্রদান করুন!' : 'Please provide delivery address!');
      return;
    }

    // Validation for selection modes
    if (numberSelectionMode === 'regular' || numberSelectionMode === 'premium') {
      if (!selectedGalleryNumber || !selectedNumObj) {
        alert(lang === 'bn' ? 'দয়া করে গ্যালারি থেকে একটি উপলব্ধ নম্বর সিলেক্ট করুন!' : 'Please select an available mobile number from the gallery!');
        return;
      }
    } else if (numberSelectionMode === 'custom') {
      if (!customSuffix || customSuffix.length !== 4 || isNaN(Number(customSuffix))) {
        alert(lang === 'bn' ? 'দয়া করে ৪ ডিজিটের সঠিক শেষ অংশ টাইপ করুন!' : 'Please enter a valid 4-digit suffix!');
        return;
      }
      if (searchStatus !== 'available') {
        alert(lang === 'bn' ? 'অনুগ্রহ করে প্রথমে নম্বরটির উপলব্ধতা চেক করুন!' : 'Please check number availability first!');
        return;
      }
    }

    if (walletBalance < finalBookingFee) {
      setErrorText(lang === 'bn' 
        ? `আপনার ওয়ালেট ব্যালেন্স অপর্যাপ্ত! এই সিমটি বুক করতে নূন্যতম ৳${finalBookingFee} বুকিং ফি প্রয়োজন।` 
        : `Your wallet balance is insufficient! Minimum booking fee of ৳${finalBookingFee} is required.`);
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    // Formulate chosen number
    let finalNumber = '';
    if (numberSelectionMode === 'random') {
      const prefixMap: Record<Operator, string> = { GP: '017', Robi: '018', Airtel: '016', Banglalink: '019', Teletalk: '015' };
      const prefix = prefixMap[operator];
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8);
      finalNumber = `${prefix}${randomDigits.slice(0, 2)}-${randomDigits.slice(2)}`;
    } else if (numberSelectionMode === 'regular' || numberSelectionMode === 'premium') {
      finalNumber = selectedGalleryNumber;
    } else {
      const prefixMap: Record<Operator, string> = { GP: '017', Robi: '018', Airtel: '016', Banglalink: '019', Teletalk: '015' };
      finalNumber = `${prefixMap[operator]}XX-XXX${customSuffix}`;
    }

    const orderId = `sim-${Date.now()}`;
    const dateStr = new Date().toISOString();

    const orderData: SimOrder = {
      id: orderId,
      userId: currentUser.uid,
      userName: fullName,
      userEmail: currentUser.email || 'unknown@user.com',
      contactPhone,
      operator,
      simType,
      chosenNumber: finalNumber,
      nidNumber,
      deliveryAddress,
      totalCost: finalFullPrice,
      bookingFee: finalBookingFee,
      dueAmount: finalDueAmount,
      numberDocId: selectedNumObj?.id || null,
      status: 'Pending',
      date: dateStr,
      note: additionalNote
    };

    // User notification setup
    const notifId = `notif-sim-${Date.now()}`;
    const simNotif = {
      id: notifId,
      title: lang === 'bn' ? 'সিম কার্ড বুকিং সফল' : 'SIM Card Booked Successfully',
      titleBn: 'সিম কার্ডের বুকিং রিকুয়েস্ট সফল',
      desc: `Your booking for ${operator} ${simType} (${finalNumber}) has been placed. Paid ৳${finalBookingFee} from wallet. Remaining due at shop: ৳${finalDueAmount}.`,
      descBn: `আপনার ${operator} ${simType === 'eSIM' ? 'ই-সিম' : simType} (${finalNumber}) বুকিং সফল হয়েছে। ওয়ালেট থেকে ৳${finalBookingFee} পরিশোধিত হয়েছে। বাকি ৳${finalDueAmount} দোকানে এসে পরিশোধ করবেন।`,
      time: 'Just now',
      read: false
    };

    // Transaction document
    const txId = `tx-sim-${Date.now()}`;
    const simTx = {
      id: txId,
      type: 'Bill',
      amount: finalBookingFee,
      billerName: `SIM Booking: ${operator} ${simType} (${finalNumber})`,
      billerNameBn: `সিম বুকিং: ${operator === 'GP' ? 'জিপি' : operator} ${simType === 'eSIM' ? 'ই-সিম' : (simType === 'Prepaid' ? 'প্রিপেইড' : 'পোস্টপেইড')} (${finalNumber})`,
      date: dateStr,
      txId: orderId,
      status: 'Pending',
      userId: currentUser.uid,
      userEmail: currentUser.email,
      note: `Total SIM Cost: ৳${finalFullPrice} | Paid Booking: ৳${finalBookingFee} | Remaining Due: ৳${finalDueAmount} | NID: ${nidNumber}`
    };

    const batch = writeBatch(db);
    try {
      // 1. Create SIM Booking Order
      batch.set(doc(db, 'sim_orders', orderId), orderData);

      // 2. Lock / Book SIM Number in DB if it was picked from specific gallery
      if (selectedNumObj) {
        batch.update(doc(db, 'sim_numbers', selectedNumObj.id), { status: 'Booked' });
      }

      // 3. Deduct Booking Fee only
      const updatedBalance = Math.max(walletBalance - finalBookingFee, 0);
      batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: updatedBalance });
      batch.set(doc(db, 'registered_users', currentUser.uid), { balance: updatedBalance }, { merge: true });

      // 4. Save User Transaction
      batch.set(doc(db, 'users', currentUser.uid, 'transactions', txId), simTx);

      // 5. Save Notification
      batch.set(doc(db, 'users', currentUser.uid, 'notifications', notifId), simNotif);

      await batch.commit();
      setSuccessOrderId(orderId);
    } catch (err: any) {
      console.error("Error ordering SIM card: ", err);
      setErrorText(err.message || 'Error occurred while saving your request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOperatorDetails = (op: Operator) => {
    switch (op) {
      case 'GP': return { name: 'Grameenphone', color: 'bg-sky-500 border-sky-400 text-white shadow-sky-500/10' };
      case 'Robi': return { name: 'Robi', color: 'bg-[#e2125d] border-pink-400 text-white shadow-pink-500/10' };
      case 'Airtel': return { name: 'Airtel', color: 'bg-rose-600 border-rose-500 text-white shadow-rose-500/10' };
      case 'Banglalink': return { name: 'Banglalink', color: 'bg-orange-500 border-orange-400 text-white shadow-orange-500/10' };
      case 'Teletalk': return { name: 'Teletalk', color: 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/10' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden text-slate-800"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-600 p-5 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-2xl border border-white/10">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold font-display">
                {lang === 'bn' ? 'সিম কার্ড ও ই-সিম হাব' : 'SIM Card & eSIM Hub'}
              </h2>
              <p className="text-[10px] text-indigo-100 font-semibold mt-0.5">
                {lang === 'bn' ? 'বাংলাদেশের সকল অপারেটরের সিম হোম ডেলিভারি' : 'Get standard & eSIM home delivery inside Bangladesh'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 hover:bg-white/15 rounded-full transition-colors cursor-pointer text-white/90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          <AnimatePresence mode="wait">
            {!successOrderId ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* 1. Choose Operator */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                    <span>{lang === 'bn' ? '১. মোবাইল অপারেটর নির্বাচন করুন' : '1. Choose Mobile Operator'}</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['GP', 'Robi', 'Airtel', 'Banglalink', 'Teletalk'] as Operator[]).map((op) => {
                      const details = getOperatorDetails(op);
                      const isSelected = operator === op;
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setOperator(op)}
                          className={`p-2.5 rounded-2xl flex flex-col items-center justify-center border text-center transition-all cursor-pointer ${
                            isSelected 
                              ? `${details.color} border-transparent scale-105 ring-2 ring-pink-500/20`
                              : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="text-xs font-black tracking-wide">{op}</span>
                          <span className="text-[8px] font-bold opacity-80 mt-0.5 truncate max-w-full">
                            {op === 'GP' ? 'GP' : details.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SIM Type (Prepaid / Postpaid / eSIM) */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black tracking-wider uppercase text-slate-500">
                    {lang === 'bn' ? '২. সিমের ধরন' : '2. SIM Type'}
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'Prepaid', title: lang === 'bn' ? 'প্রিপেইড' : 'Prepaid', price: '৳১৫০', desc: lang === 'bn' ? 'নরমাল কল রেট' : 'Standard calls' },
                      { id: 'Postpaid', title: lang === 'bn' ? 'পোস্টপেইড' : 'Postpaid', price: '৳১৫০', desc: lang === 'bn' ? 'মাসিক বিল পরিশোধ' : 'Monthly billing' },
                      { id: 'eSIM', title: lang === 'bn' ? 'ই-সিম (Digital)' : 'eSIM (Digital)', price: '৳২৫০', desc: lang === 'bn' ? 'কোন প্লাস্টিক নেই' : 'No plastic chip' }
                    ].map((type) => {
                      const isSelected = simType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSimType(type.id as any)}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-500/5 ring-1 ring-indigo-600/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="text-xs font-black text-slate-800">{type.title}</span>
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                              {type.price}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold leading-normal">
                            {type.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Choose Mobile Suffix / Fancy Number Option */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black tracking-wider uppercase text-slate-600">
                      {lang === 'bn' ? '৩. নম্বর পছন্দ করুন' : '3. Choose Phone Number'}
                    </label>
                  </div>
                  
                  {/* Selectors for Mode */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white border border-slate-200/80 rounded-2xl">
                    {[
                      { id: 'random', label: lang === 'bn' ? 'র্যান্ডম' : 'Auto' },
                      { id: 'regular', label: lang === 'bn' ? 'সাধারণ' : 'Regular' },
                      { id: 'premium', label: lang === 'bn' ? 'ভিআইপি' : 'VIP' },
                      { id: 'custom', label: lang === 'bn' ? 'শেষ ৪' : 'Suffix' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setNumberSelectionMode(mode.id as any)}
                        className={`py-1.5 text-[10px] font-black rounded-xl cursor-pointer text-center uppercase transition-colors ${
                          numberSelectionMode === mode.id
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {/* Mode details */}
                  {numberSelectionMode === 'random' && (
                    <p className="text-[10px] text-slate-500 font-bold leading-normal">
                      ✨ {lang === 'bn' ? 'স্বয়ংক্রিয়ভাবে একটি চমৎকার ভেরিফাইড নতুন নম্বর আপনার জন্য বরাদ্দ করা হবে।' : 'A premium verified regular number will be automatically allocated to your SIM card.'}
                    </p>
                  )}

                  {numberSelectionMode === 'regular' && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block font-mono">
                        📋 {lang === 'bn' ? 'সাধারণ নম্বর গ্যালারি' : 'Regular Number Gallery'} (৳১৫০)
                      </span>
                      {availableNumbers.filter(n => n.operator === operator && n.status === 'Available' && n.type === 'Regular').length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {availableNumbers
                            .filter(n => n.operator === operator && n.status === 'Available' && n.type === 'Regular')
                            .map((numObj) => (
                              <button
                                key={numObj.id}
                                type="button"
                                onClick={() => setSelectedGalleryNumber(numObj.number)}
                                className={`p-2 rounded-xl text-center font-mono text-xs font-black border transition-all cursor-pointer ${
                                  selectedGalleryNumber === numObj.number
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800 scale-[1.02]'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                {numObj.number}
                              </button>
                            ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-bold py-1">
                          ⚠️ {lang === 'bn' ? 'দুঃখিত, কোনো সাধারণ নম্বর খালি নেই।' : 'Sorry, no regular numbers are available currently.'}
                        </p>
                      )}
                    </div>
                  )}

                  {numberSelectionMode === 'premium' && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block font-mono">
                        🔥 VIP Golden Suffix Gallery (+৳৩০০)
                      </span>
                      {availableNumbers.filter(n => n.operator === operator && n.status === 'Available' && n.type === 'VIP').length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {availableNumbers
                            .filter(n => n.operator === operator && n.status === 'Available' && n.type === 'VIP')
                            .map((numObj) => (
                              <button
                                key={numObj.id}
                                type="button"
                                onClick={() => setSelectedGalleryNumber(numObj.number)}
                                className={`p-2 rounded-xl text-center font-mono text-xs font-black border transition-all cursor-pointer ${
                                  selectedGalleryNumber === numObj.number
                                    ? 'border-amber-500 bg-amber-50 text-amber-800 scale-[1.02]'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                {numObj.number}
                              </button>
                            ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-bold py-1">
                          ⚠️ {lang === 'bn' ? 'দুঃখিত, কোনো ভিআইপি নম্বর খালি নেই।' : 'Sorry, no VIP numbers are available currently.'}
                        </p>
                      )}
                    </div>
                  )}

                  {numberSelectionMode === 'custom' && (
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block font-mono">
                        🎯 Request Last 4 Digits Choice (+৳২০০)
                      </span>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="e.g. 7860"
                            value={customSuffix}
                            onChange={(e) => {
                              setCustomSuffix(e.target.value.replace(/\D/g, ''));
                              setSearchStatus(null);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-pink-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSearchCustomNumber}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Search className="h-3 w-3" />
                          <span>{lang === 'bn' ? 'চেক' : 'Check'}</span>
                        </button>
                      </div>

                      {searchStatus === 'loading' && (
                        <p className="text-[10px] text-slate-500 font-bold animate-pulse">
                          🔍 {lang === 'bn' ? 'সিস্টেম ডাটাবেস চেক করা হচ্ছে...' : 'Checking database availability...'}
                        </p>
                      )}
                      {searchStatus === 'available' && (
                        <p className="text-[10px] text-emerald-600 font-black flex items-center gap-1 animate-bounce">
                          <Check className="h-3 w-3" />
                          {lang === 'bn' ? 'অভিনন্দন! এই শেষ ডিজিট দিয়ে সিম পাওয়া যাবে' : 'Hurrah! Number matches found & available to buy.'}
                        </p>
                      )}
                      {searchStatus && searchStatus !== 'loading' && searchStatus !== 'available' && (
                        <p className="text-[10px] text-rose-500 font-bold">
                          ⚠️ {searchStatus}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Delivery & Verification Details */}
                <div className="space-y-3.5 pt-1">
                  <label className="text-[11px] font-black tracking-wider uppercase text-slate-500 block">
                    {lang === 'bn' ? '৪. ডেলিভারি ও বায়োমেট্রিক ভেরিফিকেশন তথ্য' : '4. Delivery & Verification Details'}
                  </label>

                  <div className="space-y-3">
                    {/* Customer Full Name */}
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        placeholder={lang === 'bn' ? 'গ্রাহকের সম্পূর্ণ নাম' : 'Customer Full Name'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Contact Phone */}
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <input
                          type="tel"
                          maxLength={11}
                          placeholder={lang === 'bn' ? 'সচল মোবাইল নম্বর' : 'Contact Phone'}
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                          required
                        />
                      </div>

                      {/* NID Number */}
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          maxLength={17}
                          placeholder={lang === 'bn' ? 'এনআইডি (NID) নম্বর' : 'NID Number'}
                          value={nidNumber}
                          onChange={(e) => setNidNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="relative">
                      <div className="absolute left-3.5 top-3.5 text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <textarea
                        rows={2}
                        placeholder={lang === 'bn' ? 'ডেলিভারি ঠিকানা (জেলা, থানা, গ্রাম/রোড ও বাড়ির নম্বর)' : 'Full Delivery Address (District, Thana, Village/Area & House No.)'}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                        required
                      />
                    </div>

                    {/* Additional Note */}
                    <input
                      type="text"
                      placeholder={lang === 'bn' ? 'অতিরিক্ত কোনো নির্দেশনাবলী থাকলে লিখুন (ঐচ্ছিক)' : 'Special notes / instructions (Optional)'}
                      value={additionalNote}
                      onChange={(e) => setAdditionalNote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                {/* Biometric Warning Box */}
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-slate-700 rounded-2xl flex flex-col gap-1 text-[11px] leading-relaxed font-semibold">
                  <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{lang === 'bn' ? 'বায়োমেট্রিক ও আংগুলের ছাপ সতর্কতা' : 'Biometric Fingerprint Required'}</span>
                  </div>
                  <p className="opacity-90">
                    {lang === 'bn' 
                      ? 'সিমের মালিকানা নিবন্ধনের জন্য বায়োমেট্রিক ও আঙুলের ছাপের প্রয়োজন হওয়ায়, আপনি এখন নূন্যতম বুকিং ফি দিয়ে অর্ডারটি কনফার্ম করতে পারবেন। অবশিষ্ট টাকা দোকানে এসে সিম বুঝে নেওয়ার সময় পরিশোধ করবেন।' 
                      : 'Physical biometric & fingerprint registration is mandatory for SIM ownership setup. Secure this number with a booking fee now, and settle the remaining balance at the shop.'}
                  </p>
                </div>

                {/* Wallet Info Alert & Insufficient Warning */}
                {errorText && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-shake">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}

                {/* Interactive Fee Summary Box */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
                    <div className="text-slate-700">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono block">
                        {lang === 'bn' ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}
                      </span>
                      <span className="text-xs font-black font-mono">
                        ৳{walletBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono block">
                        {lang === 'bn' ? 'সিমের মোট মূল্য' : 'Total SIM Price'}
                      </span>
                      <span className="text-xs font-black text-slate-900 font-mono">
                        ৳{finalFullPrice}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-0.5">
                    <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-2xl text-left">
                      <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block font-mono">
                        {lang === 'bn' ? 'বুকিং ফি (এখন পরিশোধ)' : 'Booking Fee (Pay Now)'}
                      </span>
                      <span className="text-lg font-black text-blue-600 font-mono">
                        ৳{finalBookingFee}
                      </span>
                    </div>
                    
                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-2xl text-left">
                      <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block font-mono">
                        {lang === 'bn' ? 'বাকি টাকা (দোকানে পরিশোধ)' : 'Due Amount (At Shop)'}
                      </span>
                      <span className="text-lg font-black text-indigo-600 font-mono">
                        ৳{finalDueAmount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Submit Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200/80 rounded-2xl text-xs font-black transition-colors cursor-pointer text-center"
                  >
                    {lang === 'bn' ? 'বাতিল করুন' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Truck className="h-4 w-4" />
                        <span>{lang === 'bn' ? 'নিশ্চিত বুকিং করুন' : 'Confirm SIM Booking'}</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-8 text-center space-y-5"
              >
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {lang === 'bn' ? 'সিম কার্ড বুকিং সফল!' : 'SIM Card Booked Successfully!'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto leading-relaxed mt-1">
                    {lang === 'bn' 
                      ? `আপনার বুকিং রিকুয়েস্ট সফলভাবে সাবমিট হয়েছে (আইডি: ${successOrderId})। দয়া করে নিকটস্থ শপে এসে আপনার বায়োমেট্রিক ও আঙুলের ছাপ দিয়ে সিমটি সংগ্রহ করুন।` 
                      : `Your SIM booking request is successfully registered with ID: ${successOrderId}. Please visit our shop to complete biometric verification & collect your SIM card.`}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl text-left max-w-sm mx-auto space-y-2.5 font-mono text-[11px] text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">OPERATOR:</span>
                    <span className="font-extrabold text-slate-900">{operator}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">SIM TYPE:</span>
                    <span className="font-extrabold text-slate-900">{simType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">CHOSEN NUMBER:</span>
                    <span className="font-extrabold text-indigo-600">
                      {numberSelectionMode === 'random' ? 'Auto Allocated' : selectedGalleryNumber}
                    </span>
                  </div>
                  <div className="border-t border-slate-200/60 my-2 pt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">TOTAL SIM COST:</span>
                      <span className="font-extrabold text-slate-950">৳{finalFullPrice}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span className="font-bold">BOOKING FEE PAID:</span>
                      <span className="font-extrabold">৳{finalBookingFee}</span>
                    </div>
                    <div className="flex justify-between text-indigo-600">
                      <span className="font-bold">DUE AT SHOP:</span>
                      <span className="font-extrabold">৳{finalDueAmount}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-colors cursor-pointer inline-block animate-pulse"
                >
                  {lang === 'bn' ? 'ঠিক আছে' : 'Awesome'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
