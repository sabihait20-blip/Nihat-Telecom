import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Check, AlertTriangle, Plus, Trash2, Edit2, 
  Smartphone, CreditCard, Layers, Sparkles, RefreshCw, AlertCircle, FileText, Gift, Send,
  LogOut, User, Settings, Copy
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
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'offers' | 'banners' | 'billers' | 'users' | 'settings'>('requests');
  const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);

  const handleCopyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFieldId(fieldId);
    setTimeout(() => {
      setCopiedFieldId(null);
    }, 2000);
  };

  // Dynamic App Settings State
  const [settingsForm, setSettingsForm] = useState({
    bkashNumber: '01970250988',
    nagadNumber: '01970250988',
    rocketNumber: '019702509883',
    helplineNumber: '01970250988',
    whatsappUrl: 'https://wa.me/8801970250988',
    minAddFund: 100,
    maxAddFund: 25000,
    globalNoticeEn: 'Airtel packages are currently in maintenance. Please purchase other packages!',
    globalNoticeBn: 'এয়ারটেল প্যাকেজগুলোর রক্ষণাবেক্ষনের কাজ চলছে। অন্য প্যাকেজ ব্যবহার করুন!',
    showNotice: true,
  });

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'app_config');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettingsForm({
          bkashNumber: data.bkashNumber || '01970250988',
          nagadNumber: data.nagadNumber || '01970250988',
          rocketNumber: data.rocketNumber || '019702509883',
          helplineNumber: data.helplineNumber || '01970250988',
          whatsappUrl: data.whatsappUrl || 'https://wa.me/8801970250988',
          minAddFund: typeof data.minAddFund === 'number' ? data.minAddFund : 100,
          maxAddFund: typeof data.maxAddFund === 'number' ? data.maxAddFund : 25000,
          globalNoticeEn: data.globalNoticeEn || '',
          globalNoticeBn: data.globalNoticeBn || '',
          showNotice: typeof data.showNotice === 'boolean' ? data.showNotice : true,
        });
      }
    }, (error) => {
      console.error("Error loading settings from DB: ", error);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'app_config');
      await setDoc(docRef, settingsForm);
      alert(lang === 'bn' ? 'সেটিংস সফলভাবে সেভ করা হয়েছে!' : 'System settings successfully saved!');
    } catch (err: any) {
      console.error("Error saving settings: ", err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Users Management State Helpers
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedUserBalance, setSelectedUserBalance] = useState<number | null>(null);
  const [selectedUserHistory, setSelectedUserHistory] = useState<Transaction[]>([]);
  const [loadingUserHistory, setLoadingUserHistory] = useState(false);
  const [userBalanceAdjustValue, setUserBalanceAdjustValue] = useState('');
  const [userBalanceAdjustType, setUserBalanceAdjustType] = useState<'increment' | 'decrement' | 'set'>('increment');
  const [userBalanceAdjustReason, setUserBalanceAdjustReason] = useState('');
  const [userBalanceAdjustReasonBn, setUserBalanceAdjustReasonBn] = useState('');

  // Custom single-user notification state
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [customNotifTitle, setCustomNotifTitle] = useState('');
  const [customNotifTitleBn, setCustomNotifTitleBn] = useState('');
  const [customNotifDesc, setCustomNotifDesc] = useState('');
  const [customNotifDescBn, setCustomNotifDescBn] = useState('');
  
  // Rejection modal state
  const [rejectingTx, setRejectingTx] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Added Add/Edit User states
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    displayName: '',
    phone: '',
    email: '',
    balance: 0
  });

  // New States for Advanced Search & Filters
  const [offerSearchQuery, setOfferSearchQuery] = useState('');
  const [offerOperatorFilter, setOfferOperatorFilter] = useState<string>('All');
  const [offerCategoryFilter, setOfferCategoryFilter] = useState<string>('All');

  const [billerSearchQuery, setBillerSearchQuery] = useState('');
  const [billerCategoryFilter, setBillerCategoryFilter] = useState<string>('All');

  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('All');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('All');
  
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

  // 5. Listen for registered_users list
  useEffect(() => {
    const q = collection(db, 'registered_users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id });
      });
      setRegisteredUsers(list);
    }, (error) => {
      console.error("Error loading registered users list: ", error);
    });

    return () => unsubscribe();
  }, []);

  // 6. Listen for selected user balance and history on demand
  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserBalance(null);
      setSelectedUserHistory([]);
      return;
    }

    setLoadingUserHistory(true);

    const balanceRef = doc(db, 'users', selectedUser.uid, 'wallet', 'balance_doc');
    const unsubBalance = onSnapshot(balanceRef, (docSnap) => {
      if (docSnap.exists()) {
        setSelectedUserBalance(docSnap.data().balance);
      } else {
        setSelectedUserBalance(0);
      }
    });

    const historyRef = collection(db, 'users', selectedUser.uid, 'transactions');
    const q = query(historyRef, orderBy('date', 'desc'));
    const unsubHistory = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id } as Transaction);
      });
      setSelectedUserHistory(list);
      setLoadingUserHistory(false);
    }, (err) => {
      console.error("Error loading selected user history: ", err);
      setLoadingUserHistory(false);
    });

    return () => {
      unsubBalance();
      unsubHistory();
    };
  }, [selectedUser]);

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
      } else if (type === 'user') {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'registered_users', id));
        batch.delete(doc(db, 'users', id, 'wallet', 'balance_doc'));
        await batch.commit();
        if (selectedUser?.uid === id) {
          setSelectedUser(null);
        }
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

  const handleAdjustUserBalance = async () => {
    if (!selectedUser || selectedUserBalance === null) return;
    const amount = parseFloat(userBalanceAdjustValue);
    if (isNaN(amount) || amount <= 0) {
      alert(lang === 'bn' ? 'ভুল পরিমাণ! সঠিক অংক দিন।' : 'Please enter a valid positive amount.');
      return;
    }

    try {
      setActionError('');
      let newBalance = selectedUserBalance;
      let typeText = '';
      let typeTextBn = '';
      if (userBalanceAdjustType === 'increment') {
        newBalance += amount;
        typeText = 'Balance Added by Admin';
        typeTextBn = 'অ্যাডমিন কর্তৃক ব্যালেন্স যোগ করা হয়েছে';
      } else if (userBalanceAdjustType === 'decrement') {
        if (amount > selectedUserBalance) {
          alert(lang === 'bn' ? 'ব্যবহারকারীর পর্যাপ্ত ব্যালেন্স নেই!' : 'User has insufficient balance for deduction.');
          return;
        }
        newBalance -= amount;
        typeText = 'Balance Deducted by Admin';
        typeTextBn = 'অ্যাডমিন কর্তৃক ব্যালেন্স কেটে নেওয়া হয়েছে';
      } else {
        newBalance = amount;
        typeText = 'Balance Set by Admin';
        typeTextBn = 'অ্যাডমিন কর্তৃক ব্যালেন্স সেট করা হয়েছে';
      }

      const batch = writeBatch(db);

      // 1. Update wallet balance
      const balanceRef = doc(db, 'users', selectedUser.uid, 'wallet', 'balance_doc');
      batch.set(balanceRef, { balance: newBalance });

      // 2. Add custom transaction log to history list
      const txId = 'ADJ-' + Math.floor(100000 + Math.random() * 900000);
      const customTx = {
        id: txId,
        type: 'CashIn',
        amount: amount,
        txId: txId,
        date: new Date().toLocaleString(),
        status: 'Approved',
        targetNumber: selectedUser.phone || 'N/A',
        billerName: `${typeText} (${userBalanceAdjustReason || 'Support Fix'})`,
        billerNameBn: `${typeTextBn} (${userBalanceAdjustReasonBn || 'সাপোর্ট সমাধান'})`
      };
      const userTxRef = doc(db, 'users', selectedUser.uid, 'transactions', txId);
      batch.set(userTxRef, customTx);

      // 3. App notification payload
      const notifId = 'notif-' + Date.now();
      const notifPayload = {
        id: notifId,
        title: 'Wallet Balance Adjusted',
        titleBn: 'ওয়ালেট ব্যালেন্স সমন্বয় করা হয়েছে',
        desc: `Your wallet is updated (New: ৳${newBalance}). Memo: ${userBalanceAdjustReason || 'Support fix by administrator'}.`,
        descBn: `আপনার ওয়ালেট আপডেট করা হয়েছে (নতুন ব্যালেন্স: ৳${newBalance})। বিবরণ: ${userBalanceAdjustReasonBn || 'অ্যাডমিন সাপোর্ট কর্তৃক সমন্বয়'}।`,
        time: 'Just now',
        read: false
      };
      const notifRef = doc(db, 'users', selectedUser.uid, 'notifications', notifId);
      batch.set(notifRef, notifPayload);

      await batch.commit();

      // Clear input fields
      setUserBalanceAdjustValue('');
      setUserBalanceAdjustReason('');
      setUserBalanceAdjustReasonBn('');
      alert(lang === 'bn' ? 'ব্যালেন্স সফলভাবে সমন্বয় করা হয়েছে!' : 'Wallet balance successfully adjusted!');
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Error adjusting balance');
    }
  };

  const handleSendCustomNotification = async () => {
    if (!selectedUser) return;
    if (!customNotifTitle.trim() && !customNotifTitleBn.trim()) {
      alert(lang === 'bn' ? 'দয়া করে নোটিফিকেশন টাইটেল দিন!' : 'Please enter notification title!');
      return;
    }

    try {
      setIsSendingNotif(true);
      const notifId = 'notif-' + Date.now();
      const notifPayload = {
        id: notifId,
        title: customNotifTitle || customNotifTitleBn || 'Alert notification',
        titleBn: customNotifTitleBn || customNotifTitle || 'জরুরি সতর্কবার্তা',
        desc: customNotifDesc || 'Notification from administrative staff.',
        descBn: customNotifDescBn || 'অ্যাডমিনিস্ট্রেটিভ কাস্টমার সাপোর্ট থেকে নোটিফিকেশন।',
        time: 'Just now',
        read: false
      };
      await setDoc(doc(db, 'users', selectedUser.uid, 'notifications', notifId), notifPayload);

      setCustomNotifTitle('');
      setCustomNotifTitleBn('');
      setCustomNotifDesc('');
      setCustomNotifDescBn('');
      alert(lang === 'bn' ? 'নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!' : 'Notification successfully sent to user!');
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = editingUserId || `user-${Date.now()}`;
      const userRef = doc(db, 'registered_users', uid);
      const balanceRef = doc(db, 'users', uid, 'wallet', 'balance_doc');
      
      const batch = writeBatch(db);
      
      // Save/update registered_users profile doc
      batch.set(userRef, {
        uid,
        displayName: userForm.displayName,
        phone: userForm.phone,
        email: userForm.email || (userForm.phone ? `${userForm.phone}@nihat-telecom.com` : `${uid}@nihat-telecom.com`),
        lastActive: new Date().toISOString()
      }, { merge: true });
      
      // Save/update user balance doc
      batch.set(balanceRef, {
        balance: Number(userForm.balance) || 0
      }, { merge: true });
      
      await batch.commit();
      
      alert(lang === 'bn' ? 'ব্যবহারকারী তথ্য সফলভাবে সংরক্ষিত হয়েছে!' : 'User information saved successfully!');
      
      // Clear states
      setShowUserForm(false);
      setEditingUserId(null);
      setUserForm({
        displayName: '',
        phone: '',
        email: '',
        balance: 0
      });
    } catch (err: any) {
      console.error("Error saving user: ", err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (userObj: any) => {
    setEditingUserId(userObj.uid);
    
    let currentBal = 0;
    try {
      const balanceSnap = await getDoc(doc(db, 'users', userObj.uid, 'wallet', 'balance_doc'));
      if (balanceSnap.exists()) {
        currentBal = balanceSnap.data().balance || 0;
      }
    } catch (err) {
      console.error("Error getting balance for editing: ", err);
    }
    
    setUserForm({
      displayName: userObj.displayName || '',
      phone: userObj.phone || '',
      email: userObj.email || '',
      balance: currentBal
    });
    setShowUserForm(true);
  };

  const handleDeleteUser = (uid: string, name: string) => {
    setDeleteConfirm({ id: uid, type: 'user', title: name });
  };

  // Localized texts
  const labels = {
    title: lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল পোর্টাল' : 'Admin Operations Command',
    requests: lang === 'bn' ? 'পেন্ডিং রিকুয়েস্ট' : 'Pending Requests',
    offers: lang === 'bn' ? 'মোবাইল অফার প্যাক' : 'Manage Packs',
    banners: lang === 'bn' ? 'প্রোমো ব্যানার স্লাইড' : 'Promo Banners',
    billers: lang === 'bn' ? 'ইউটিলিটি বিলার' : 'Manage Billers',
    users: lang === 'bn' ? 'ইউজার ম্যানেজমেন্ট' : 'Users Management',
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
          <button
            onClick={() => {
              setActiveSubTab('users');
              setSelectedUser(null);
            }}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'users' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-transparent' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {labels.users} ({registeredUsers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'settings' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-transparent' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'সিস্টেম সেটিংস' : 'System Settings'}</span>
          </button>
        </div>

        {/* Scrollable Workspace panel viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 relative z-10 bg-slate-900/30">
          
          {/* Dynamic math counters for net system audit */}
          {(() => {
            const totalApprovedVolume = pendingRequests
              .filter(r => r.status === 'Success')
              .reduce((acc, r) => acc + (parseFloat(r.amount + '') || 0), 0);

            const totalUserBalance = registeredUsers
              .reduce((acc, u) => acc + (parseFloat(u.balance + '') || 0), 0);

            const totalSuccessfulCashIns = pendingRequests
              .filter(r => r.status === 'Success' && r.type === 'CashIn')
              .reduce((acc, r) => acc + (parseFloat(r.amount + '') || 0), 0);

            const totalSuccessfulDebits = pendingRequests
              .filter(r => r.status === 'Success' && (r.type === 'Recharge' || r.type === 'Bill'))
              .reduce((acc, r) => acc + (parseFloat(r.amount + '') || 0), 0);

            return (
              <>
                {/* Dynamic Grid System Counters Section */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                  {/* Counter 1: Pending */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-md border border-amber-500/15 p-4 rounded-3xl flex items-center justify-between text-slate-100 group shadow-md">
                    <div>
                      <span className="text-[9px] font-black tracking-widest text-amber-400 uppercase">
                        {lang === 'bn' ? 'অপেক্ষমান লেনদেন' : 'Pending Tasks'}
                      </span>
                      <div className="text-xl font-black text-white mt-1 font-mono flex items-baseline gap-1">
                        <span>{pendingRequests.filter(r => r.status === 'Pending').length}</span>
                        <span className="text-[9px] font-semibold text-slate-400 capitalize">{lang === 'bn' ? 'টি' : 'Pnd'}</span>
                      </div>
                    </div>
                    <div className={`p-2 bg-amber-500/15 border border-amber-500/25 rounded-2xl text-amber-400 shrink-0 ${pendingRequests.filter(r => r.status === 'Pending').length > 0 ? "animate-bounce" : ""}`}>
                      <RefreshCw className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Counter 2: Users */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/5 backdrop-blur-md border border-blue-500/15 p-4 rounded-3xl flex items-center justify-between text-slate-100 group shadow-md">
                    <div>
                      <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase">
                        {lang === 'bn' ? 'নিবন্ধিত গ্রাহক' : 'Total Clients'}
                      </span>
                      <div className="text-xl font-black text-white mt-1 font-mono flex items-baseline gap-1">
                        <span>{registeredUsers.length}</span>
                        <span className="text-[9px] font-semibold text-slate-400 capitalize">{lang === 'bn' ? 'জন' : 'Users'}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-blue-500/15 border border-blue-500/25 rounded-2xl text-blue-400 shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Counter 3: Offers */}
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-md border border-emerald-500/15 p-4 rounded-3xl flex items-center justify-between text-slate-100 group shadow-md">
                    <div>
                      <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">
                        {lang === 'bn' ? 'সক্রিয় অফার প্যাক' : 'Active Packages'}
                      </span>
                      <div className="text-xl font-black text-white mt-1 font-mono flex items-baseline gap-1">
                        <span>{offers.length}</span>
                        <span className="text-[9px] font-semibold text-slate-400 capitalize">{lang === 'bn' ? 'টি' : 'Packs'}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl text-emerald-400 shrink-0">
                      <Gift className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Counter 4: Billers */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 backdrop-blur-md border border-purple-500/15 p-4 rounded-3xl flex items-center justify-between text-slate-100 group shadow-md">
                    <div>
                      <span className="text-[9px] font-black tracking-widest text-purple-400 uppercase">
                        {lang === 'bn' ? 'ইউটিলিটি বিলার্স' : 'System Billers'}
                      </span>
                      <div className="text-xl font-black text-white mt-1 font-mono flex items-baseline gap-1">
                        <span>{billers.length}</span>
                        <span className="text-[9px] font-semibold text-slate-400 capitalize">{lang === 'bn' ? 'টি' : 'Billers'}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-purple-500/15 border border-purple-500/25 rounded-2xl text-purple-400 shrink-0 font-bold">
                      <CreditCard className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Real-Time Platform Business Audit & Reserves Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-2.5">
                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 rounded-2xl flex items-center justify-between text-slate-100">
                    <div>
                      <span className="text-[8px] font-black tracking-wider text-emerald-400 uppercase opacity-90 block">
                        {lang === 'bn' ? 'মোট ডিপোজিট ভলিউম' : 'Net Deposit Volume'}
                      </span>
                      <span className="text-xs font-black text-white font-mono mt-0.5 block leading-none">
                        ৳{totalSuccessfulCashIns.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-1 py-0.5 rounded tracking-tighter uppercase font-mono">
                      IN
                    </span>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 rounded-2xl flex items-center justify-between text-slate-100">
                    <div>
                      <span className="text-[8px] font-black tracking-wider text-rose-400 uppercase opacity-90 block">
                        {lang === 'bn' ? 'মোট পরিশোধিত ব্যালেন্স' : 'Disbursed Out'}
                      </span>
                      <span className="text-xs font-black text-white font-mono mt-0.5 block leading-none">
                        ৳{totalSuccessfulDebits.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/10 px-1 py-0.5 rounded tracking-tighter uppercase font-mono">
                      OUT
                    </span>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 rounded-2xl flex items-center justify-between text-slate-100">
                    <div>
                      <span className="text-[8px] font-black tracking-wider text-blue-400 uppercase opacity-90 block">
                        {lang === 'bn' ? 'মোট ট্রানজেকশন ভলিউম' : 'Approved Volume'}
                      </span>
                      <span className="text-xs font-black text-white font-mono mt-0.5 block leading-none">
                        ৳{totalApprovedVolume.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/10 px-1 py-0.5 rounded tracking-tighter uppercase font-mono">
                      TXS
                    </span>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 rounded-2xl flex items-center justify-between text-slate-100">
                    <div>
                      <span className="text-[8px] font-black tracking-wider text-violet-400 uppercase opacity-90 block">
                        {lang === 'bn' ? 'গ্রাহকদের মোট ফান্ড' : 'Customer Credit'}
                      </span>
                      <span className="text-xs font-black text-white font-mono mt-0.5 block leading-none">
                        ৳{totalUserBalance.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/10 px-1 py-0.5 rounded tracking-tighter uppercase font-mono">
                      HELD
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
          
          {actionError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* TAB 1: PENDING USER REQUESTS */}
          {activeSubTab === 'requests' && (() => {
            const filteredRequests = pendingRequests.filter((req) => {
              const queryLower = requestSearchQuery.toLowerCase().trim();
              const matchesSearch = !queryLower || 
                (req.id || '').toLowerCase().includes(queryLower) ||
                (req.userName || '').toLowerCase().includes(queryLower) ||
                (req.userEmail || '').toLowerCase().includes(queryLower) ||
                (req.targetNumber || '').toLowerCase().includes(queryLower) ||
                (req.txId || '').toLowerCase().includes(queryLower) ||
                (req.billerName || '').toLowerCase().includes(queryLower) ||
                (req.billerNameBn || '').toLowerCase().includes(queryLower);

              const matchesStatus = requestStatusFilter === 'All' || req.status === requestStatusFilter;
              const matchesType = requestTypeFilter === 'All' || req.type === requestTypeFilter;

              return matchesSearch && matchesStatus && matchesType;
            });

            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">
                    ACTIVE TRANSACTIONS POOL
                  </span>
                  <span className="text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors">
                    {lang === 'bn' ? 'রিয়েল-টাইমে আপডেট হচ্ছে' : 'Listening Live via snapshots'}
                  </span>
                </div>

                {/* Advanced Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-950/30 p-3 rounded-2xl border border-white/5">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={lang === 'bn' ? 'নাম্বার, TrxID বা ইউজার...' : 'Number, TxID, or User...'}
                      value={requestSearchQuery}
                      onChange={(e) => setRequestSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 text-white placeholder-slate-500 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-blue-500 transition-all font-mono font-bold"
                    />
                    {requestSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRequestSearchQuery('')}
                        className="absolute right-2.5 top-2 text-slate-500 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-slate-300 rounded-xl py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 cursor-pointer font-extrabold"
                  >
                    <option value="All">{lang === 'bn' ? 'সকল স্ট্যাটাস (All)' : 'All Statuses'}</option>
                    <option value="Pending">{lang === 'bn' ? '⏳ অপেক্ষমান (Pending)' : '⏳ Pending'}</option>
                    <option value="Success">{lang === 'bn' ? '✅ সফল (Approved)' : '✅ Approved'}</option>
                    <option value="Failed">{lang === 'bn' ? '❌ বাতিল (Rejected)' : '❌ Rejected'}</option>
                  </select>

                  <select
                    value={requestTypeFilter}
                    onChange={(e) => setRequestTypeFilter(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-slate-300 rounded-xl py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 cursor-pointer font-extrabold"
                  >
                    <option value="All">{lang === 'bn' ? 'সকল প্রকার লেনদেন' : 'All transaction types'}</option>
                    <option value="CashIn">{lang === 'bn' ? '📥 ডিপোজিট (Add Fund)' : '📥 Add Fund (CashIn)'}</option>
                    <option value="Recharge">{lang === 'bn' ? '📱 মোবাইল রিচার্জ' : '📱 Mobile Recharge'}</option>
                    <option value="Bill">{lang === 'bn' ? '⚡ ইউটিলিটি বিল' : '⚡ Utility Bill'}</option>
                  </select>
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-2">
                    <FileText className="h-10 w-10 text-slate-600" />
                    <h4 className="text-white font-bold text-xs">
                      {lang === 'bn' ? 'কোনো মেলানো লেনদেন নেই' : 'No matching transactions'}
                    </h4>
                    <p className="text-slate-400 text-[10.5px] max-w-xs leading-relaxed font-semibold">
                      {lang === 'bn' ? 'আপনার সার্চ কুয়েরি বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।' : 'Change filter queries or reset toolbars to see transaction rows.'}
                    </p>
                    {(requestSearchQuery || requestStatusFilter !== 'All' || requestTypeFilter !== 'All') && (
                      <button
                        type="button"
                        onClick={() => {
                          setRequestSearchQuery('');
                          setRequestStatusFilter('All');
                          setRequestTypeFilter('All');
                        }}
                        className="mt-1 px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-blue-400 font-extrabold hover:bg-white/10 cursor-pointer"
                      >
                        {lang === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Clear Filters'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRequests.map((req) => {
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
                                
                                <div className="text-xs text-slate-300 font-medium mt-1 space-y-1">
                                  {req.type === 'CashIn' && (
                                    <>
                                      <p className="flex items-center gap-1.5 flex-wrap">
                                        <span>{lang === 'bn' ? `মোবাইল ব্যাংকিং মাধ্যম: ${req.targetNumber}` : `Depository Channel: ${req.targetNumber}`}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyToClipboard(req.targetNumber || '', req.id + '-targetNumber')}
                                          className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[9px] font-bold"
                                          title={lang === 'bn' ? 'নম্বর কপি করুন' : 'Copy Number'}
                                        >
                                          {copiedFieldId === req.id + '-targetNumber' ? (
                                            <span className="text-emerald-400">{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                                          ) : (
                                            <Copy className="h-2.5 w-2.5" />
                                          )}
                                        </button>
                                      </p>
                                      <p className="text-blue-400 text-xs font-bold leading-none font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                                        <span>TrxID: {req.txId}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyToClipboard(req.txId || '', req.id + '-txId')}
                                          className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[9px] font-bold"
                                          title={lang === 'bn' ? 'ট্রানজেকশন আইডি কপি করুন' : 'Copy Transaction ID'}
                                        >
                                          {copiedFieldId === req.id + '-txId' ? (
                                            <span className="text-emerald-400">{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                                          ) : (
                                            <Copy className="h-2.5 w-2.5" />
                                          )}
                                        </button>
                                      </p>
                                    </>
                                  )}
                                  {req.type === 'Recharge' && (
                                    <p className="flex items-center gap-1.5 flex-wrap">
                                      <span>{lang === 'bn' ? `অপারেটর: ${req.operator} | রিচার্জ নম্বর: ${req.targetNumber}` : `Operator: ${req.operator} | Number: ${req.targetNumber}`}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyToClipboard(req.targetNumber || '', req.id + '-targetNumber')}
                                        className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[9px] font-bold"
                                        title={lang === 'bn' ? 'রিচার্জ নম্বর কপি করুন' : 'Copy Recharge Number'}
                                      >
                                        {copiedFieldId === req.id + '-targetNumber' ? (
                                          <span className="text-emerald-400">{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                                        ) : (
                                          <Copy className="h-2.5 w-2.5" />
                                        )}
                                      </button>
                                    </p>
                                  )}
                                  {req.type === 'Bill' && (
                                    <p className="flex items-center gap-1.5 flex-wrap">
                                      <span>{lang === 'bn' ? `বিল দাতা: ${req.billerNameBn} | নম্বর/হিসাব: ${req.targetNumber}` : `Biller: ${req.billerName} | A/C: ${req.targetNumber}`}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyToClipboard(req.targetNumber || '', req.id + '-targetNumber')}
                                        className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[9px] font-bold"
                                        title={lang === 'bn' ? 'বিল নম্বর কপি করুন' : 'Copy Bill Number'}
                                      >
                                        {copiedFieldId === req.id + '-targetNumber' ? (
                                          <span className="text-emerald-400">{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                                        ) : (
                                          <Copy className="h-2.5 w-2.5" />
                                        )}
                                      </button>
                                    </p>
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
            );
          })()}

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

              {/* Offers Search & Filters Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-950/30 p-3 rounded-2xl border border-white/5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'অফার টাইটেল, ভলিউম বা বিবরণ...' : 'Offer title, volume, desc...'}
                    value={offerSearchQuery}
                    onChange={(e) => setOfferSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white placeholder-slate-500 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-blue-500 transition-all font-bold"
                  />
                  {offerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOfferSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <select
                  value={offerOperatorFilter}
                  onChange={(e) => setOfferOperatorFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-slate-300 rounded-xl py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 cursor-pointer font-extrabold"
                >
                  <option value="All">{lang === 'bn' ? 'সকল অপারেটর' : 'All Operators'}</option>
                  <option value="GP">Grameenphone (GP)</option>
                  <option value="Robi">Robi</option>
                  <option value="Airtel">Airtel</option>
                  <option value="Banglalink">Banglalink (BL)</option>
                  <option value="Teletalk">Teletalk</option>
                </select>

                <select
                  value={offerCategoryFilter}
                  onChange={(e) => setOfferCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-slate-300 rounded-xl py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 cursor-pointer font-extrabold"
                >
                  <option value="All">{lang === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
                  <option value="internet">{lang === 'bn' ? 'ইন্টারনেট (Internet)' : 'Internet Pack'}</option>
                  <option value="minutes">{lang === 'bn' ? 'টকটাইম (Minutes)' : 'Minutes Pack'}</option>
                  <option value="combo">{lang === 'bn' ? 'কম্বো (Combo)' : 'Combo Pack'}</option>
                </select>
              </div>

              {/* Offers list */}
              {(() => {
                const filteredOffers = offers.filter((pkg) => {
                  const queryLower = offerSearchQuery.toLowerCase().trim();
                  const matchesSearch = !queryLower ||
                    (pkg.title || '').toLowerCase().includes(queryLower) ||
                    (pkg.titleBn || '').toLowerCase().includes(queryLower) ||
                    (pkg.volume || '').toLowerCase().includes(queryLower) ||
                    (pkg.volumeBn || '').toLowerCase().includes(queryLower) ||
                    (pkg.description || '').toLowerCase().includes(queryLower) ||
                    (pkg.descriptionBn || '').toLowerCase().includes(queryLower);

                  const matchesOperator = offerOperatorFilter === 'All' || pkg.operator === offerOperatorFilter;
                  const matchesCategory = offerCategoryFilter === 'All' || pkg.category === offerCategoryFilter;

                  return matchesSearch && matchesOperator && matchesCategory;
                });

                if (filteredOffers.length === 0) {
                  return (
                    <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-2">
                      <Gift className="h-10 w-10 text-slate-600" />
                      <h4 className="text-white font-bold text-xs">
                        {lang === 'bn' ? 'কোনো মেলানো অফার পাওয়া যায়নি' : 'No matching packages found'}
                      </h4>
                      <p className="text-slate-400 text-[10.5px] max-w-xs leading-relaxed font-semibold">
                        {lang === 'bn' ? 'সার্চ কুয়েরি বা অপারেটর ফিল্টারিং পরিবর্তন করে পুনরায় চেষ্টা করুন।' : 'Modify your filters or search keywords to view cellular plans.'}
                      </p>
                      {(offerSearchQuery || offerOperatorFilter !== 'All' || offerCategoryFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setOfferSearchQuery('');
                            setOfferOperatorFilter('All');
                            setOfferCategoryFilter('All');
                          }}
                          className="mt-1 px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-blue-400 font-extrabold hover:bg-white/10 cursor-pointer"
                        >
                          {lang === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Clear Filters'}
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredOffers.map((pkg) => (
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
                );
              })()}
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
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 cursor-pointer text-[10.5px]"
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
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none text-white focus:border-blue-500 placeholder-slate-700 font-mono"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((ban) => (
                  <div key={ban.id} className="bg-slate-900/40 backdrop-blur-md border border-white/15 p-4 rounded-3xl flex flex-col justify-between gap-3.5 group hover:bg-slate-900/60 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-start gap-3.5">
                      {ban.imageUrl ? (
                        <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md relative group-hover:scale-105 transition-transform mt-0.5">
                          <img 
                            src={ban.imageUrl} 
                            alt="preview" 
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl shrink-0 bg-slate-950 border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">
                          {ban.operator}
                        </div>
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase">
                            {ban.operator} SLIDER
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">Prefill: ৳{ban.prefillAmount}</span>
                          {ban.imageUrl && (
                            <span className="text-[8.5px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/10 font-mono">
                              Image
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs text-white font-extrabold leading-tight truncate">
                          {lang === 'bn' ? ban.title : ban.titleEn}
                        </h4>
                        <p className="text-[10.5px] text-slate-400 leading-normal font-semibold line-clamp-2">
                          {lang === 'bn' ? ban.desc : ban.descEn}
                        </p>
                      </div>
                    </div>
 
                    <div className="flex gap-2 border-t border-white/5 pt-3.5 mt-1">
                      <button
                        onClick={() => handleEditBanner(ban)}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Edit2 className="h-3 w-3 shrink-0" />
                        <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(ban.id, lang === 'bn' ? ban.title : ban.titleEn)}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
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

              {/* Biller Search & Filters Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950/30 p-3 rounded-2xl border border-white/5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'বিলার নাম...' : 'Biller name...'}
                    value={billerSearchQuery}
                    onChange={(e) => setBillerSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white placeholder-slate-500 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-blue-500 transition-all font-bold"
                  />
                  {billerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBillerSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <select
                  value={billerCategoryFilter}
                  onChange={(e) => setBillerCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-slate-300 rounded-xl py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 cursor-pointer font-extrabold"
                >
                  <option value="All">{lang === 'bn' ? 'সকল বিল ক্যাটাগরি' : 'All Bill Categories'}</option>
                  <option value="Electricity">{lang === 'bn' ? 'বিদ্যুৎ (Electricity)' : 'Electricity'}</option>
                  <option value="Gas">{lang === 'bn' ? 'গ্যাস (Gas)' : 'Gas'}</option>
                  <option value="Water">{lang === 'bn' ? 'পানি (Water)' : 'Water'}</option>
                  <option value="Internet">{lang === 'bn' ? 'ইন্টারনেট (Internet)' : 'Internet'}</option>
                  <option value="TV">{lang === 'bn' ? 'টেলিভিশন (TV)' : 'TV / Cable'}</option>
                  <option value="Telephone">{lang === 'bn' ? 'টেলিফোন (Telephone)' : 'Telephone'}</option>
                  <option value="Other">{lang === 'bn' ? 'অন্যান্য (Other)' : 'Other'}</option>
                </select>
              </div>

              {/* Billers listing */}
              {(() => {
                const filteredBillers = billers.filter((biller) => {
                  const queryLower = billerSearchQuery.toLowerCase().trim();
                  const matchesSearch = !queryLower ||
                    (biller.name || '').toLowerCase().includes(queryLower) ||
                    (biller.nameBn || '').toLowerCase().includes(queryLower);

                  const matchesCategory = billerCategoryFilter === 'All' || biller.category === billerCategoryFilter;

                  return matchesSearch && matchesCategory;
                });

                if (filteredBillers.length === 0) {
                  return (
                    <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-2">
                      <CreditCard className="h-10 w-10 text-slate-600" />
                      <h4 className="text-white font-bold text-xs">
                        {lang === 'bn' ? 'কোনো মেলানো বিলার পাওয়া যায়নি' : 'No matching utility billers found'}
                      </h4>
                      <p className="text-slate-400 text-[10.5px] max-w-xs leading-relaxed font-semibold">
                        {lang === 'bn' ? 'সার্চ কুয়েরি বা ক্যাটাগরি ফিল্টারিং পরিবর্তন করে পুনরায় চেষ্টা করুন।' : 'Modify your filters or search keywords to view biller operations.'}
                      </p>
                      {(billerSearchQuery || billerCategoryFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setBillerSearchQuery('');
                            setBillerCategoryFilter('All');
                          }}
                          className="mt-1 px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-blue-400 font-extrabold hover:bg-white/10 cursor-pointer"
                        >
                          {lang === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Clear Filters'}
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredBillers.map((biller) => (
                      <div key={biller.id} className="bg-white border border-slate-150 p-4 rounded-3xl flex flex-col justify-between gap-3.5 shadow-xs group hover:shadow-md transition-shadow">
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
                            <div className={`h-11 w-11 rounded-2xl ${biller.logoColor || 'bg-slate-500'} text-white font-bold flex items-center justify-center shadow-xs shrink-0`}>
                              {biller.name ? biller.name[0] : 'B'}
                            </div>
                          )}
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <span className="text-[8.5px] font-black tracking-widest text-slate-400 uppercase truncate block">
                              {lang === 'bn' ? biller.categoryBn : biller.category}
                            </span>
                            <h4 className="text-xs text-slate-900 font-extrabold truncate">
                              {lang === 'bn' ? biller.nameBn : biller.name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex gap-1.5 border-t border-slate-100 pt-3 mt-1 shrink-0">
                          <button
                            onClick={() => handleEditBiller(biller)}
                            className="flex-1 py-1 px-3 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-[10px] font-black transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Edit2 className="h-3 w-3 shrink-0" />
                            <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteBiller(biller.id, lang === 'bn' ? biller.nameBn : biller.name)}
                            className="flex-1 py-1 px-3 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-[10px] font-black transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Trash2 className="h-3 w-3 shrink-0" />
                            <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: MANAGED USERS, BALANCES, AND HISTORY SUPPORT */}
          {activeSubTab === 'users' && (
            <div className="space-y-4 text-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 px-1">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-400 tracking-widest uppercase font-mono">
                    REGISTERED CLIENT REGISTRY
                  </span>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    {lang === 'bn' ? 'ব্যবহারকারীদের ব্যালেন্স হিস্ট্রি ও যেকোনো সমস্যা সমাধান পোর্টাল' : 'View customer balances, histories, correct states and resolve issue cases.'}
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto items-center shrink-0">
                  {/* Add New User button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUserId(null);
                      setUserForm({
                        displayName: '',
                        phone: '',
                        email: '',
                        balance: 0
                      });
                      setShowUserForm(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-colors flex items-center gap-1 shadow-md shadow-blue-500/10 cursor-pointer active:scale-95 shrink-0"
                  >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    <span>{lang === 'bn' ? 'নতুন ইউজার' : 'Add User'}</span>
                  </button>

                  {/* Simple client-side search bar */}
                  <div className="relative w-full md:w-64">
                    <input
                      type="text"
                      placeholder={lang === 'bn' ? 'নাম বা নম্বর দিয়ে খুঁজুন...' : 'Search by name or number...'}
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl py-1.5 px-3.5 text-xs font-semibold placeholder-slate-500 outline-none focus:border-blue-500 transition-all font-mono"
                    />
                    {searchUserQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchUserQuery('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Add/Edit User Inline Form Overlay Panel */}
              {showUserForm && (
                <form onSubmit={handleSaveUser} className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 text-slate-800 animate-slide-in">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-slate-950 font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                      <User className="h-4.5 w-4.5 text-blue-600" />
                      <span>{editingUserId ? (lang === 'bn' ? 'ইউজার তথ্য এডিট করুন' : 'Edit User Details') : (lang === 'bn' ? 'নতুন ইউজার রেজিস্টার করুন' : 'Register New User')}</span>
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Full Name (সম্পূর্ণ নাম)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Nihat Ahmed"
                        value={userForm.displayName}
                        onChange={(e) => setUserForm({...userForm, displayName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Mobile Number (মোবাইল নম্বর)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 01970250988"
                        value={userForm.phone}
                        onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Email Address (ঐচ্ছিক / Optional Email)</label>
                      <input 
                        type="email" 
                        placeholder="e.g. user@gmail.com"
                        value={userForm.email}
                        onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase">Initial Wallet Balance (৳)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={userForm.balance}
                        onChange={(e) => setUserForm({...userForm, balance: parseFloat(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {loading ? (lang === 'bn' ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save User')}
                    </button>
                  </div>
                </form>
              )}

              {/* Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Side: Users list */}
                <div className={`space-y-2.5 ${selectedUser ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                  <div className="bg-slate-950/30 border border-white/10 rounded-3xl p-3 max-h-[480px] overflow-y-auto">
                    {registeredUsers.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        {lang === 'bn' ? 'কোনো রেজিষ্ট্রেশনকৃত ইউজার পাওয়া যায়নি!' : 'No registered users found yet.'}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {registeredUsers
                          .filter((u) => {
                            const queryLower = searchUserQuery.toLowerCase().trim();
                            if (!queryLower) return true;
                            return (
                              (u.displayName || '').toLowerCase().includes(queryLower) ||
                              (u.email || '').toLowerCase().includes(queryLower) ||
                              (u.phone || '').toLowerCase().includes(queryLower) ||
                              (u.uid || '').toLowerCase().includes(queryLower)
                            );
                          })
                          .map((userObj) => {
                            const isSelected = selectedUser?.uid === userObj.uid;
                            return (
                              <button
                                key={userObj.uid}
                                type="button"
                                onClick={() => {
                                  setSelectedUser(userObj);
                                  // Clear input states when switching users
                                  setUserBalanceAdjustValue('');
                                  setUserBalanceAdjustReason('');
                                  setUserBalanceAdjustReasonBn('');
                                  setCustomNotifTitle('');
                                  setCustomNotifTitleBn('');
                                  setCustomNotifDesc('');
                                  setCustomNotifDescBn('');
                                }}
                                className={`w-full text-left p-3.5 rounded-2xl transition-all border flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-600/10'
                                    : 'bg-slate-950/20 hover:bg-slate-950/40 border-white/5 text-slate-300 hover:text-white'
                                }`}
                              >
                                <div className="space-y-1 pr-2 truncate">
                                  <h4 className="text-xs font-black truncate">
                                    {userObj.displayName}
                                  </h4>
                                  <p className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {userObj.phone ? `📱 ${userObj.phone}` : `✉️ ${userObj.email}`}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`text-[9px] font-bold block ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                                    {lang === 'bn' ? 'শেষ সক্রিয়' : 'Last Active'}
                                  </span>
                                  <span className={`text-[10px] font-semibold block font-mono ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                    {userObj.lastActive ? new Date(userObj.lastActive).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Selected User Panel Details (Balance History & Action Tools) */}
                {selectedUser ? (
                  <div className="lg:col-span-7 bg-slate-950/40 border border-white/10 rounded-3xl p-5 space-y-5">
                    {/* Header profile details info card */}
                    <div className="flex justify-between items-start border-b border-white/5 pb-4 text-slate-100">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/15 rounded px-1.5 py-0.5 uppercase font-mono">
                          {lang === 'bn' ? 'নির্বাচিত ইউজার প্রোফাইল' : 'Selected Customer Profile'}
                        </span>
                        <h3 className="text-sm font-extrabold text-white mt-2">
                          {selectedUser.displayName}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">
                          UID: <span className="text-slate-300">{selectedUser.uid}</span>
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 font-medium">
                          {lang === 'bn' ? 'মোবাইল/ইমেইল' : 'Contact'}: <span className="text-slate-300 font-mono">{selectedUser.phone || selectedUser.email}</span>
                        </p>

                        {/* Edit / Delete control buttons */}
                        <div className="flex gap-2.5 mt-3">
                          <button
                            type="button"
                            onClick={() => handleEditUser(selectedUser)}
                            className="p-1 px-2.5 bg-white/5 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-white/5 hover:border-blue-500/20 rounded-xl text-[10px] font-black cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>{lang === 'bn' ? 'প্রোফাইল এডিট' : 'Edit Profile'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(selectedUser.uid, selectedUser.displayName)}
                            className="p-1 px-2.5 bg-white/5 hover:bg-rose-600/20 text-slate-300 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 rounded-xl text-[10px] font-black cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{lang === 'bn' ? 'ইউজার ডিলেট' : 'Delete User'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Close display details button */}
                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="p-1 px-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        {lang === 'bn' ? 'বন্ধ করুন' : 'Clear'}
                      </button>
                    </div>

                    {/* Balance stats display */}
                    <div className="bg-gradient-to-br from-blue-700/20 via-blue-800/10 to-transparent border border-blue-500/15 rounded-3xl p-4 flex justify-between items-center text-slate-100">
                      <div>
                        <span className="text-[9.5px] font-extrabold tracking-widest text-blue-300 uppercase block">
                          {lang === 'bn' ? 'বর্তমান ওয়ালেট ব্যালেন্স' : 'Current Wallet Balance'}
                        </span>
                        <div className="text-white text-2xl font-black mt-1 font-mono">
                          ৳{selectedUserBalance !== null ? selectedUserBalance.toFixed(2) : '...'}
                        </div>
                      </div>
                      <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400 shrink-0">
                        <CreditCard className="h-6 w-6" />
                      </div>
                    </div>

                    {/* SUPPORT SYSTEM CONTROLLER ACTIONS: Adjust Balance and Send Alerts */}
                    <div className="space-y-4 border-t border-b border-white/5 py-4">
                      <h4 className="text-xs font-black text-white tracking-wide flex items-center gap-1.5 uppercase font-mono">
                        <Layers className="h-4 w-4 text-emerald-400" />
                        <span>{lang === 'bn' ? 'সমস্যা সমাধান কার্যক্রম' : 'Problem Resolution Actions'}</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Box 1: Adjust Wallet Balance Tool */}
                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                          <span className="text-[10px] font-black text-rose-300 block uppercase tracking-wider font-mono">
                            💰 {lang === 'bn' ? 'ব্যালেন্স সংশোধন করুন' : 'Adjust Funds / Balance'}
                          </span>
                          
                          <div className="flex gap-1 bg-slate-950/60 p-1 rounded-xl">
                            {(['increment', 'decrement', 'set'] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setUserBalanceAdjustType(type)}
                                className={`flex-1 py-1 rounded-lg text-[9px] font-extrabold capitalize cursor-pointer transition-colors ${
                                  userBalanceAdjustType === type
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {type === 'increment' ? (lang === 'bn' ? 'যোগ' : 'Add') : type === 'decrement' ? (lang === 'bn' ? 'কর্তন' : 'Deduct') : (lang === 'bn' ? 'সেট' : 'Set')}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <input
                              type="number"
                              required
                              placeholder={lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount in BDT'}
                              value={userBalanceAdjustValue}
                              onChange={(e) => setUserBalanceAdjustValue(e.target.value)}
                              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold outline-none focus:border-blue-500 font-mono"
                            />
                            <div className="grid grid-cols-1 gap-1.5">
                              <input
                                type="text"
                                placeholder="Adjustment Memo (English)"
                                value={userBalanceAdjustReason}
                                onChange={(e) => setUserBalanceAdjustReason(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-2 py-1 text-[10px] font-medium text-white outline-none focus:border-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="সংশোধনের বিবরণ (বাংলা)"
                                value={userBalanceAdjustReasonBn}
                                onChange={(e) => setUserBalanceAdjustReasonBn(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-2 py-1 text-[10px] font-medium text-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleAdjustUserBalance}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-colors shadow-md shadow-emerald-500/10 cursor-pointer active:scale-95"
                            >
                              {lang === 'bn' ? 'পরিবর্তন নিশ্চিত করুন' : 'Apply Adjustment'}
                            </button>
                          </div>
                        </div>

                        {/* Box 2: Send Direct Alert Notification */}
                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                          <span className="text-[10px] font-black text-amber-300 block uppercase tracking-wider font-mono">
                            🔔 {lang === 'bn' ? 'সরাসরি সতর্কতা বার্তা পাঠান' : 'Direct Notification Alert'}
                          </span>

                          <div className="space-y-1.5">
                            <div className="grid grid-cols-1 gap-1.5">
                              <input
                                type="text"
                                placeholder="Title (EN)"
                                value={customNotifTitle}
                                onChange={(e) => setCustomNotifTitle(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-2 py-1 text-[10.5px] font-bold text-white outline-none focus:border-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="টাইটেল (বাংলা)"
                                value={customNotifTitleBn}
                                onChange={(e) => setCustomNotifTitleBn(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-2 py-1 text-[10.5px] font-bold text-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                              <input
                                type="text"
                                placeholder="Message body (EN)"
                                value={customNotifDesc}
                                onChange={(e) => setCustomNotifDesc(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-2 py-1 text-[10px] font-medium text-white outline-none focus:border-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="বার্তা বিবরণ (বাংলা)"
                                value={customNotifDescBn}
                                onChange={(e) => setCustomNotifDescBn(e.target.value)}
                                className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-2 py-1 text-[10px] font-medium text-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSendCustomNotification}
                              disabled={isSendingNotif}
                              className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-700 text-slate-950 rounded-xl text-[10px] font-black transition-colors shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 text-center font-bold"
                            >
                              {isSendingNotif ? '...' : (lang === 'bn' ? 'সরাসরি নোটিফিকেশন পাঠান' : 'Send Alert Notif')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* USER TRANSACTION RECORD HISTORY LIST */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block font-mono">
                        📋 {lang === 'bn' ? 'ব্যবহারকারীর ব্যালেন্স লেনদেন ইতিহাস' : 'User Balance History Logs'}
                      </span>

                      <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1.5 scroller-hidden">
                        {loadingUserHistory ? (
                          <div className="text-center py-5 text-sm text-slate-400 font-bold">
                            {lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading history logs...'}
                          </div>
                        ) : selectedUserHistory.length === 0 ? (
                          <div className="text-center py-5 text-xs text-slate-500 border border-dashed border-white/5 rounded-2xl">
                            {lang === 'bn' ? 'এই গ্রাহকের কোনো ট্রানজেকশন রেকর্ড নেই।' : 'No transaction logs present for this account.'}
                          </div>
                        ) : (
                          selectedUserHistory.map((hTx) => {
                            const isApproved = hTx.status === 'Approved';
                            const isRejected = hTx.status === 'Rejected';
                            const isCashIn = hTx.type === 'CashIn';
                            return (
                              <div
                                key={hTx.id} 
                                className="bg-slate-950/30 border border-white/5 p-3 rounded-2xl flex justify-between items-center gap-2.5 text-slate-300"
                              >
                                <div className="space-y-1 truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[8px] font-black px-1 py-0.2 rounded uppercase shrink-0 font-mono ${
                                      isCashIn ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                                    }`}>
                                      {hTx.type || 'TX'}
                                    </span>
                                    <span className="text-[10.5px] font-bold text-white truncate">
                                      {lang === 'bn' ? (hTx.billerNameBn || hTx.billerName || 'মোবাইল রিচার্জ') : (hTx.billerName || 'Mobile Recharge')}
                                    </span>
                                  </div>
                                  <p className="text-[9.5px] font-mono text-slate-400 truncate">
                                    ID: <span className="text-slate-300 select-all font-semibold font-mono">{hTx.txId || 'N/A'}</span> • {hTx.date}
                                  </p>
                                </div>

                                <div className="text-right shrink-0 font-bold">
                                  <div className={`text-xs font-black font-mono ${isCashIn ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isCashIn ? '+' : '-'}৳{hTx.amount}
                                  </div>
                                  <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${
                                    isApproved
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : isRejected
                                      ? 'bg-rose-500/10 text-rose-400'
                                      : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {isApproved ? (lang === 'bn' ? 'সফল' : 'Approved') : isRejected ? (lang === 'bn' ? 'ব্যর্থ' : 'Rejected') : (lang === 'bn' ? 'অপেক্ষমান' : 'Pending')}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-7 bg-slate-950/20 border border-dashed border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
                    <div className="p-3.5 bg-white/5 rounded-full text-slate-400">
                      <User className="h-8 w-8 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-white">
                        {lang === 'bn' ? 'গ্রাহক ফাইল লোড করুন' : 'Choose a Customer'}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-[280px]">
                        {lang === 'bn' ? 'বাম পাশের তালিকা থেকে যেকোনো ব্যবহারকারী নির্বাচন করে তাদের ব্যালেন্স হিস্ট্রি দেখতে এবং সমাধান করতে পারবেন।' : 'Select a registered user from the left list to inspect their real-time state, wallet history and adjust status.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS MANAGEMENT */}
          {activeSubTab === 'settings' && (
            <div className="space-y-5 text-slate-100 animate-scale-up">
              <div className="px-1">
                <span className="text-[10px] font-extrabold text-blue-400 tracking-widest uppercase font-mono">
                  GLOBAL SYSTEM INITIALS & BANKING
                </span>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  {lang === 'bn' ? 'সরাসরি ওয়ালেট ও কাস্টমার কেয়ার হেল্পলাইন সেটিংস আপডেট করুন।' : 'Configure active payment phone numbers, transaction limits, and dynamic warning alert banners.'}
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-slate-950/40 border border-white/10 rounded-3xl p-6 space-y-6">
                
                {/* Section A: Active Mobile Banking Numbers */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-400 border-b border-white/5 pb-2 uppercase tracking-wider font-mono">
                    1. Active Deposit Numbers (Personal / Send Money)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        bKash Personal Number
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsForm.bkashNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bkashNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        Nagad Personal Number
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsForm.nagadNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, nagadNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        Rocket Personal Number
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsForm.rocketNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, rocketNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Financial Limit Parameters */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-400 border-b border-white/5 pb-2 uppercase tracking-wider font-mono">
                    2. Add Fund Transaction Limits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        Minimum Deposit Limit (৳)
                      </label>
                      <input
                        type="number"
                        required
                        value={settingsForm.minAddFund}
                        onChange={(e) => setSettingsForm({ ...settingsForm, minAddFund: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        Maximum Deposit Limit (৳)
                      </label>
                      <input
                        type="number"
                        required
                        value={settingsForm.maxAddFund}
                        onChange={(e) => setSettingsForm({ ...settingsForm, maxAddFund: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Support & Helps */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-400 border-b border-white/5 pb-2 uppercase tracking-wider font-mono">
                    3. Helpline Support Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        Voice Support (Phone Number)
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsForm.helplineNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, helplineNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        WhatsApp Link URL
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsForm.whatsappUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, whatsappUrl: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section D: Warning Announcement Marquee Ticker */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-400 border-b border-white/5 pb-2 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>4. Portal Notice Ticker Announcement</span>
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, showNotice: !settingsForm.showNotice })}
                      className={`px-3 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider border transition-all ${
                        settingsForm.showNotice 
                          ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' 
                          : 'bg-white/5 border-white/5 text-slate-500'
                      }`}
                    >
                      {settingsForm.showNotice ? 'Status: Visible' : 'Status: Disabled'}
                    </button>
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        English Ticker Message
                      </label>
                      <textarea
                        rows={2}
                        value={settingsForm.globalNoticeEn}
                        onChange={(e) => setSettingsForm({ ...settingsForm, globalNoticeEn: e.target.value })}
                        placeholder="Type alert warning or promotional text in English..."
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-medium outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        বাংলা বার্তা (Bengali Notice Message)
                      </label>
                      <textarea
                        rows={2}
                        value={settingsForm.globalNoticeBn}
                        onChange={(e) => setSettingsForm({ ...settingsForm, globalNoticeBn: e.target.value })}
                        placeholder="বাংলায় নোটিশ বার্তা লিখুন..."
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-medium outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-800 disabled:to-indigo-800 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                  >
                    {loading ? (lang === 'bn' ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving Changes...') : (lang === 'bn' ? 'সেটিংস আপডেট করুন' : 'Save System Settings')}
                  </button>
                </div>
              </form>
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
                  ? `আপনি কি নিশ্চিতভাবে এই ${deleteConfirm.type === 'offer' ? 'অফারটি' : deleteConfirm.type === 'banner' ? 'ব্যানারটি' : deleteConfirm.type === 'user' ? 'গ্রাহক প্রোফাইলটি' : 'বিলারটি'} মুছে ফেলতে চান?` 
                  : `Are you sure you want to permanently delete this ${deleteConfirm.type === 'user' ? 'customer profile' : deleteConfirm.type}?`}
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
