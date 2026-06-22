import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Check, AlertTriangle, Plus, Trash2, Edit2, 
  Smartphone, CreditCard, Layers, Sparkles, RefreshCw, AlertCircle, FileText, Gift, Send,
  LogOut
} from 'lucide-react';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, 
  query, orderBy, writeBatch, updateDoc, getDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Language, Operator, RechargePackage, PromoBanner, Transaction, BillProvider } from '../types';

const ADMIN_EMAILS = [
  'musicnrs2020@gmail.com',
  'nurnobyr36@gmail.com',
  'sabihait20@gmail.com',
  'dhukabuzz420@gmail.com'
];

interface AdminPanelProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
}

export default function AdminPanel({ lang, isOpen, onClose, isStandalone = false }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'offers' | 'banners' | 'billers'>('requests');
  const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Rejection modal state
  const [rejectingTx, setRejectingTx] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  
  // Dynamic collections loaders
  const [offers, setOffers] = useState<RechargePackage[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [billers, setBillers] = useState<BillProvider[]>([]);
  
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
    isPopular: false,
    imageUrl: ''
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
    gradient: 'from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20',
    imageUrl: ''
  });

  // Biller Form States
  const [editingBillerId, setEditingBillerId] = useState<string | null>(null);
  const [showBillerForm, setShowBillerForm] = useState<boolean>(false);
  const [billerForm, setBillerForm] = useState<Omit<BillProvider, 'id'>>({
    name: '',
    nameBn: '',
    category: 'Electricity',
    categoryBn: 'বিদ্যুৎ',
    logoColor: 'bg-blue-600',
    imageUrl: ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: 'offer' | 'banner' | 'biller';
    title: string;
  } | null>(null);

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

  // 4. Listen for billers
  useEffect(() => {
    const q = collection(db, 'billers');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: BillProvider[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as BillProvider);
      });
      setBillers(list);
    }, (error) => {
      console.error("Error loading billers inside admin panel: ", error);
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
        isPopular: false,
        imageUrl: ''
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
      isPopular: pkg.isPopular || false,
      imageUrl: pkg.imageUrl || ''
    });
    setShowOfferForm(true);
  };

  const handleDeleteOffer = (id: string, title: string) => {
    setDeleteConfirm({ id, type: 'offer', title });
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
        gradient: 'from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20',
        imageUrl: ''
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
      gradient: ban.gradient,
      imageUrl: ban.imageUrl || ''
    });
    setShowBannerForm(true);
  };

  const handleDeleteBanner = (id: string, title: string) => {
    setDeleteConfirm({ id, type: 'banner', title });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { type, id } = deleteConfirm;
      let collectionName = '';
      if (type === 'offer') collectionName = 'offers';
      else if (type === 'banner') collectionName = 'banners';
      else if (type === 'biller') collectionName = 'billers';

      if (collectionName) {
        await deleteDoc(doc(db, collectionName, id));
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error executing delete: ", err);
    }
  };

  // ---------------- BILLERS MANAGEMENT ----------------
  const handleSaveBiller = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const billerId = editingBillerId || `bill-${Date.now()}`;
      const docRef = doc(db, 'billers', billerId);
      
      await setDoc(docRef, {
        ...billerForm,
        id: billerId
      });

      setShowBillerForm(false);
      setEditingBillerId(null);
      setBillerForm({
        name: '',
        nameBn: '',
        category: 'Electricity',
        categoryBn: 'বিদ্যুৎ',
        logoColor: 'bg-blue-600',
        imageUrl: ''
      });
    } catch (err) {
      console.error("Error saving biller: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBiller = (biller: BillProvider) => {
    setEditingBillerId(biller.id);
    setBillerForm({
      name: biller.name,
      nameBn: biller.nameBn,
      category: biller.category,
      categoryBn: biller.categoryBn,
      logoColor: biller.logoColor,
      imageUrl: biller.imageUrl || ''
    });
    setShowBillerForm(true);
  };

  const handleDeleteBiller = (id: string, title: string) => {
    setDeleteConfirm({ id, type: 'biller', title });
  };

  const setBillerCategory = (cat: 'Electricity' | 'Water' | 'Gas' | 'Internet' | 'Education') => {
    const catsBn = {
      Electricity: 'বিদ্যুৎ',
      Water: 'পানি',
      Gas: 'গ্যাস',
      Internet: 'ইন্টারনেট',
      Education: 'শিক্ষা'
    };
    setBillerForm({
      ...billerForm,
      category: cat,
      categoryBn: catsBn[cat] || 'অন্যান্য'
    });
  };

  // Localized texts
  const labels = {
    title: lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল পোর্টাল' : 'Admin Operations Command',
    requests: lang === 'bn' ? 'পেন্ডিং রিকুয়েস্ট' : 'Pending Requests',
    offers: lang === 'bn' ? 'মোবাইল অফার প্যাক' : 'Manage Packs',
    banners: lang === 'bn' ? 'প্রোমো ব্যানার স্লাইড' : 'Promo Banners',
    billers: lang === 'bn' ? 'ইউটিলিটি বিলার' : 'Manage Billers',
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

  const adminPanelBody = (
    <>
      <div className={isStandalone ? "w-full h-full bg-slate-950 flex flex-col relative overflow-hidden text-slate-100" : "relative bg-slate-900/85 backdrop-blur-2xl w-full max-w-2xl h-[90%] rounded-[36px] shadow-2xl border border-white/10 flex flex-col relative z-10 overflow-hidden text-slate-100 animate-scale-up"}>
      
      {/* Dynamic Ambient Blur Spheres */}
      <div className="absolute top-[-50px] right-[-50px] w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none select-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none select-none" />

      {/* Header bar */}
      <div className="bg-slate-950/60 backdrop-blur-md border-b border-white/10 px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/15">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5 leading-none">
              {labels.title}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold font-mono tracking-wider mt-1.5">
              {isStandalone ? "SECURE HARDENED ADMINISTRATIVE SYSTEM" : "SECURE SANDBOX ADMINISTRATIVE MODE"}
            </p>
          </div>
        </div>
        {isStandalone ? (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-rose-500/15"
          >
            <LogOut className="h-4 w-4" />
            <span>{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Dynamic Inner Tab Controller header pill list */}
      <div className="bg-slate-950/40 border-b border-white/5 px-6 py-3 flex gap-2 overflow-x-auto scroller-hidden relative z-10">
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'requests' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-transparent' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {labels.requests} ({pendingRequests.filter(r => r.status === 'Pending').length})
          </button>
          <button
            onClick={() => setActiveSubTab('offers')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'offers' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-transparent' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {labels.offers} ({offers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('banners')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'banners' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-transparent' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {labels.banners} ({banners.length})
          </button>
          <button
            onClick={() => setActiveSubTab('billers')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'billers' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-transparent' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {labels.billers} ({billers.length})
          </button>
        </div>

        {/* Scrollable Workspace panel viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 bg-slate-900/30">
          
          {actionError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2 text-rose-400 text-xs font-semibold">
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
                <span className="text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors">
                  {lang === 'bn' ? 'রিয়েল-টাইমে আপডেট হচ্ছে' : 'Listening Live via snapshots'}
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-2">
                  <FileText className="h-10 w-10 text-slate-600" />
                  <h4 className="text-white font-bold text-xs">
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
                        className={`bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-lg transition-all relative overflow-hidden flex flex-col justify-between ${
                          !isTxPending ? 'opacity-50 bg-slate-950/40 border-slate-800/60' : ''
                        }`}
                      >
                        {/* Top banner tag detailing operator or type */}
                        <div className="absolute right-0 top-0 h-5 px-3 rounded-bl-lg text-[9px] font-black uppercase flex items-center text-white bg-slate-950 border-l border-b border-white/10 tracking-wide">
                          {req.type}
                        </div>

                        <div className="space-y-2.5">
                          {/* User metadata */}
                          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-semibold leading-none">
                            <span className="bg-white/10 text-slate-200 font-bold size-4 text-[9px] flex items-center justify-center rounded-sm">U</span>
                            <span className="text-slate-200 font-bold">{req.userName || req.userEmail || 'Client ID'}</span>
                            <span className="text-slate-500">|</span>
                            <span className="font-mono text-[9px] font-medium text-slate-400">{req.date}</span>
                          </div>

                          {/* Primary content row */}
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-base text-white font-extrabold leading-tight flex items-center gap-2">
                                <span>৳{req.amount}</span>
                                <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                                  req.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  req.status === 'Failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black animate-pulse'
                                }`}>
                                  {req.status}
                                </span>
                              </h3>
                              
                              <div className="text-xs text-slate-300 font-medium mt-1 space-y-0.5">
                                {req.type === 'CashIn' && (
                                  <>
                                    <p>{lang === 'bn' ? `মোবাইল ব্যাংকিং মাধ্যম: ${req.targetNumber}` : `Depository Channel: ${req.targetNumber}`}</p>
                                    <p className="text-blue-400 text-xs font-bold leading-none font-mono mt-1">
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
                                <p className="text-rose-400 font-semibold text-[10px] mt-1.5 p-1 px-2 bg-rose-500/10 rounded-lg inline-block border border-rose-500/15">
                                  {lang === 'bn' ? `বাতিলের কারণ: ${req.rejectionReason}` : `Declined Reason: ${req.rejectionReason}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons if pending */}
                        {isTxPending && (
                          <div className="flex gap-2.5 border-t border-white/10 pt-3.5 mt-3.5 justify-end">
                            <button
                              disabled={isProcessing === req.id}
                              onClick={() => setRejectingTx(req)}
                              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 shrink-0 border border-rose-500/10"
                            >
                              <X className="h-3.5 w-3.5 shrink-0" />
                              <span>{lang === 'bn' ? 'রিজেক্ট করুন' : 'Reject / Flag'}</span>
                            </button>
                            <button
                              disabled={isProcessing === req.id}
                              onClick={() => handleApprove(req)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 text-center shrink-0"
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
                      isPopular: false,
                      imageUrl: ''
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

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase font-mono">Custom Pack Image URL (প্যাক ইমেজ লিংক - ঐচ্ছিক / Optional)</label>
                    <input 
                      type="url" 
                      placeholder="যেমন: https://domain.com/pack-image.jpg"
                      value={offerForm.imageUrl || ''}
                      onChange={(e) => setOfferForm({...offerForm, imageUrl: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 font-mono text-emerald-600 placeholder-slate-400"
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
                    <div className="flex gap-3">
                      {pkg.imageUrl && (
                        <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-slate-100/50 shadow-sm relative self-start mt-1">
                          <img 
                            src={pkg.imageUrl} 
                            alt="pkg logo" 
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="space-y-1 flex-1 pr-8">
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
                          onClick={() => handleDeleteOffer(pkg.id, lang === 'bn' ? pkg.titleBn : pkg.title)}
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
                <form onSubmit={handleSaveBanner} className="p-5 bg-slate-900 border border-white/15 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="text-white font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-blue-400" />
                      <span>{editingBannerId ? (lang === 'bn' ? 'ব্যানার এডিটর' : 'Edit Banner details') : (lang === 'bn' ? 'নতুন ব্যানার যুক্ত করুন' : 'Add Promo Banner')}</span>
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowBannerForm(false)}
                      className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase">Banner Headline (বাংলা)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="যেমন: ১০% ইনস্ট্যান্ট ক্যাশব্যাক"
                        value={bannerForm.title}
                        onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 placeholder-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase">Banner Headline (EN)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 10% Instant Cashback"
                        value={bannerForm.titleEn}
                        onChange={(e) => setBannerForm({...bannerForm, titleEn: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase">Target Operator</label>
                      <select
                        value={bannerForm.operator}
                        onChange={(e) => setBannerForm({...bannerForm, operator: e.target.value as Operator})}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 cursor-pointer"
                      >
                        <option value="GP" className="bg-slate-900">Grameenphone</option>
                        <option value="Robi" className="bg-slate-900">Robi</option>
                        <option value="Airtel" className="bg-slate-900">Airtel</option>
                        <option value="Banglalink" className="bg-slate-900">Banglalink</option>
                        <option value="Teletalk" className="bg-slate-900">Teletalk</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase">Prefill Recharge Amount</label>
                      <input 
                        type="number" 
                        required
                        value={bannerForm.prefillAmount}
                        onChange={(e) => setBannerForm({...bannerForm, prefillAmount: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 placeholder-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase">Color theme / styling</label>
                      <select
                        value={bannerForm.gradient}
                        onChange={(e) => setBannerForm({...bannerForm, gradient: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 cursor-pointer text-[10.5px]"
                      >
                        <option value="from-emerald-500/10 via-emerald-600/5 to-transparent border-emerald-500/20" className="bg-slate-900">Emerald Green (Teletalk)</option>
                        <option value="from-orange-500/10 via-red-600/5 to-transparent border-orange-500/20" className="bg-slate-900">Sunset Orange (Robi)</option>
                        <option value="from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20" className="bg-slate-900">Cosmic Blue (GP)</option>
                        <option value="from-red-600/10 via-pink-600/5 to-transparent border-red-500/20" className="bg-slate-900">Airtel Ruby Red (Airtel)</option>
                        <option value="from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20" className="bg-slate-900">Banglalink Amber (BL)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-400 uppercase font-mono">Custom Banner Image URL (প্রমো ইমেজ লিংক - ঐচ্ছিক / Optional)</label>
                    <input 
                      type="url" 
                      placeholder="e.g. https://domain.com/banner.jpg (ইমেজ ব্যানার শো করার জন্য ইমেজ লিংক বসান)"
                      value={bannerForm.imageUrl || ''}
                      onChange={(e) => setBannerForm({...bannerForm, imageUrl: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-emerald-400 font-mono focus:border-emerald-500 placeholder-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-400 uppercase">Description (বাংলা)</label>
                    <textarea 
                      rows={2}
                      required
                      placeholder="ব্যানারের সংক্ষিপ্ত বর্ণনা..."
                      value={bannerForm.desc}
                      onChange={(e) => setBannerForm({...bannerForm, desc: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 resize-none placeholder-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-400 uppercase">Description (EN)</label>
                    <textarea 
                      rows={2}
                      required
                      placeholder="Promo banner description in or for English..."
                      value={bannerForm.descEn}
                      onChange={(e) => setBannerForm({...bannerForm, descEn: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 resize-none placeholder-slate-700"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowBannerForm(false)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/10 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      {loading ? (lang === 'bn' ? 'রক্ষণ করা হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Banner')}
                    </button>
                  </div>
                </form>
              )}

              {/* Banners slider control checklist */}
              <div className="space-y-3">
                {banners.map((ban) => (
                  <div key={ban.id} className="bg-slate-900/40 backdrop-blur-md border border-white/15 p-4 rounded-3xl flex items-center justify-between gap-3 group hover:bg-slate-900/60 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-3.5 max-w-[75%]">
                      {ban.imageUrl ? (
                        <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md relative group-hover:scale-105 transition-transform">
                          <img 
                            src={ban.imageUrl} 
                            alt="preview" 
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl shrink-0 bg-slate-950 border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                          {ban.operator}
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase">
                            {ban.operator} SLIDER
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">Prefill: ৳{ban.prefillAmount}</span>
                          {ban.imageUrl && (
                            <span className="text-[8.5px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/10 font-mono">
                              Image Banner
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs text-white font-extrabold leading-tight">
                          {lang === 'bn' ? ban.title : ban.titleEn}
                        </h4>
                        <p className="text-[10.5px] text-slate-400 leading-normal font-semibold">
                          {lang === 'bn' ? ban.desc : ban.descEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleEditBanner(ban)}
                        className="p-1.5 px-3 bg-white/5 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3 shrink-0" />
                        <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(ban.id, lang === 'bn' ? ban.title : ban.titleEn)}
                        className="p-1.5 px-3 bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
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

          {/* TAB 4: MANAGE BILLERS */}
          {activeSubTab === 'billers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">
                  UTILITY BILL PROVIDERS
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBillerId(null);
                    setBillerForm({
                      name: '',
                      nameBn: '',
                      category: 'Electricity',
                      categoryBn: 'বিদ্যুৎ',
                      logoColor: 'bg-blue-600',
                      imageUrl: ''
                    });
                    setShowBillerForm(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-md shadow-blue-500/10 cursor-pointer active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>{lang === 'bn' ? 'নতুন বিলার যুক্ত করুন' : 'Add Biller'}</span>
                </button>
              </div>

              {/* Add/Edit Biller Inline Form */}
              {showBillerForm && (
                <form onSubmit={handleSaveBiller} className="p-5 bg-white border-2 border-blue-100 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-slate-900 font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                      <CreditCard className="h-4.5 w-4.5 text-blue-600" />
                      <span>{editingBillerId ? (lang === 'bn' ? 'বিলার এডিট করুন' : 'Edit Biller') : (lang === 'bn' ? 'নতুন বিলার যুক্ত করুন' : 'Add Utility Biller')}</span>
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowBillerForm(false)}
                      className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Provider Name (EN)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. DESCO (Electricity)"
                        value={billerForm.name}
                        onChange={(e) => setBillerForm({...billerForm, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Provider Name (বাংলা)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="ডেসকো (বিদ্যুৎ)"
                        value={billerForm.nameBn}
                        onChange={(e) => setBillerForm({...billerForm, nameBn: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Category</label>
                      <select
                        value={billerForm.category}
                        onChange={(e) => setBillerCategory(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Electricity">Electricity (বিদ্যুৎ)</option>
                        <option value="Water">Water (পানি)</option>
                        <option value="Gas">Gas (গ্যাস)</option>
                        <option value="Internet">Internet (ইন্টারনেট)</option>
                        <option value="Education">Education (শিক্ষা)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Logo Background Color</label>
                      <select
                        value={billerForm.logoColor}
                        onChange={(e) => setBillerForm({...billerForm, logoColor: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 cursor-pointer text-xs"
                      >
                        <option value="bg-green-600">Green (DESCO)</option>
                        <option value="bg-emerald-600">Emerald (DPDC)</option>
                        <option value="bg-blue-600">Blue (WASA)</option>
                        <option value="bg-amber-600">Amber (Titas)</option>
                        <option value="bg-purple-600">Purple (Amber IT)</option>
                        <option value="bg-indigo-600">Indigo (DU)</option>
                        <option value="bg-rose-600">Rose Red</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase font-mono">Custom Biller Logo/Image URL (বিলার লোগো বা ইমেজ লিংক - ঐচ্ছিক / Optional)</label>
                    <input 
                      type="url" 
                      placeholder="e.g. https://domain.com/biller-logo.png (বিলার ছবি বা লোগো দেখানোর জন্য লিংক)"
                      value={billerForm.imageUrl || ''}
                      onChange={(e) => setBillerForm({...billerForm, imageUrl: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 font-mono text-emerald-600 placeholder-slate-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBillerForm(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {loading ? (lang === 'bn' ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Biller')}
                    </button>
                  </div>
                </form>
              )}

              {/* Billers listing */}
              <div className="space-y-3">
                {billers.map((biller) => (
                  <div key={biller.id} className="bg-white border border-slate-150 p-4 rounded-3xl flex items-center justify-between group">
                    <div className="flex items-center gap-3.5">
                      {biller.imageUrl ? (
                        <div className="h-11 w-11 rounded-2xl overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                          <img 
                            src={biller.imageUrl} 
                            alt="biller logo" 
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`h-11 w-11 rounded-2xl ${biller.logoColor || 'bg-slate-500'} text-white font-bold flex items-center justify-center shadow-sm`}>
                          {biller.name ? biller.name[0] : 'B'}
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <span className="text-[8.5px] font-black tracking-widest text-slate-400 uppercase">
                          {lang === 'bn' ? biller.categoryBn : biller.category}
                        </span>
                        <h4 className="text-xs text-slate-900 font-extrabold">
                          {lang === 'bn' ? biller.nameBn : biller.name}
                        </h4>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleEditBiller(biller)}
                        className="p-1 px-3 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3 shrink-0" />
                        <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBiller(biller.id, lang === 'bn' ? biller.nameBn : biller.name)}
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

      {/* CUSTOM CONFIRMATION DELETE DIALOG POPUP */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div 
            onClick={() => setDeleteConfirm(null)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
          />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 border border-slate-100 flex flex-col space-y-4 relative z-50 animate-scale-up text-slate-800">
            <div className="flex items-center gap-2.5 text-rose-600 pb-1 border-b border-slate-100">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h3 className="text-slate-950 font-black text-sm tracking-tight">
                {lang === 'bn' ? 'মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Deletion'}
              </h3>
            </div>

            <div className="space-y-2 py-1">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {lang === 'bn' 
                  ? `আপনি কি নিশ্চিতভাবে এই ${deleteConfirm.type === 'offer' ? 'অফারটি' : deleteConfirm.type === 'banner' ? 'ব্যানারটি' : 'বিলারটি'} মুছে ফেলতে চান?` 
                  : `Are you sure you want to permanently delete this ${deleteConfirm.type}?`}
              </p>
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3 text-rose-700 font-extrabold text-[12.5px] leading-snug">
                {deleteConfirm.title}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer text-center"
              >
                {lang === 'bn' ? 'বাতিল করুন' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/10 transition-all active:scale-98 cursor-pointer text-center"
              >
                {lang === 'bn' ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );

  if (isStandalone) {
    return adminPanelBody;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
      />
      {adminPanelBody}
    </div>
  );
}
