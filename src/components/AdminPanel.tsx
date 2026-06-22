import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Check, AlertTriangle, Plus, Trash2, Edit2, 
  Smartphone, CreditCard, Layers, Sparkles, RefreshCw, AlertCircle, FileText, Gift, Send
} from 'lucide-react';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, 
  query, orderBy, writeBatch, updateDoc, getDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Language, Operator, RechargePackage, PromoBanner, Transaction } from '../types';

const ADMIN_EMAILS = [
  'musicnrs2020@gmail.com',
  'nurnobyr36@gmail.com',
  'sabihait20@gmail.com'
];

interface AdminPanelProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ lang, isOpen, onClose }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'offers' | 'banners'>('requests');
  const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Rejection modal state
  const [rejectingTx, setRejectingTx] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  
  // Dynamic collections loaders
  const [offers, setOffers] = useState<RechargePackage[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  
  // Offer Form States
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [showOfferForm, setShowOfferForm] = useState<boolean>(false);
  const [offerForm, setOfferForm] = useState<Omit<RechargePackage, 'id'>>({
    title: '',
    titleBn: '',
    operator: 'GP',
    price: 100,
    validity: '30 Days',
    validityBn: '৩০ দিন',
    category: 'internet',
    volume: '',
    volumeBn: '',
    description: '',
    descriptionBn: '',
    isPopular: false
  });

  // Banner Form States
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [showBannerForm, setShowBannerForm] = useState<boolean>(false);
  const [bannerForm, setBannerForm] = useState<Omit<PromoBanner, 'id'>>({
    title: '',
    titleEn: '',
    desc: '',
    descEn: '',
    operator: 'GP',
    prefillAmount: 50,
    gradient: 'from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20'
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');

  // 1. Listen for collective admin requests
  useEffect(() => {
    const q = query(collection(db, 'admin_requests'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id } as Transaction);
      });
      setPendingRequests(list);
    }, (error) => {
      console.error("Error loading admin requests: ", error);
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen for offers
  useEffect(() => {
    const q = query(collection(db, 'offers'), orderBy('price', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: RechargePackage[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as RechargePackage);
      });
      setOffers(list);
    }, (error) => {
      console.error("Error loading offers inside admin panel: ", error);
    });

    return () => unsubscribe();
  }, []);

  // 3. Listen for banners
  useEffect(() => {
    const q = collection(db, 'banners');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PromoBanner[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as PromoBanner);
      });
      setBanners(list);
    }, (error) => {
      console.error("Error loading banners inside admin panel: ", error);
    });

    return () => unsubscribe();
  }, []);

  // Process Approval of Request
  const handleApprove = async (tx: Transaction) => {
    if (!tx.userId) {
      alert("Error: Missing user relationship on transaction.");
      return;
    }
    setIsProcessing(tx.id);
    setActionError('');
    try {
      const batch = writeBatch(db);
      
      // Update collective admin request status
      const adminReqRef = doc(db, 'admin_requests', tx.id);
      batch.update(adminReqRef, { status: 'Success' });

      // Update user specific transaction status
      const userTxRef = doc(db, 'users', tx.userId, 'transactions', tx.id);
      batch.update(userTxRef, { status: 'Success' });

      // If CashIn (Add Fund), increment customer wallet balance
      if (tx.type === 'CashIn') {
        const balanceDocRef = doc(db, 'users', tx.userId, 'wallet', 'balance_doc');
        const balanceSnap = await getDoc(balanceDocRef);
        let curBalance = 0;
        if (balanceSnap.exists()) {
          curBalance = balanceSnap.data().balance || 0;
        }
        batch.set(balanceDocRef, { balance: curBalance + tx.amount });

        // Add a friendly success notification to the user
        const notifId = `notif-${Date.now()}`;
        const notifRef = doc(db, 'users', tx.userId, 'notifications', notifId);
        batch.set(notifRef, {
          id: notifId,
          title: 'Add Fund Approved',
          titleBn: 'টাকা যোগ সফল হয়েছে',
          desc: `Your request of ৳${tx.amount} has been verified and added to wallet.`,
          descBn: `আপনার ৳${tx.amount} টাকা যোগের অনুরোধ অনুমোদিত হয়েছে এবং ওয়ালেটে যুক্ত করা হয়েছে।`,
          time: 'Just now',
          read: false
        });
      } else {
        // For Recharge and Bill, the balance is docked immediately during request creation.
        // So upon approval, we simply notify the user of transaction execution.
        const notifId = `notif-${Date.now()}`;
        const notifRef = doc(db, 'users', tx.userId, 'notifications', notifId);
        let detailText = tx.type === 'Recharge' 
          ? `Your recharge of ৳${tx.amount} to ${tx.targetNumber} has been approved.`
          : `Your payment of ৳${tx.amount} to ${tx.billerName} has been approved.`;
        let detailTextBn = tx.type === 'Recharge'
          ? `আপনার ${tx.targetNumber} নম্বরে ৳${tx.amount} টাকা রিচার্জের অনুরোধ সফল হয়েছে।`
          : `আপনার ${tx.billerNameBn} বিলে ৳${tx.amount} টাকা ফি পরিশোধ অনুমোদিত হয়েছে।`;

        batch.set(notifRef, {
          id: notifId,
          title: tx.type === 'Recharge' ? 'Recharge Approved' : 'Bill Approved',
          titleBn: tx.type === 'Recharge' ? 'রিচার্জ অনুমোদিত' : 'বিল পরিশোধ অনুমোদিত',
          desc: detailText,
          descBn: detailTextBn,
          time: 'Just now',
          read: false
        });
      }

      await batch.commit();
    } catch (err) {
      console.error("Error approving request: ", err);
      setActionError("Failed to approve transaction.");
    } finally {
      setIsProcessing(null);
    }
  };

  // Process Rejection with Reason
  const submitRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTx) return;
    const tx = rejectingTx;
    if (!tx.userId) return;

    if (!rejectReason.trim()) {
      alert("Please provide a cancellation reason.");
      return;
    }

    setIsProcessing(tx.id);
    setActionError('');
    try {
      const batch = writeBatch(db);
      
      // Update collective admin request
      const adminReqRef = doc(db, 'admin_requests', tx.id);
      batch.update(adminReqRef, { 
        status: 'Failed', 
        rejectionReason: rejectReason 
      });

      // Update user specific transaction
      const userTxRef = doc(db, 'users', tx.userId, 'transactions', tx.id);
      batch.update(userTxRef, { 
        status: 'Failed', 
        rejectionReason: rejectReason 
      });

      // If Recharge or Bill, refund docked user balance
      if (tx.type === 'Recharge' || tx.type === 'Bill') {
        const balanceDocRef = doc(db, 'users', tx.userId, 'wallet', 'balance_doc');
        const balanceSnap = await getDoc(balanceDocRef);
        let curBalance = 0;
        if (balanceSnap.exists()) {
          curBalance = balanceSnap.data().balance || 0;
        }
        batch.set(balanceDocRef, { balance: curBalance + tx.amount });
      }

      // Send rejection notification
      const notifId = `notif-${Date.now()}`;
      const notifRef = doc(db, 'users', tx.userId, 'notifications', notifId);
      
      let title = tx.type === 'CashIn' ? 'Deposit Rejected' : tx.type === 'Recharge' ? 'Recharge Rejected' : 'Bill Rejected';
      let titleBn = tx.type === 'CashIn' ? 'টাকা যোগ প্রত্যাখ্যাত' : tx.type === 'Recharge' ? 'রিচার্জ প্রত্যাখ্যাত' : 'বিল পরিশোধ প্রত্যাখ্যাত';
      
      let desc = `Your ৳${tx.amount} ${tx.type} requested has been declined. Reason: ${rejectReason}`;
      let descBn = `আপনার ৳${tx.amount} টাকার ${tx.type === 'CashIn' ? 'টাকা যোগ' : tx.type === 'Recharge' ? 'রিচার্জ' : 'বিল পরিশোধ'} বাতিল করা হয়েছে। কারণ: ${rejectReason}`;

      batch.set(notifRef, {
        id: notifId,
        title,
        titleBn,
        desc,
        descBn,
        time: 'Just now',
        read: false
      });

      await batch.commit();
      setRejectingTx(null);
      setRejectReason('');
    } catch (err) {
      console.error("Error rejecting request: ", err);
      setActionError("Failed to reject transaction.");
    } finally {
      setIsProcessing(null);
    }
  };

  // ---------------- OFFER PACKAGS MANAGEMENT ----------------
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const offerId = editingOfferId || `pkg-${Date.now()}`;
      const docRef = doc(db, 'offers', offerId);
      
      await setDoc(docRef, {
        ...offerForm,
        id: offerId
      });

      setShowOfferForm(false);
      setEditingOfferId(null);
      setOfferForm({
        title: '',
        titleBn: '',
        operator: 'GP',
        price: 100,
        validity: '30 Days',
        validityBn: '৩০ দিন',
        category: 'internet',
        volume: '',
        volumeBn: '',
        description: '',
        descriptionBn: '',
        isPopular: false
      });
    } catch (err) {
      console.error("Error saving offer: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOffer = (pkg: RechargePackage) => {
    setEditingOfferId(pkg.id);
    setOfferForm({
      title: pkg.title,
      titleBn: pkg.titleBn,
      operator: pkg.operator,
      price: pkg.price,
      validity: pkg.validity,
      validityBn: pkg.validityBn,
      category: pkg.category,
      volume: pkg.volume,
      volumeBn: pkg.volumeBn,
      description: pkg.description,
      descriptionBn: pkg.descriptionBn,
      isPopular: pkg.isPopular || false
    });
    setShowOfferForm(true);
  };

  const handleDeleteOffer = async (id: string) => {
    if(!confirm(lang === 'bn' ? 'অফারটি ডিলিট করতে চান?' : 'Are you sure you want to delete this offer?')) return;
    try {
      await deleteDoc(doc(db, 'offers', id));
    } catch (err) {
      console.error("Error deleting offer: ", err);
    }
  };

  // ---------------- BANNER MANAGEMENTS ----------------
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const bannerId = editingBannerId || `promo-${Date.now()}`;
      const docRef = doc(db, 'banners', bannerId);
      
      await setDoc(docRef, {
        ...bannerForm,
        id: bannerId
      });

      setShowBannerForm(false);
      setEditingBannerId(null);
      setBannerForm({
        title: '',
        titleEn: '',
        desc: '',
        descEn: '',
        operator: 'GP',
        prefillAmount: 50,
        gradient: 'from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20'
      });
    } catch (err) {
      console.error("Error saving banner: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBanner = (ban: PromoBanner) => {
    setEditingBannerId(ban.id);
    setBannerForm({
      title: ban.title,
      titleEn: ban.titleEn,
      desc: ban.desc,
      descEn: ban.descEn,
      operator: ban.operator,
      prefillAmount: ban.prefillAmount,
      gradient: ban.gradient
    });
    setShowBannerForm(true);
  };

  const handleDeleteBanner = async (id: string) => {
    if(!confirm(lang === 'bn' ? 'ব্যানারটি ডিলিট করতে চান?' : 'Are you sure you want to delete this banner?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
    } catch (err) {
      console.error("Error deleting banner: ", err);
    }
  };

  // Localized texts
  const labels = {
    title: lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল পোর্টাল' : 'Admin Operations Command',
    requests: lang === 'bn' ? 'পেন্ডিং রিকুয়েস্ট' : 'Pending Requests',
    offers: lang === 'bn' ? 'মোবাইল অফার প্যাক' : 'Manage Packs',
    banners: lang === 'bn' ? 'প্রোমো ব্যানার স্লাইড' : 'Promo Banners',
  };

  if (!isOpen) return null;

  const currentUser = auth.currentUser;
  const isUserAdmin = currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim());

  if (!isUserAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        />
        <div className="relative bg-white w-full max-w-sm rounded-[32px] p-6 text-center space-y-4 shadow-2xl relative z-10 border border-slate-150 animate-scale-up">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-full w-fit mx-auto">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="text-slate-900 font-extrabold text-sm font-display">
            {lang === 'bn' ? 'অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে' : 'Access Denied'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            {lang === 'bn' 
              ? 'আপনার ইমেইল ঠিকানাটি অ্যাডমিন প্যানেলে নিবন্ধিত নয়।' 
              : 'Your email address is not registered as an administrator.'}
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold cursor-pointer transition-all active:scale-95 border-0 outline-none"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
      />

      {/* Main Admin Console Container */}
      <div className="relative bg-slate-50 w-full max-w-2xl h-[90%] rounded-[36px] shadow-2xl border border-slate-200/50 flex flex-col relative z-10 overflow-hidden text-slate-800 animate-scale-up">
        
        {/* Header bar */}
        <div className="bg-white border-b border-slate-150 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/10">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-slate-900 font-extrabold text-sm tracking-tight font-display flex items-center gap-1.5 leading-none">
                {labels.title}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold font-mono tracking-wider mt-1">
                SECURE SANDBOX ADMINISTRATIVE MODE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Dynamic Inner Tab Controller header pill list */}
        <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex gap-2">
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'requests' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' 
                : 'bg-slate-100/80 hover:bg-slate-150 text-slate-600'
            }`}
          >
            {labels.requests} ({pendingRequests.filter(r => r.status === 'Pending').length})
          </button>
          <button
            onClick={() => setActiveSubTab('offers')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'offers' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' 
                : 'bg-slate-100/80 hover:bg-slate-150 text-slate-600'
            }`}
          >
            {labels.offers} ({offers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('banners')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'banners' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' 
                : 'bg-slate-100/80 hover:bg-slate-150 text-slate-600'
            }`}
          >
            {labels.banners} ({banners.length})
          </button>
        </div>

        {/* Scrollable Workspace panel viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-600 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* TAB 1: PENDING USER REQUESTS */}
          {activeSubTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">
                  ACTIVE TRANSACTIONS POOL
                </span>
                <span className="text-[10px] text-blue-600 font-bold">
                  {lang === 'bn' ? 'রিয়েল-টাইমে আপডেট হচ্ছে' : 'Listening Live via snapshots'}
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="bg-white border border-slate-150 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-2">
                  <FileText className="h-10 w-10 text-slate-300" />
                  <h4 className="text-slate-800 font-bold text-xs">
                    {lang === 'bn' ? 'কোনো পেন্ডিং রিকোয়েস্ট নেই' : 'All clear! No pending requests'}
                  </h4>
                  <p className="text-slate-400 text-[10.5px] max-w-xs leading-relaxed font-semibold">
                    {lang === 'bn' ? 'যখন ইউজার রিচার্জ, বিল পরিশোধ বা অ্যাড ফান্ড রিকোয়েস্ট সাবমিট করবে তা এখানে জমা হবে।' : 'When client users trigger a cash-in, recharge, or utility pay request, it manifests here in real-time.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => {
                    const isTxPending = req.status === 'Pending';
                    return (
                      <div 
                        key={req.id} 
                        className={`bg-white border border-slate-150 rounded-2xl p-5 shadow-xs transition-all relative overflow-hidden flex flex-col justify-between ${
                          !isTxPending ? 'opacity-70 bg-slate-50 border-slate-200' : ''
                        }`}
                      >
                        {/* Top banner tag detailing operator or type */}
                        <div className="absolute right-0 top-0 h-5 px-3 rounded-bl-lg text-[9px] font-black uppercase flex items-center text-white bg-slate-900 tracking-wide">
                          {req.type}
                        </div>

                        <div className="space-y-2.5">
                          {/* User metadata */}
                          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-semibold leading-none">
                            <span className="bg-slate-100 text-slate-700 font-bold size-4 text-[9px] flex items-center justify-center rounded-sm">U</span>
                            <span className="text-slate-700 font-bold">{req.userName || req.userEmail || 'Client ID'}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-mono text-[9px] font-medium">{req.date}</span>
                          </div>

                          {/* Primary content row */}
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-base text-slate-900 font-extrabold font-display leading-tight flex items-center gap-2">
                                <span>৳{req.amount}</span>
                                <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                                  req.status === 'Success' ? 'bg-emerald-100 text-emerald-700' :
                                  req.status === 'Failed' ? 'bg-rose-100 text-rose-700' :
                                  'bg-amber-100 text-amber-700 font-black animate-pulse'
                                }`}>
                                  {req.status}
                                </span>
                              </h3>
                              
                              <div className="text-xs text-slate-600 font-bold mt-1 space-y-0.5">
                                {req.type === 'CashIn' && (
                                  <>
                                    <p>{lang === 'bn' ? `মোবাইল ব্যাংকিং মাধ্যম: ${req.targetNumber}` : `Depository Channel: ${req.targetNumber}`}</p>
                                    <p className="text-blue-600 text-xs font-bold leading-none font-mono">
                                      TrxID: {req.txId}
                                    </p>
                                  </>
                                )}
                                {req.type === 'Recharge' && (
                                  <p>{lang === 'bn' ? `অপারেটর: ${req.operator} | রিচার্জ নম্বর: ${req.targetNumber}` : `Operator: ${req.operator} | Number: ${req.targetNumber}`}</p>
                                )}
                                {req.type === 'Bill' && (
                                  <p>{lang === 'bn' ? `বিল দাতা: ${req.billerNameBn}` : `Biller: ${req.billerName}`}</p>
                                )}
                              </div>

                              {req.rejectionReason && (
                                <p className="text-rose-600 font-bold text-[10px] mt-1 p-1 bg-rose-50 rounded-lg inline-block">
                                  {lang === 'bn' ? `বাতিলের কারণ: ${req.rejectionReason}` : `Declined Reason: ${req.rejectionReason}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons if pending */}
                        {isTxPending && (
                          <div className="flex gap-2.5 border-t border-slate-100 pt-3.5 mt-3.5 justify-end">
                            <button
                              disabled={isProcessing === req.id}
                              onClick={() => setRejectingTx(req)}
                              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 shrink-0"
                            >
                              <X className="h-3.5 w-3.5 shrink-0" />
                              <span>{lang === 'bn' ? 'রিজেক্ট করুন' : 'Reject / Flag'}</span>
                            </button>
                            <button
                              disabled={isProcessing === req.id}
                              onClick={() => handleApprove(req)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 text-center shrink-0"
                            >
                              {isProcessing === req.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                              ) : (
                                <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
                              )}
                              <span>{lang === 'bn' ? 'সরাসরি এপ্রুভ করুন' : 'Verify & Approve'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANAGE PACKS / PACKAGES */}
          {activeSubTab === 'offers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">
                  DYNAMIC CELLULAR CATALOG
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingOfferId(null);
                    setOfferForm({
                      title: '',
                      titleBn: '',
                      operator: 'GP',
                      price: 100,
                      validity: '30 Days',
                      validityBn: '৩০ দিন',
                      category: 'internet',
                      volume: '',
                      volumeBn: '',
                      description: '',
                      descriptionBn: '',
                      isPopular: false
                    });
                    setShowOfferForm(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-md shadow-blue-500/10 cursor-pointer active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>{lang === 'bn' ? 'নতুন অফার যুক্ত করুন' : 'Add New Pack'}</span>
                </button>
              </div>

              {/* Add/Edit Offer Inline Form Overlay Panel */}
              {showOfferForm && (
                <form onSubmit={handleSaveOffer} className="p-5 bg-white border-2 border-blue-100 rounded-3xl space-y-4 text-slate-800">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-slate-900 font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                      <Gift className="h-4.5 w-4.5 text-blue-600" />
                      <span>{editingOfferId ? (lang === 'bn' ? 'অফার এডিট করুন' : 'Edit Pack details') : (lang === 'bn' ? 'নতুন অফার যুক্ত করুন' : 'Add New Pack')}</span>
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowOfferForm(false)}
                      className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Title (EN)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Robi 30 GB Pack"
                        value={offerForm.title}
                        onChange={(e) => setOfferForm({...offerForm, title: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Title (বাংলা)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="রবি ৩০ জিবি প্যাক"
                        value={offerForm.titleBn}
                        onChange={(e) => setOfferForm({...offerForm, titleBn: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Operator</label>
                      <select
                        value={offerForm.operator}
                        onChange={(e) => setOfferForm({...offerForm, operator: e.target.value as Operator})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="GP">GP (Grameenphone)</option>
                        <option value="Robi">Robi</option>
                        <option value="Airtel">Airtel</option>
                        <option value="Banglalink">Banglalink</option>
                        <option value="Teletalk">Teletalk</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Category</label>
                      <select
                        value={offerForm.category}
                        onChange={(e) => setOfferForm({...offerForm, category: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="internet">Internet</option>
                        <option value="talktime">Voice (Talktime)</option>
                        <option value="bundle">Bundle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Price (৳)</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={offerForm.price}
                        onChange={(e) => setOfferForm({...offerForm, price: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Validity (EN)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 30 Days"
                        value={offerForm.validity}
                        onChange={(e) => setOfferForm({...offerForm, validity: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Validity (বাংলা)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="৩০ দিন"
                        value={offerForm.validityBn}
                        onChange={(e) => setOfferForm({...offerForm, validityBn: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Volume Volume (EN)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 30 GB"
                        value={offerForm.volume}
                        onChange={(e) => setOfferForm({...offerForm, volume: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Volume Volume (বাংলা)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="৩০ জিবি"
                        value={offerForm.volumeBn}
                        onChange={(e) => setOfferForm({...offerForm, volumeBn: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase">Description (EN)</label>
                    <textarea 
                      rows={2}
                      required
                      placeholder="Descriptions..."
                      value={offerForm.description}
                      onChange={(e) => setOfferForm({...offerForm, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase">Description (বাংলা)</label>
                    <textarea 
                      rows={2}
                      required
                      placeholder="অফারের বর্ণনা..."
                      value={offerForm.descriptionBn}
                      onChange={(e) => setOfferForm({...offerForm, descriptionBn: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="opt-popular"
                      checked={offerForm.isPopular}
                      onChange={(e) => setOfferForm({...offerForm, isPopular: e.target.checked})}
                      className="h-4 w-4 text-blue-600 rounded cursor-pointer border-slate-200"
                    />
                    <label htmlFor="opt-popular" className="text-xs text-slate-600 font-extrabold select-none cursor-pointer">
                      {lang === 'bn' ? 'জনপ্রিয় অফার হিসেবে প্রদর্শন (Popular Offer Badge)' : 'Show as Popular Offer Badge'}
                    </label>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowOfferForm(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {loading ? (lang === 'bn' ? 'রক্ষণ করা হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Offer')}
                    </button>
                  </div>
                </form>
              )}

              {/* Offers list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {offers.map((pkg) => (
                  <div key={pkg.id} className="bg-white border border-slate-200/60 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                    <span className="absolute right-0 top-0 text-[8.5px] uppercase font-black bg-slate-150 text-slate-600 px-2 py-0.5 rounded-bl-lg">
                      {pkg.operator}
                    </span>
                    <div className="space-y-1 pr-12">
                      <h4 className="text-xs text-slate-900 font-extrabold leading-tight">
                        {lang === 'bn' ? pkg.titleBn : pkg.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-extrabold font-mono uppercase tracking-wide">
                        {pkg.category} | {lang === 'bn' ? pkg.validityBn : pkg.validity}
                      </p>
                      <p className="text-[10.5px] text-slate-500 leading-normal font-semibold">
                        {lang === 'bn' ? pkg.descriptionBn : pkg.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                      <span className="text-blue-600 font-extrabold text-sm">৳{pkg.price}</span>
                      <div className="flex gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditOffer(pkg)}
                          className="p-1 px-2.0 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <Edit2 className="h-3 w-3 shrink-0" />
                          <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(pkg.id)}
                          className="p-1 px-2.0 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <Trash2 className="h-3 w-3 shrink-0" />
                          <span>{lang === 'bn' ? 'ডিলিট' : 'Del'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MANAGE PROMOS / BANNERS */}
          {activeSubTab === 'banners' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">
                  ACTIVE ROTATING PROMOTIONS
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBannerId(null);
                    setBannerForm({
                      title: '',
                      titleEn: '',
                      desc: '',
                      descEn: '',
                      operator: 'GP',
                      prefillAmount: 50,
                      gradient: 'from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20'
                    });
                    setShowBannerForm(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-md shadow-blue-500/10 cursor-pointer active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>{lang === 'bn' ? 'নতুন ব্যানার যুক্ত করুন' : 'Add Promo Banner'}</span>
                </button>
              </div>

              {/* Add/Edit Banner Overlay Form */}
              {showBannerForm && (
                <form onSubmit={handleSaveBanner} className="p-5 bg-white border-2 border-blue-100 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-slate-900 font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-blue-600" />
                      <span>{editingBannerId ? (lang === 'bn' ? 'ব্যানার এডিট করুন' : 'Edit Banner info') : (lang === 'bn' ? 'নতুন ব্যানার যুক্ত করুন' : 'Add Promo Slider')}</span>
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowBannerForm(false)}
                      className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Banner Headline (বাংলা)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. ১০% ইনস্ট্যান্ট ক্যাশব্যাক"
                        value={bannerForm.title}
                        onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Banner Headline (EN)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 10% Instant Cashback"
                        value={bannerForm.titleEn}
                        onChange={(e) => setBannerForm({...bannerForm, titleEn: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Target Operator</label>
                      <select
                        value={bannerForm.operator}
                        onChange={(e) => setBannerForm({...bannerForm, operator: e.target.value as Operator})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="GP">Grameenphone</option>
                        <option value="Robi">Robi</option>
                        <option value="Airtel">Airtel</option>
                        <option value="Banglalink">Banglalink</option>
                        <option value="Teletalk">Teletalk</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Prefill Recharge Amount</label>
                      <input 
                        type="number" 
                        required
                        value={bannerForm.prefillAmount}
                        onChange={(e) => setBannerForm({...bannerForm, prefillAmount: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Color theme / styling</label>
                      <select
                        value={bannerForm.gradient}
                        onChange={(e) => setBannerForm({...bannerForm, gradient: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 cursor-pointer text-[10.5px]"
                      >
                        <option value="from-emerald-500/10 via-emerald-600/5 to-transparent border-emerald-500/20">Emerald Green (Teletalk)</option>
                        <option value="from-orange-500/10 via-red-600/5 to-transparent border-orange-500/20">Sunset Orange (Robi)</option>
                        <option value="from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20">Cosmic Blue (GP)</option>
                        <option value="from-red-600/10 via-pink-600/5 to-transparent border-red-500/20">Airtel Ruby Red (Airtel)</option>
                        <option value="from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20">Banglalink Amber (BL)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase">Description (বাংলা)</label>
                    <textarea 
                      rows={2}
                      required
                      placeholder="ব্যানারের সংক্ষিপ্ত বর্ণনা..."
                      value={bannerForm.desc}
                      onChange={(e) => setBannerForm({...bannerForm, desc: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase">Description (EN)</label>
                    <textarea 
                      rows={2}
                      required
                      placeholder="Promo banner description in or for English..."
                      value={bannerForm.descEn}
                      onChange={(e) => setBannerForm({...bannerForm, descEn: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBannerForm(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {loading ? (lang === 'bn' ? 'রক্ষণ করা হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Banner')}
                    </button>
                  </div>
                </form>
              )}

              {/* Banners slider control checklist */}
              <div className="space-y-3">
                {banners.map((ban) => (
                  <div key={ban.id} className="bg-white border border-slate-150 p-4 rounded-3xl flex items-center justify-between group">
                    <div className="space-y-1 max-w-[75%]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] font-black tracking-widest text-blue-600 uppercase">
                          {ban.operator} SLIDER
                        </span>
                        <span className="text-[9px] text-slate-400">Prefill: ৳{ban.prefillAmount}</span>
                      </div>
                      <h4 className="text-xs text-slate-900 font-extrabold">
                        {lang === 'bn' ? ban.title : ban.titleEn}
                      </h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">
                        {lang === 'bn' ? ban.desc : ban.descEn}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleEditBanner(ban)}
                        className="p-1 px-3 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3 shrink-0" />
                        <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(ban.id)}
                        className="p-1 px-3 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* REJECTION DISMISSAL INPUT DIALOG POPUP */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setRejectingTx(null)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
          />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 border border-slate-100 flex flex-col space-y-4 relative z-10 animate-scale-up text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-slate-900 font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                <span>{lang === 'bn' ? 'রিকুয়েস্ট প্রত্যাখ্যান করুন' : 'Provide Rejection Reason'}</span>
              </h3>
              <button 
                onClick={() => setRejectingTx(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={submitRejection} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block ml-1">
                  {lang === 'bn' ? 'প্রত্যাখ্যানের সুনির্দিষ্ট কারণ' : 'Reason for declining'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'bn' ? 'যেমন: ফেইক ট্রানজেকশন আইডি / ভুল তথ্য...' : 'e.g. Fake Reference ID or Invalid transaction details'}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-150 rounded-2xl py-3 px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* Suggested quick reasons for Bangladeshi payment contexts */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  lang === 'bn' ? 'ফেইক ট্রানজেকশন আইডি' : 'Fake Transaction ID',
                  lang === 'bn' ? 'টাকা পাওয়া যায়নি' : 'Fund not received',
                  lang === 'bn' ? 'ভুল অ্যাকাউন্ট নম্বর' : 'Invalid Number ID',
                  lang === 'bn' ? 'সীমা অতিক্রম করেছে' : 'Limit exceeded',
                ].map((reasonWord) => (
                  <button
                    type="button"
                    key={reasonWord}
                    onClick={() => setRejectReason(reasonWord)}
                    className="px-2.5 py-1 rounded-full bg-slate-150 hover:bg-slate-200 transition-all text-[9.5px] text-slate-600 font-extrabold font-mono cursor-pointer"
                  >
                    {reasonWord}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingTx(null)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isProcessing === rejectingTx.id}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/10 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  <span>{lang === 'bn' ? 'কনফর্ম বাতিল করুন' : 'Confirm Decline'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
