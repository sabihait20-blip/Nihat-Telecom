import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, AlertTriangle, CheckCircle2, FileText, Download, Share2,
  CreditCard, Smartphone, ShieldCheck, HelpCircle, Loader2, ArrowRight,
  History, PlusCircle, AlertCircle, Trash2
} from 'lucide-react';
import { Language } from '../types';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, updateDoc, collection, addDoc, writeBatch, query, where, getDocs, deleteDoc } from 'firebase/firestore';

interface TrafficFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentBalance: number;
  userId: string;
  userEmail: string;
  userName: string;
  onAddFundRedirect: () => void;
}

export default function TrafficFineModal({
  isOpen,
  onClose,
  lang,
  currentBalance,
  userId,
  userEmail,
  userName,
  onAddFundRedirect,
}: TrafficFineModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'new' | 'history'>('new');
  const [caseIdInput, setCaseIdInput] = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFineId, setActiveFineId] = useState<string | null>(null);
  const [currentFine, setCurrentFine] = useState<any>(null);
  const [userFines, setUserFines] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [step, setStep] = useState<'submit' | 'pending' | 'pay' | 'pin' | 'verifying' | 'success'>('submit');

  // Real-time listener for all user's submitted fines
  useEffect(() => {
    if (!userId || !isOpen) return;

    const unsubscribe = onSnapshot(collection(db, 'traffic_fines'), (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.userId === userId) {
          list.push({ ...data, id: doc.id });
        }
      });
      // Sort descending by createdAt
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setUserFines(list);
    });

    return () => unsubscribe();
  }, [userId, isOpen]);

  // Listen to the active fine document in real time
  useEffect(() => {
    if (!activeFineId) {
      setCurrentFine(null);
      return;
    }

    const docRef = doc(db, 'traffic_fines', activeFineId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCurrentFine(data);
        if (data.status === 'Awaiting Payment' && step !== 'pin' && step !== 'success') {
          setStep('pay');
        } else if (data.status === 'Processing') {
          setStep('verifying');
        } else if (data.status === 'Paid') {
          setStep('success');
        } else if (data.status === 'Submitted') {
          setStep('pending');
        }
      }
    });

    return () => unsubscribe();
  }, [activeFineId, step]);

  // Clean state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCaseIdInput('');
      setDuplicateError('');
      setIsSubmitting(false);
      setActiveFineId(null);
      setCurrentFine(null);
      setPin('');
      setPinError(false);
      setStep('submit');
      setActiveSubTab('new');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseIdInput.trim()) return;

    setIsSubmitting(true);
    setDuplicateError('');
    try {
      const cleanCaseId = caseIdInput.trim();

      // Check if this Case ID has already been submitted in the system
      const q = query(collection(db, 'traffic_fines'), where('caseId', '==', cleanCaseId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setDuplicateError(
          lang === 'bn'
            ? 'এই কেস আইডিটি ইতিমধ্যে সিস্টেমে জমা দেওয়া হয়েছে!'
            : 'This Case ID has already been submitted to the system!'
        );
        setIsSubmitting(false);
        return;
      }

      const fineId = `fine_${Date.now()}`;
      const newFine = {
        id: fineId,
        userId,
        userEmail,
        userName,
        caseId: cleanCaseId,
        vehicleNumber: '',
        fineAmount: 0,
        status: 'Submitted',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'traffic_fines', fineId), newFine);
      setActiveFineId(fineId);
      setStep('pending');
    } catch (err) {
      console.error('Error submitting fine:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayClick = () => {
    setStep('pin');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedPin = localStorage.getItem('secure_wallet_pin') || '1234';
    if (pin === savedPin) {
      setPinError(false);
      try {
        const batch = writeBatch(db);
        const amount = currentFine.fineAmount;
        const txId = `tx-${Date.now()}`;

        // Deduct balance from user wallet
        const balanceDocRef = doc(db, 'users', userId, 'wallet', 'balance_doc');
        batch.set(balanceDocRef, { balance: Math.max(currentBalance - amount, 0) });

        // Update traffic fine status to 'Processing' (awaiting Admin official TxID input)
        const fineRef = doc(db, 'traffic_fines', activeFineId!);
        batch.update(fineRef, { 
          status: 'Processing', 
          paidAt: new Date().toISOString(),
          transactionDocId: txId
        });

        // Create Transaction record as 'Pending' verification
        const newTx = {
          id: txId,
          type: 'Fine',
          amount: amount,
          targetNumber: currentFine.vehicleNumber,
          senderNumber: currentFine.caseId,
          txId: 'Awaiting Admin TxID',
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: 'Pending',
          userId: userId,
          userEmail: userEmail,
          userName: userName,
          details: `Traffic Fine Case ID: ${currentFine.caseId} (Awaiting TxID Verification)`
        };

        batch.set(doc(db, 'users', userId, 'transactions', txId), newTx);
        batch.set(doc(db, 'admin_requests', txId), newTx);

        // Add Notification
        const notifId = `notif-${Date.now()}`;
        const addedNotif = {
          id: notifId,
          title: 'Traffic Fine Payment Verifying',
          titleBn: 'ট্রাফিক ফাইন পেমেন্ট যাচাই করা হচ্ছে',
          desc: `Your payment of ৳${amount} for Case: ${currentFine.caseId} has been received and is awaiting Admin verification.`,
          descBn: `আপনার কেস নং: ${currentFine.caseId} এর ৳${amount} টাকা জরিমানা পেমেন্ট গ্রহণ করা হয়েছে এবং এডমিন ভেরিফিকেশনের জন্য অপেক্ষমান।`,
          time: 'Just now',
          read: false,
        };
        batch.set(doc(db, 'users', userId, 'notifications', notifId), addedNotif);

        await batch.commit();
        setStep('verifying');
      } catch (err) {
        console.error('Error paying traffic fine:', err);
      }
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const isLowBalance = currentFine && currentBalance < currentFine.fineAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
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
        className="relative bg-[#0F172A] border border-slate-800 text-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Banner */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-[#1E293B] relative overflow-hidden">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight font-display text-white">
                {lang === 'bn' ? 'ট্রাফিক ফাইন পেমেন্ট' : 'Traffic Fine Payment'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-mono mt-0.5">
                {lang === 'bn' ? 'স্মার্ট ই-সেবা' : 'Smart E-Services'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Active Navigation Back button if in detail state */}
          {step !== 'submit' && (
            <button
              onClick={() => {
                setStep('submit');
                setActiveFineId(null);
                setCurrentFine(null);
                setCaseIdInput('');
                setDuplicateError('');
              }}
              className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1.5 cursor-pointer bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 transition-all select-none"
            >
              &larr; {lang === 'bn' ? 'তালিকায় ফিরে যান' : 'Back to List'}
            </button>
          )}

          {/* TAB BAR: Only visible when on the primary 'submit' state */}
          {step === 'submit' && (
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('new');
                  setDuplicateError('');
                }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none ${
                  activeSubTab === 'new'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                <span>{lang === 'bn' ? 'নতুন আবেদন' : 'New Case'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className={`flex-1 py-2 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none relative ${
                  activeSubTab === 'history'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="h-4 w-4" />
                <span>{lang === 'bn' ? 'আমার জরিমানা' : 'My Fines'}</span>
                {userFines.filter(f => f.status === 'Awaiting Payment' || f.status === 'Submitted').length > 0 && (
                  <span className="absolute top-1.5 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>
            </div>
          )}

          {/* STEP 1: Submit Case ID (TAB: NEW) */}
          {step === 'submit' && activeSubTab === 'new' && (
            <form onSubmit={handleSubmitCase} className="space-y-4">
              <div className="text-center py-2 space-y-1">
                <span className="text-2xl">🚔</span>
                <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                  {lang === 'bn'
                    ? 'আপনার গাড়ির মামলার কেস আইডি লিখুন। এডমিন আপনার জরিমানা চার্জ ও যানবাহনের বিবরণ সহ ফাইলটি পাঠালে আপনি পরিশোধ করতে পারবেন।'
                    : 'Enter your case ID. As soon as the admin verifies it, you will see your fine details and can make payment.'}
                </p>
              </div>

              {duplicateError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{duplicateError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {lang === 'bn' ? 'কেস আইডি (Case ID)' : 'Case ID'}
                </label>
                <input
                  type="text"
                  required
                  value={caseIdInput}
                  onChange={(e) => {
                    setCaseIdInput(e.target.value);
                    setDuplicateError('');
                  }}
                  placeholder={lang === 'bn' ? 'উদাহরণ: ১২৩৪৫৬৭' : 'e.g. 1234567'}
                  className="w-full text-white bg-slate-900/80 border-2 border-slate-800 rounded-2xl py-3 px-4 outline-none font-mono text-base font-bold tracking-widest text-left focus:border-rose-500 focus:bg-slate-900 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !caseIdInput.trim()}
                className="w-full h-12 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500 rounded-2xl shadow-lg shadow-rose-600/10 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{lang === 'bn' ? 'সাবমিট করা হচ্ছে...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'bn' ? 'সাবমিট করুন' : 'Submit Case ID'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB: USER HISTORY / LIST */}
          {step === 'submit' && activeSubTab === 'history' && (
            <div className="space-y-3">
              {userFines.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-3xl space-y-2">
                  <span className="text-2xl block">📄</span>
                  <p className="text-xs text-slate-500 font-bold">
                    {lang === 'bn' ? 'কোনো পূর্ববর্তী জরিমানা বা মামলা নেই।' : 'No previous traffic fine history found.'}
                  </p>
                  <button
                    onClick={() => setActiveSubTab('new')}
                    className="text-[10px] font-extrabold text-rose-500 hover:underline inline-block mt-1"
                  >
                    {lang === 'bn' ? 'নতুন মামলা যোগ করুন &rarr;' : 'Add New Case Now &rarr;'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {userFines.map((fine, idx) => {
                    const isSubmitted = fine.status === 'Submitted';
                    const isAwaiting = fine.status === 'Awaiting Payment';
                    const isProcessing = fine.status === 'Processing';
                    const isPaid = fine.status === 'Paid';
                    const isRejected = fine.status === 'Rejected';

                    return (
                      <div
                        key={`user-fine-card-${fine.id}-${idx}`}
                        onClick={() => {
                          setActiveFineId(fine.id);
                          if (isSubmitted) setStep('pending');
                          else if (isAwaiting) setStep('pay');
                          else if (isProcessing) setStep('verifying');
                          else if (isPaid) setStep('success');
                        }}
                        className="p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-100">{fine.caseId}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-mono ${
                              isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              isAwaiting ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              isProcessing ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                              isRejected ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                              'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                            }`}>
                              {isPaid ? (lang === 'bn' ? 'পরিশোধিত' : 'Paid') :
                               isAwaiting ? (lang === 'bn' ? 'পরিশোধ বাকি' : 'Pay Now') :
                               isProcessing ? (lang === 'bn' ? 'পেমেন্ট যাচাই' : 'Verifying') :
                               isRejected ? (lang === 'bn' ? 'বাতিল' : 'Rejected') :
                               (lang === 'bn' ? 'যাচাই হচ্ছে' : 'Pending')}
                            </span>
                          </div>
                          
                          {fine.vehicleNumber && (
                            <p className="text-[10px] font-semibold text-slate-400">
                              🚗 {fine.vehicleNumber}
                            </p>
                          )}
                          <p className="text-[9px] text-slate-500 font-mono">
                            {fine.createdAt ? new Date(fine.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-2 shrink-0">
                          {fine.fineAmount > 0 && (
                            <span className="text-xs font-extrabold text-rose-400 font-mono">
                              ৳{fine.fineAmount.toLocaleString()}
                            </span>
                          )}
                          {isRejected && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(lang === 'bn' ? 'এই রেকর্ডটি কি মুছে ফেলতে চান?' : 'Delete this record?')) {
                                  try {
                                    await deleteDoc(doc(db, 'traffic_fines', fine.id));
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          {!isRejected && (
                            <ArrowRight className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Pending Admin Acceptance */}
          {step === 'pending' && (
            <div className="text-center py-6 space-y-5">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 h-16 w-16 bg-rose-500/10 rounded-full animate-ping opacity-25" />
                <div className="h-16 w-16 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center shadow-lg relative z-10">
                  <Loader2 className="h-8 w-8 animate-spin stroke-[2.5]" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  {lang === 'bn' ? 'এডমিন ভেরিফিকেশনের জন্য অপেক্ষা করছে' : 'Awaiting Admin Verification'}
                </h4>
                <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                  {lang === 'bn'
                    ? 'আপনার কেস আইডিটি এডমিন পোর্টালে পাঠানো হয়েছে। এডমিন মামলার কাগজপত্র চেক করে গাড়ির নম্বর ও জরিমানা টাকার পরিমাণ সাবমিট করার সাথে সাথে পেমেন্ট পেজ চলে আসবে।'
                    : 'Your Case ID is under administrative check. The payment screen will dynamically appear once the admin verifies documents, sets fine amount, and vehicle index.'}
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl max-w-xs mx-auto text-left space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">CASE ID:</span>
                  <span className="text-slate-200 font-bold">{currentFine?.caseId || caseIdInput}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">STATUS:</span>
                  <span className="text-amber-400 font-bold animate-pulse">PENDING VERIFICATION</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-semibold italic">
                {lang === 'bn' ? 'পোর্টালে চোখ রাখুন, এটি অটো রিলোড হবে...' : 'Keep this window open, it will reload in real-time...'}
              </p>
            </div>
          )}

          {/* STEP 2.5: Verifying Payment (User Paid, Admin needs to input Govt TxID) */}
          {step === 'verifying' && currentFine && (
            <div className="text-center py-6 space-y-5">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 h-16 w-16 bg-amber-500/10 rounded-full animate-ping opacity-25" />
                <div className="h-16 w-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full flex items-center justify-center shadow-lg relative z-10">
                  <Loader2 className="h-8 w-8 animate-spin stroke-[2.5]" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white tracking-tight animate-pulse">
                  {lang === 'bn' ? 'পেমেন্ট যাচাই করা হচ্ছে' : 'Payment Verification Pending'}
                </h4>
                <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                  {lang === 'bn'
                    ? 'আপনার পেমেন্ট এডমিন পোর্টালে পাঠানো হয়েছে। এডমিন পেমেন্ট স্লিপ এবং অফিশিয়াল ট্রানজেকশন আইডি চেক করে আপনার ফাইনটি সফল করবেন।'
                    : 'Your payment is being verified by the administrator. As soon as the admin inputs the official transaction ID, your payment will be successful and invoice will unlock.'}
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl max-w-xs mx-auto text-left space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">CASE ID:</span>
                  <span className="text-slate-200 font-bold">{currentFine?.caseId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VEHICLE NO:</span>
                  <span className="text-slate-200 font-bold">{currentFine?.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AMOUNT PAID:</span>
                  <span className="text-rose-400 font-bold">৳{currentFine?.fineAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">STATUS:</span>
                  <span className="text-amber-400 font-bold">PROCESSING PAYMENT</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-semibold italic">
                {lang === 'bn' ? 'অফিশিয়াল ট্রানজেকশন আইডি সাবমিট হওয়া মাত্রই রশিদ আনলক হবে...' : 'The official invoice will unlock instantly on admin TxID approval...'}
              </p>
            </div>
          )}

          {/* STEP 3: Accept & Pay (Admin Accepted Fine details display) */}
          {step === 'pay' && currentFine && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="h-9 w-9 bg-rose-500/15 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-200">
                    {lang === 'bn' ? 'জরিমানা পেমেন্ট রিকুয়েষ্ট' : 'Traffic Fine Invoice'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {lang === 'bn' ? 'এডমিন আপনার মামলা যাচাই করে পেমেন্ট রিলিজ করেছে।' : 'Admin approved Case ID and fetched legal charges.'}
                  </p>
                </div>
              </div>

              {/* Advanced UI matching Admin styling */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-slate-500 text-[10px] font-black uppercase tracking-wider font-mono">
                    {lang === 'bn' ? 'কেস আইডি (Case ID)' : 'Case ID'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentFine.caseId}
                    className="w-full text-slate-400 bg-slate-900/50 border border-slate-850 rounded-xl py-2 px-3 outline-none font-mono text-xs font-bold cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-500 text-[10px] font-black uppercase tracking-wider font-mono">
                    {lang === 'bn' ? 'যানবাহনের নম্বর (Vehicle Number)' : 'Vehicle Number'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentFine.vehicleNumber}
                    className="w-full text-slate-200 bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 outline-none font-mono text-xs font-bold cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-slate-500 text-[10px] font-black uppercase tracking-wider font-mono">
                      {lang === 'bn' ? 'জরিমানা চার্জ (Fine Amount)' : 'Fine Amount'}
                    </label>
                    <span className="text-[9px] text-slate-400 font-extrabold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {lang === 'bn' ? 'ব্যালেন্স: ৳' : 'Wallet: ৳'}{currentBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-display text-rose-500 text-sm font-extrabold">
                      ৳
                    </span>
                    <input
                      type="text"
                      disabled
                      value={currentFine.fineAmount}
                      className="w-full text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-xl py-2 pl-8 pr-4 outline-none font-display text-sm font-extrabold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {isLowBalance ? (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl flex flex-col gap-2.5">
                  <div className="flex gap-2 text-rose-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold leading-relaxed">
                      {lang === 'bn'
                        ? 'আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই! পেমেন্ট করতে ব্যালেন্স রিচার্জ করুন।'
                        : 'Insufficient balance in wallet to make fine payment! Please add funds to proceed.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onAddFundRedirect}
                    className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer select-none"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{lang === 'bn' ? 'টাকা যোগ করুন (Add Fund)' : 'Add Fund Now'}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePayClick}
                  className="w-full h-11 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-600/10 cursor-pointer transition-colors"
                >
                  {lang === 'bn' ? 'জরিমানা প্রদান করুন (Accept & Pay)' : 'Accept & Pay Fine'}
                </button>
              )}
            </div>
          )}

          {/* STEP 4: Enter PIN */}
          {step === 'pin' && currentFine && (
            <form onSubmit={handlePinSubmit} className="space-y-4 py-1">
              <div className="space-y-1 text-center">
                <div className="mx-auto h-12 w-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-white font-bold text-sm">
                  {lang === 'bn' ? 'পিন দিয়ে নিশ্চিত করুন' : 'Verify Secure PIN'}
                </h4>
              </div>

              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">VEHICLE NO:</span>
                  <span className="text-slate-200 font-bold">{currentFine.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PAY AMOUNT:</span>
                  <span className="text-rose-400 font-bold">৳{currentFine.fineAmount.toLocaleString()}</span>
                </div>
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
                  required
                  placeholder={lang === 'bn' ? '৪-ডিজিটের পিন' : '4-Digit Wallet PIN'}
                  className="w-40 mx-auto block text-center text-white text-2xl font-bold tracking-[1.5em] bg-slate-900 border border-slate-800 rounded-2xl py-2.5 outline-none focus:border-rose-500 font-mono"
                />

                {pinError && (
                  <p className="text-center text-rose-500 text-[10px] font-bold">
                    {lang === 'bn' ? 'ভুল পিন দিয়েছেন! পুনরায় চেষ্টা করুন।' : 'Incorrect PIN! Please try again.'}
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('pay')}
                  className="flex-1 h-11 text-xs font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  {lang === 'bn' ? 'পিছনে' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={pin.length !== 4}
                  className="flex-1 h-11 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl cursor-pointer shadow-md"
                >
                  {lang === 'bn' ? 'কনফার্ম করুন' : 'Confirm & Pay'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Success Screen */}
          {step === 'success' && currentFine && (
            <div className="space-y-5 text-center py-2 animate-scale-up">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 h-16 w-16 bg-emerald-500/10 rounded-full animate-ping opacity-25" />
                <div className="h-16 w-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 relative z-10">
                  <CheckCircle2 className="h-10 w-10 stroke-[2]" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-emerald-500 font-extrabold font-display text-lg tracking-tight">
                  {lang === 'bn' ? 'পেমেন্ট সফল হয়েছে' : 'Payment Completed'}
                </h3>
                <p className="text-slate-400 text-xs">
                  {lang === 'bn' ? 'আপনার ট্রাফিক জরিমানা সফলভাবে পরিশোধ করা হয়েছে।' : 'Your traffic fine charge was paid.'}
                </p>
              </div>

              <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2.5 font-medium max-w-[95%] mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'bn' ? 'কেস আইডি' : 'Case ID'}</span>
                  <span className="text-slate-200 font-mono font-bold">{currentFine.caseId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'bn' ? 'যানবাহন নম্বর' : 'Vehicle Number'}</span>
                  <span className="text-slate-200 font-mono font-bold">{currentFine.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'bn' ? 'মোট চার্জ' : 'Paid Amount'}</span>
                  <span className="text-rose-400 font-bold">৳{currentFine.fineAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'bn' ? 'ট্রানজেকশন আইডি' : 'TxID'}</span>
                  <span className="text-emerald-400 font-mono font-bold tracking-tight">{currentFine.govTxId || currentFine.transactionId || `TF-${activeFineId?.split('_')[1] || 'PAID'}`}</span>
                </div>
              </div>

              <div className="flex justify-center gap-2 max-w-[95%] mx-auto">
                <button
                  type="button"
                  onClick={() => alert(lang === 'bn' ? 'রসিদ সংরক্ষিত হয়েছে!' : 'Receipt downloaded!')}
                  className="flex-1 py-2 text-[10px] font-bold border border-slate-800 text-slate-300 bg-slate-900 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  <span>{lang === 'bn' ? 'ডাউনলোড রসিদ' : 'Download Invoice'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert(lang === 'bn' ? 'শেয়ারিং লিঙ্ক কপি করা হয়েছে!' : 'Sharing link copied!')}
                  className="px-3.5 py-2 text-[10px] border border-slate-800 text-slate-300 bg-slate-900 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"
                  title="Share"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('submit');
                    setActiveFineId(null);
                    setCurrentFine(null);
                    setCaseIdInput('');
                    setDuplicateError('');
                    setActiveSubTab('history');
                  }}
                  className="w-full h-11 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  {lang === 'bn' ? 'তালিকায় ফিরে যান' : 'Back to Fines List'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
