import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone, Wifi, Landmark, Eye, History, Heart,
  Bell, Check, Info, Sparkles, X, ChevronRight, HelpCircle, ArrowRight,
  Monitor, LogOut, Globe, Plus, Home, Package, User
} from 'lucide-react';

// Data types & assets
import { AppTab, Language, Operator, Transaction, FavoriteContact, RechargePackage, PromoBanner, BillProvider } from './types';
import { TRANSLATIONS } from './data/translations';
import {
  OPERATORS,
  POPULAR_PACKAGES,
  BILL_PROVIDERS,
} from './data/mockData';

// Firestore helpers
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';

// Subcomponents
import Header from './components/Header';
import Banners from './components/Banners';
import BottomNav from './components/BottomNav';
import FavoritesGrid from './components/FavoritesGrid';
import HistoryList from './components/HistoryList';
import InternetPacks from './components/InternetPacks';
import ProfilePanel from './components/ProfilePanel';
import RechargeModal from './components/RechargeModal';
import BillPayModal from './components/BillPayModal';
import AddFundModal from './components/AddFundModal';
import SecureLockModal from './components/SecureLockModal';
import AuthPanel from './components/AuthPanel';
import AdminPanel from './components/AdminPanel';

const ADMIN_EMAILS = [
  'musicnrs2020@gmail.com',
  'nurnobyr36@gmail.com',
  'sabihait20@gmail.com',
  'dhukabuzz420@gmail.com'
];

interface NotificationItem {
  id: string;
  title: string;
  titleBn: string;
  desc: string;
  descBn: string;
  time: string;
  read: boolean;
}

export default function App() {
  const [lang, setLang] = useState<Language>('bn');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [balance, setBalance] = useState<number>(0);

  // View mode preferences for desktop screens
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile-mock'>('desktop');
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Real-time transactional tracking arrays
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [favorites, setFavorites] = useState<FavoriteContact[]>([]);

  // Dynamic admin-controlled custom data states
  const [dbOffers, setDbOffers] = useState<RechargePackage[]>([]);
  const [dbBanners, setDbBanners] = useState<PromoBanner[]>([]);
  const [dbBillers, setDbBillers] = useState<BillProvider[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Modal triggers
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [prefilledOp, setPrefilledOp] = useState<Operator | null>(null);
  const [prefilledAmt, setPrefilledAmt] = useState<number | null>(null);

  const [isBillPayOpen, setIsBillPayOpen] = useState(false);
  const [isAddFundOpen, setIsAddFundOpen] = useState(false);

  // Notification states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore dynamic offers database snap observer
  useEffect(() => {
    const q = query(collection(db, 'offers'), orderBy('price', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          POPULAR_PACKAGES.forEach((pkg) => {
            const docRef = doc(db, 'offers', pkg.id);
            batch.set(docRef, pkg);
          });
          await batch.commit();
        } catch (err) {
          console.error("Error seeding popular packages to Firestore offers collection: ", err);
        }
      } else {
        const list: RechargePackage[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as RechargePackage);
        });
        setDbOffers(list);
      }
    }, (error) => {
      console.error("Error loading offers in App: ", error);
    });
    return () => unsubscribe();
  }, []);

  // Firestore dynamic banners database snap observer
  useEffect(() => {
    const q = collection(db, 'banners');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          const defaultCampaigns = [
            {
              id: 'promo-1',
              title: '১০% ইনস্ট্যান্ট ক্যাশব্যাক!',
              titleEn: '10% Instant Cashback!',
              desc: 'যেকোনো Teletalk রিচার্জে ১০% ক্যাশব্যাক বোনাস।',
              descEn: 'On any Teletalk mobile recharge transaction.',
              operator: 'Teletalk',
              prefillAmount: 100,
              gradient: 'from-emerald-500/10 via-emerald-600/5 to-transparent border-emerald-500/20',
            },
            {
              id: 'promo-2',
              title: 'সুপার ইন্টারনেট ডিল',
              titleEn: 'Super Internet Offer',
              desc: 'Robi ৫ জিবি প্যাক মাত্র ৪৯ টাকায় ৭ দিন মেয়াদ!',
              descEn: 'Robi 5 GB Internet pack for ৳49 with 7 days.',
              operator: 'Robi',
              prefillAmount: 49,
              gradient: 'from-orange-500/10 via-red-600/5 to-transparent border-orange-500/20',
            },
            {
              id: 'promo-3',
              title: 'জিপি গিফট অফার',
              titleEn: 'Grameenphone Gift offer',
              desc: 'GP ৩০ জিবি ৩০০ মিনিট কার্ড ক্রয়ে নিশ্চিত ক্যাশব্যাক।',
              descEn: 'Get free cashback upon purchasing GP 30GB pack.',
              operator: 'GP',
              prefillAmount: 499,
              gradient: 'from-blue-500/10 via-sky-400/5 to-transparent border-blue-500/20',
            }
          ];
          defaultCampaigns.forEach((promo) => {
            const docRef = doc(db, 'banners', promo.id);
            batch.set(docRef, promo);
          });
          await batch.commit();
        } catch (err) {
          console.error("Error seeding promos to Firestore banners collection: ", err);
        }
      } else {
        const list: PromoBanner[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as PromoBanner);
        });
        setDbBanners(list);
      }
    }, (error) => {
      console.error("Error loading banners in App: ", error);
    });
    return () => unsubscribe();
  }, []);

  // Firestore dynamic billers database snap observer
  useEffect(() => {
    const q = collection(db, 'billers');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          BILL_PROVIDERS.forEach((biller) => {
            const docRef = doc(db, 'billers', biller.id);
            batch.set(docRef, biller);
          });
          await batch.commit();
        } catch (err) {
          console.error("Error seeding default billers to Firestore billers collection: ", err);
        }
      } else {
        const list: BillProvider[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as BillProvider);
        });
        setDbBillers(list);
      }
    }, (error) => {
      console.error("Error loading billers in App: ", error);
    });
    return () => unsubscribe();
  }, []);

  // Firestore balance observer scoped to logged in user
  useEffect(() => {
    if (!currentUser) return;
    const balanceDocRef = doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc');
    const unsubscribe = onSnapshot(balanceDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.balance === 'number') {
          setBalance(data.balance);
        }
      } else {
        // Initialize balance in Firestore
        setDoc(balanceDocRef, { balance: 0 });
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Firestore transaction observer scoped to logged in user
  useEffect(() => {
    if (!currentUser) return;
    const txCollectionRef = collection(db, 'users', currentUser.uid, 'transactions');
    const q = query(txCollectionRef, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const txList: Transaction[] = [];
      querySnapshot.forEach((docSnap) => {
        txList.push(docSnap.data() as Transaction);
      });
      setTransactions(txList);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Firestore favorites observer scoped to logged in user
  useEffect(() => {
    if (!currentUser) return;
    const favCollectionRef = collection(db, 'users', currentUser.uid, 'favorites');
    const unsubscribe = onSnapshot(favCollectionRef, (querySnapshot) => {
      const favList: FavoriteContact[] = [];
      querySnapshot.forEach((docSnap) => {
        favList.push(docSnap.data() as FavoriteContact);
      });
      setFavorites(favList);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Firestore notification observer scoped to logged in user
  useEffect(() => {
    if (!currentUser) return;
    const notifCollectionRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(notifCollectionRef, orderBy('id', 'desc'));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      if (querySnapshot.empty) {
        try {
          const welcomeNotif = {
            id: 'notif-welcome',
            title: 'Welcome to Nihat Telecom',
            titleBn: 'নিহাত টেলিকমে স্বাগতম',
            desc: 'Your secure wallet and mobile recharge account is active and verified.',
            descBn: 'আপনার নিরাপদ ওয়ালেট এবং মোবাইল রিচার্জ অ্যাকাউন্টটি সফলভাবে সক্রিয় করা হয়েছে।',
            time: 'Just now',
            read: false,
          };
          await setDoc(doc(notifCollectionRef, welcomeNotif.id), welcomeNotif);
        } catch (err) {
          console.error("Error seeding welcome notification: ", err);
        }
      } else {
        const notifList: NotificationItem[] = [];
        querySnapshot.forEach((docSnap) => {
          notifList.push(docSnap.data() as NotificationItem);
        });
        setNotifications(notifList);
        const hasUnread = notifList.some(n => !n.read);
        setUnreadNotifications(hasUnread);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  const t = TRANSLATIONS[lang];

  // Language Toggle controller
  const handleLanguageToggle = () => {
    setLang((prev) => (prev === 'bn' ? 'en' : 'bn'));
  };

  // Profile restore balance helper
  const handleResetBalance = async () => {
    if (!currentUser) return;
    try {
      const balanceDocRef = doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc');
      await setDoc(balanceDocRef, { balance: 5000 });
    } catch (err) {
      console.error("Error resetting balance: ", err);
    }
  };

  // Notification panel manager
  const handleNotificationClick = async () => {
    setIsNotificationsOpen(true);
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        if (!notif.read) {
          const docRef = doc(db, 'users', currentUser.uid, 'notifications', notif.id);
          batch.update(docRef, { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Error updating notifications: ", err);
    }
  };

  // Quick favorites trigger mobile recharge
  const handleSelectFavorite = (number: string, operator: Operator) => {
    setPrefilledOp(operator);
    setPrefilledAmt(null);
    setIsRechargeOpen(true);
  };

  // Promo card clicks pre-fills and opens modal
  const handleSelectPromo = (operator: Operator, amount: number) => {
    setPrefilledOp(operator);
    setPrefilledAmt(amount);
    setIsRechargeOpen(true);
  };

  // Create a new favorite contact
  const handleAddContact = async (newContact: Omit<FavoriteContact, 'id'>) => {
    if (!currentUser) return;
    const freshId = `fav-${Date.now()}`;
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'favorites', freshId), { ...newContact, id: freshId });
    } catch (err) {
      console.error("Error adding contact: ", err);
    }
  };

  // Remove contact from favorite Operator list
  const handleRemoveContact = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'favorites', id));
    } catch (err) {
      console.error("Error removing contact: ", err);
    }
  };

  // Mobile Recharge transactional settlement callback
  const handleRechargeSuccess = async (amount: number, operator: Operator, number: string) => {
    if (!currentUser) return;
    
    // Check balance first
    if (balance < amount) {
      alert(lang === 'bn' ? 'দুঃখিত, আপনার ব্যালেন্স অপর্যাপ্ত!' : 'Insufficient wallet balance!');
      return;
    }

    const newTxId = `tx-${Date.now()}`;
    const txReferenceId = `FLX${Math.random().toString(36).substr(2, 11).toUpperCase()}`;
    
    const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    const userEmail = currentUser.email || 'user@test.com';

    const newTx: Transaction = {
      id: newTxId,
      type: 'Recharge',
      operator,
      targetNumber: number,
      amount,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      txId: txReferenceId,
      status: 'Pending',
      userId: currentUser.uid,
      userName,
      userEmail
    };

    const addedNotifId = `notif-${Date.now()}`;
    const addedNotif: NotificationItem = {
      id: addedNotifId,
      title: 'Recharge Submitted',
      titleBn: 'রিচার্জের অনুরোধ পাঠানো হয়েছে',
      desc: `৳${amount} recharge request to ${number} is awaiting admin approval.`,
      descBn: `আপনার ${number} নম্বরে ৳${amount} টাকা রিচার্জের অনুরোধ অ্যাডমিন অনুমোদনের অপেক্ষায় আছে।`,
      time: 'Just now',
      read: false,
    };

    try {
      const batch = writeBatch(db);
      
      // Save user specific transaction
      batch.set(doc(db, 'users', currentUser.uid, 'transactions', newTxId), newTx);
      
      // Save global admin requests queue
      batch.set(doc(db, 'admin_requests', newTxId), newTx);

      // Save user notification
      batch.set(doc(db, 'users', currentUser.uid, 'notifications', addedNotifId), addedNotif);
      
      // Dock balance immediately to prevent double spending
      const newBalanceVal = Math.max(balance - amount, 0);
      batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });

      await batch.commit();
    } catch (err) {
      console.error("Error recharging: ", err);
    }
  };

  // Utility Bill Payment transactional settlement callback
  const handleBillSuccess = async (amount: number, billerName: string, billerNameBn: string) => {
    if (!currentUser) return;

    if (balance < amount) {
      alert(lang === 'bn' ? 'দুঃখিত, আপনার ব্যালেন্স অপর্যাপ্ত!' : 'Insufficient wallet balance!');
      return;
    }

    const newTxId = `tx-${Date.now()}`;
    const txReferenceId = `FLX${Math.random().toString(36).substr(2, 11).toUpperCase()}`;

    const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    const userEmail = currentUser.email || 'user@test.com';

    const newTx: Transaction = {
      id: newTxId,
      type: 'Bill',
      amount,
      billerName,
      billerNameBn,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      txId: txReferenceId,
      status: 'Pending',
      userId: currentUser.uid,
      userEmail,
      userName
    };

    const addedNotifId = `notif-${Date.now()}`;
    const addedNotif: NotificationItem = {
      id: addedNotifId,
      title: 'Bill Request Filed',
      titleBn: 'বিল পেমেন্ট অনুরোধ পাঠানো হয়েছে',
      desc: `Your bill payment of ৳${amount} to ${billerName} is pending admin verification.`,
      descBn: `আপনার ${billerNameBn} বিলে ৳${amount} টাকা পরিশোধের অনুরোধ যাচাইয়ের অপেক্ষায় আছে।`,
      time: 'Just now',
      read: false,
    };

    try {
      const batch = writeBatch(db);
      
      batch.set(doc(db, 'users', currentUser.uid, 'transactions', newTxId), newTx);
      batch.set(doc(db, 'admin_requests', newTxId), newTx);
      batch.set(doc(db, 'users', currentUser.uid, 'notifications', addedNotifId), addedNotif);
      
      const newBalanceVal = Math.max(balance - amount, 0);
      batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });

      await batch.commit();
    } catch (err) {
      console.error("Error paying bill: ", err);
    }
  };

  const handleAddFundSuccess = async (amount: number, method: string, trxId: string, senderNumber: string) => {
    if (!currentUser) return;
    const newTxId = `tx-${Date.now()}`;

    const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    const userEmail = currentUser.email || 'user@test.com';

    const newTx: Transaction = {
      id: newTxId,
      type: 'CashIn',
      amount,
      targetNumber: method, // holding bkash/nagad/rocket label representation
      senderNumber: senderNumber, // sender account phone number
      txId: trxId, // real input TrxID
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Pending',
      userId: currentUser.uid,
      userEmail,
      userName
    };

    const addedNotifId = `notif-${Date.now()}`;
    const addedNotif: NotificationItem = {
      id: addedNotifId,
      title: 'Fund Request Pending',
      titleBn: 'অ্যাড ফান্ড অনুরোধ বিচারাধীন',
      desc: `Your add-fund of ৳${amount} via ${method} is undergoing administrative verification.`,
      descBn: `আপনার ${method} এর মাধ্যমে ৳${amount} টাকা যোগের অনুরোধ অ্যাডমিন যাচাইকরণের অপেক্ষায় আছে।`,
      time: 'Just now',
      read: false,
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', currentUser.uid, 'transactions', newTxId), newTx);
      batch.set(doc(db, 'admin_requests', newTxId), newTx);
      batch.set(doc(db, 'users', currentUser.uid, 'notifications', addedNotifId), addedNotif);
      
      // We DO NOT modify balance immediately for add funds - it will be done upon admin approval!
      await batch.commit();
    } catch (err) {
      console.error("Error adding fund: ", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAppLocked(true);
    } catch (err) {
      console.error("Error signing out: ", err);
    }
  };

  // Home Dashboard quick shortcut grids
  const gridServices = [
    {
      id: 'recharge',
      title: t.mobileRecharge,
      icon: Smartphone,
      color: 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm shadow-blue-500/5',
      action: () => {
        setPrefilledOp(null);
        setPrefilledAmt(null);
        setIsRechargeOpen(true);
      }
    },
    {
      id: 'packs',
      title: t.internetPackage,
      icon: Wifi,
      color: 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm shadow-indigo-500/5',
      action: () => setActiveTab('packages')
    },
    {
      id: 'bill',
      title: t.billPayment,
      icon: Landmark,
      color: 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-500/5',
      action: () => setIsBillPayOpen(true)
    },
    {
      id: 'history',
      title: t.transactionHistory,
      icon: History,
      color: 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm shadow-amber-500/5',
      action: () => setActiveTab('history')
    },
  ];

  // Render Desktop Dashboard structure helper
  const renderDesktopDashboard = () => {
    const userInitials = currentUser?.displayName
      ? currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : currentUser?.email
      ? currentUser.email.slice(0, 2).toUpperCase()
      : 'NT';
    const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

    const formatCurrency = (amount: number) => {
      if (lang === 'bn') {
        const formatted = amount.toLocaleString('bn-BD', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return `৳ ${formatted}`;
      }
      return `৳ ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    return (
      <div className="w-full h-screen flex bg-slate-50 select-none font-sans antialiased text-slate-800 relative">
        
        {/* Overlay auth & locks for desktop centered as a premium card */}
        {!currentUser && !authChecking && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm h-[812px] bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden relative border border-slate-850">
              <AuthPanel lang={lang} onSuccess={() => setIsAppLocked(true)} />
            </div>
          </div>
        )}

        {currentUser && isAppLocked && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm h-[812px] bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden relative border border-slate-850">
              <SecureLockModal lang={lang} onUnlocked={() => setIsAppLocked(false)} />
            </div>
          </div>
        )}

        {authChecking && (
          <div className="absolute inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">
              {lang === 'bn' ? 'সার্ভার সংযোগ যাচাই করা হচ্ছে...' : 'Verifying secure session...'}
            </p>
          </div>
        )}

        {/* 1. STICKY LEFT SIDEBAR */}
        <aside className="w-72 bg-slate-900 text-white flex flex-col justify-between shrink-0 border-r border-slate-800 h-screen sticky top-0 p-5 z-20">
          <div className="space-y-6">
            {/* App Logo */}
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md border border-white/10">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-md font-black tracking-tight text-white">{t.appName}</h1>
                <span className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase font-mono block">PRO EDITION</span>
              </div>
            </div>

            {/* User Wallet Card */}
            {currentUser && (
              <div className="bg-gradient-to-br from-slate-850 to-slate-900 border border-slate-755 p-4 rounded-2xl shadow-lg space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-16 w-16 bg-white/5 rounded-full translate-x-4 -translate-y-4 blur-md" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-sm font-bold border border-white/20">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200 truncate">{userName}</p>
                    <span className="text-[10px] text-yellow-500 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/5 inline-block mt-0.5">
                      {t.userStatus}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 relative z-10">
                  <span className="text-[10px] text-slate-400 font-bold tracking-wide block uppercase mb-1">
                    {t.currBalance}
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <div className="bg-slate-900/45 border border-slate-800/40 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <span className="text-md font-mono font-extrabold text-white">
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    {/* Floating Add Fund button shortcut */}
                    <button
                      onClick={() => setIsAddFundOpen(true)}
                      title={lang === 'bn' ? 'টাকা যোগ করুন' : 'Add Fund'}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1">
              {[
                { id: 'home' as AppTab, label: t.home, icon: Home },
                { id: 'packages' as AppTab, label: t.packages, icon: Package },
                { id: 'history' as AppTab, label: t.history, icon: History },
                { id: 'profile' as AppTab, label: t.profile, icon: User },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/15'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}

              {currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()) && (
                <button
                  onClick={() => setIsAdminOpen(true)}
                  className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer mt-2 border border-emerald-500/10"
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>{lang === 'bn' ? 'এডমিন পোর্টাল' : 'Admin Portal'}</span>
                </button>
              )}
            </nav>
          </div>

          {/* Sidebar Footer Controls */}
          <div className="space-y-3.5 pt-4 border-t border-slate-800/60 z-20">
            {/* View Mode Switching Widget */}
            <button
              onClick={() => setViewMode('mobile-mock')}
              className="w-full py-2.5 px-3 bg-slate-800/40 hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all border border-slate-750 cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5 text-blue-400" />
              <span>{lang === 'bn' ? 'মোবাইল স্ক্রীন মোড' : 'Mobile Screen Mock'}</span>
            </button>

            {/* Language Selection switch */}
            <div className="flex items-center justify-between gap-2 bg-slate-850 px-3 py-2 rounded-xl border border-slate-800 text-[11px] font-bold">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                {lang === 'bn' ? 'ভাষা / Lang:' : 'Language:'}
              </span>
              <button
                onClick={handleLanguageToggle}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded-md text-[10px] uppercase font-black cursor-pointer transition-colors"
              >
                {lang === 'bn' ? 'English' : 'বাংলা'}
              </button>
            </div>

            {/* Logout button */}
            {currentUser && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border border-rose-500/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{lang === 'bn' ? 'লগআউট করুন' : 'Sign Out'}</span>
              </button>
            )}
          </div>
        </aside>

        {/* 2. MAIN SCROLLABLE CONTENT AREA */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
          {/* Top Bar Navigation */}
          <header className="bg-white border-b border-slate-200/50 px-8 py-4.5 flex items-center justify-between">
            <div>
              <h2 className="text-slate-900 font-extrabold text-base tracking-tight font-display">
                {activeTab === 'home' && (lang === 'bn' ? 'ড্যাশবোর্ড ওভারভিউ' : 'Dashboard Overview')}
                {activeTab === 'packages' && t.packages}
                {activeTab === 'history' && t.history}
                {activeTab === 'profile' && t.profile}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {activeTab === 'home' && (lang === 'bn' ? 'আপনার নিহাদ টেলিকম পোর্টালে স্বাগতম' : 'Welcome to your premium Nihad Telecom portal')}
                {activeTab === 'packages' && (lang === 'bn' ? 'সেরা অফার ও বান্ডেল চেক করুন' : 'Check out top-tier cellular recharge packages')}
                {activeTab === 'history' && (lang === 'bn' ? 'সকল মোবাইল রিচার্জ ও বিল বিবরণী' : 'View secure logs and ledgers for references')}
                {activeTab === 'profile' && (lang === 'bn' ? 'প্রোফাইল সেটিংস ও সাপোর্ট' : 'Manage your billing settings and account parameters')}
              </p>
            </div>

            {/* Toolbar Items */}
            <div className="flex items-center gap-3">
              {/* Notification icon */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-xs"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotifications && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Dynamic Scrollable Working Space */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto space-y-6">

              {activeTab === 'home' && (
                <div className="space-y-6">
                  {/* Banner promotions on top */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
                    <Banners
                      lang={lang}
                      banners={dbBanners}
                      onSelectPromo={handleSelectPromo}
                    />
                  </div>

                  {/* Desktop Interactive Service Deck */}
                  <div className="grid grid-cols-4 gap-4">
                    {gridServices.map((srv) => {
                      const Icon = srv.icon;
                      return (
                        <button
                          key={srv.id}
                          onClick={srv.action}
                          className="bg-white border border-slate-200/50 hover:border-blue-200 hover:shadow-md hover:scale-102 active:scale-98 rounded-3xl p-6 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                        >
                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center group-hover:shadow-md transition-all mb-3 ${srv.color}`}>
                            <Icon className="h-6 w-6 stroke-[2.25]" />
                          </div>
                          <h3 className="text-xs font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {srv.title}
                          </h3>
                        </button>
                      );
                    })}
                  </div>

                  {/* Split Layout of Additional widgets */}
                  <div className="grid grid-cols-12 gap-6">
                    {/* Left Pane: Favorites list */}
                    <div className="col-span-12 xl:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                      <FavoritesGrid
                        favorites={favorites}
                        onSelectContact={handleSelectFavorite}
                        onAddContact={handleAddContact}
                        onRemoveContact={handleRemoveContact}
                        lang={lang}
                      />
                    </div>

                    {/* Right Pane: Compact ledger list */}
                    <div className="col-span-12 xl:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-slate-900 font-extrabold text-xs tracking-tight font-display">
                            {lang === 'bn' ? 'সাম্প্রতিক কার্যকলাপ' : 'Recent Activities'}
                          </h3>
                          <button
                            onClick={() => setActiveTab('history')}
                            className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline cursor-pointer"
                          >
                            <span>{lang === 'bn' ? 'সব দেখুন' : 'See All'}</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          {transactions.slice(0, 3).map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs font-semibold"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs ${
                                  tx.type === 'Recharge' ? 'bg-blue-50 text-blue-600' : tx.type === 'Bill' ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {tx.type === 'Recharge' ? <Smartphone className="h-4.5 w-4.5" /> : <Landmark className="h-4.5 w-4.5 text-emerald-600" />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-slate-800 font-bold text-[11.5px] leading-tight truncate max-w-[140px]">
                                    {tx.type === 'Recharge'
                                      ? `${lang === 'bn' ? 'মোবাইল রিচার্জ' : 'Recharge Request'}`
                                      : tx.type === 'Bill'
                                      ? `${lang === 'bn' ? tx.billerNameBn : tx.billerName}`
                                      : `${lang === 'bn' ? 'ক্যাশ ইন' : 'Cash In'}`}
                                  </h4>
                                  <span className="text-[9px] text-slate-400 font-mono font-bold block truncate max-w-[140px]">
                                    {tx.targetNumber || tx.txId}
                                  </span>
                                </div>
                              </div>
                              <span className={`font-display font-extrabold text-xs tracking-tight shrink-0 ${tx.type === 'CashIn' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {tx.type === 'CashIn' ? '+' : '-'}৳{tx.amount}
                              </span>
                            </div>
                          ))}
                          {transactions.length === 0 && (
                            <div className="text-center py-6 text-slate-400 text-xs font-medium">
                              {lang === 'bn' ? 'কোনো লেনদেন রেকর্ড নেই।' : 'No transaction records.'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'packages' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <InternetPacks
                    lang={lang}
                    packages={dbOffers}
                    onSelectPackage={handleSelectPromo}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <HistoryList
                    transactions={transactions}
                    lang={lang}
                  />
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <ProfilePanel
                    lang={lang}
                    onLanguageToggle={handleLanguageToggle}
                    onNotificationClick={() => setIsNotificationsOpen(true)}
                    onLogout={handleLogout}
                    onAdminClick={currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()) ? () => setIsAdminOpen(true) : undefined}
                  />
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    );
  };

  const isUserAdmin = currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim());

  if (currentUser && isUserAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-6 select-none font-sans antialiased text-slate-800 w-full">
        <div className="w-full max-w-5xl h-screen md:h-[850px] bg-white md:rounded-[3rem] md:shadow-2xl overflow-hidden relative flex flex-col border border-slate-200/40 animate-scale-up">
          <AdminPanel
            lang={lang}
            isOpen={true}
            onClose={handleLogout}
            isStandalone={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 md:p-6 select-none font-sans antialiased text-slate-800">
      
      {/* Dynamic view toggler float pill on computer wide screens */}
      {isLargeScreen && (
        <div className="fixed top-4 right-4 z-50 flex gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-slate-200/40 animate-fade-in">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              viewMode === 'desktop' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title={lang === 'bn' ? 'কম্পিউটার ড্যাশবোর্ড' : 'Desktop Dashboard'}
          >
            <Monitor className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setViewMode('mobile-mock')}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              viewMode === 'mobile-mock' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title={lang === 'bn' ? 'মোবাইল স্ক্রিন' : 'Mobile Simulator'}
          >
            <Smartphone className="h-4.5 w-4.5" />
          </button>
        </div>
      )}

      {isLargeScreen && viewMode === 'desktop' ? (
        renderDesktopDashboard()
      ) : (
        /* Smartphone Frame Outer Body container */
        <div className="w-full max-w-md bg-slate-50 min-h-screen md:min-h-[812px] md:rounded-[3rem] md:shadow-2xl relative overflow-hidden flex flex-col pb-24 border border-slate-200/45">
        
        {/* Firebase user login / registration system */}
        <AnimatePresence>
          {!currentUser && !authChecking && (
            <AuthPanel
              lang={lang}
              onSuccess={() => {
                setIsAppLocked(true);
              }}
            />
          )}
        </AnimatePresence>

        {/* Secure biometric / PIN lock layer on startup */}
        <AnimatePresence>
          {currentUser && isAppLocked && (
            <SecureLockModal
              lang={lang}
              onUnlocked={() => setIsAppLocked(false)}
            />
          )}
        </AnimatePresence>

        {/* Auth loader screen */}
        {authChecking && (
          <div className="absolute inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">
              {lang === 'bn' ? 'সার্ভার সংযোগ যাচাই করা হচ্ছে...' : 'Verifying secure session...'}
            </p>
          </div>
        )}
        
        {/* Smartphone Camera Notch indicator on desktop */}
        <div className="hidden md:absolute md:top-2 md:left-1/2 md:-translate-x-1/2 md:h-5 md:w-32 md:bg-black/85 md:rounded-full md:z-50 md:flex md:items-center md:justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-800 ml-4" />
        </div>

        {/* Core Orchestration tabs */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'home' && (
            <div className="space-y-4">
              
              {/* Header card with loyalty parameters */}
              <Header
                balance={balance}
                lang={lang}
                onLanguageToggle={handleLanguageToggle}
                onNotificationClick={handleNotificationClick}
                unreadNotifications={unreadNotifications}
                onAddFundClick={() => setIsAddFundOpen(true)}
              />

              {/* Grid block of Fintech Services */}
              <div className="px-4 -mt-12 relative z-20">
                <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xl grid grid-cols-4 gap-4">
                  {gridServices.map((srv) => {
                    const Icon = srv.icon;
                    return (
                      <button
                        key={srv.id}
                        onClick={srv.action}
                        id={`home-service-${srv.id}`}
                        className="flex flex-col items-center justify-center text-center group cursor-pointer focus:outline-none"
                      >
                        <div className={`h-13 w-13 rounded-[20px] flex items-center justify-center group-hover:shadow-md group-hover:scale-105 active:scale-95 transition-all mb-2 ${srv.color}`}>
                          <Icon className="h-5.5 w-5.5 stroke-[2.25]" />
                        </div>
                        <span className="text-[10.5px] font-bold text-slate-600 leading-tight block truncate w-full px-0.5">
                          {srv.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horizontal slider Carousel promo of deals */}
              <Banners
                lang={lang}
                banners={dbBanners}
                onSelectPromo={handleSelectPromo}
              />

              {/* Favorable Operators Quick Contacts list */}
              <FavoritesGrid
                favorites={favorites}
                onSelectContact={handleSelectFavorite}
                onAddContact={handleAddContact}
                onRemoveContact={handleRemoveContact}
                lang={lang}
              />

              {/* Micro recent transaction display panel */}
              <div className="px-4 py-1 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-slate-900 font-extrabold text-xs tracking-tight font-display">
                    {lang === 'bn' ? 'সাম্প্রতিক কার্যকলাপ' : 'Recent Activities'}
                  </h3>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'সব দেখুন' : 'See All'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="bg-white border border-slate-100 rounded-[28px] p-4.5 shadow-sm space-y-1">
                  {transactions.slice(0, 2).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors text-xs font-semibold"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs ${
                          tx.type === 'Recharge' ? 'bg-blue-50 text-blue-600' : tx.type === 'Bill' ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {tx.type === 'Recharge' ? <Smartphone className="h-4.5 w-4.5" /> : <Landmark className="h-4.5 w-4.5" />}
                        </div>
                        <div>
                          <h4 className="text-slate-800 font-bold text-[11.5px] leading-tight">
                            {tx.type === 'Recharge'
                              ? `${lang === 'bn' ? 'মোবাইল রিচার্জ' : 'Recharge Request'}`
                              : tx.type === 'Bill'
                              ? `${lang === 'bn' ? tx.billerNameBn : tx.billerName}`
                              : `${lang === 'bn' ? 'ক্যাশ ইন' : 'Cash In'}`}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-mono font-bold block truncate max-w-[140px]">
                            {tx.targetNumber || tx.txId}
                          </span>
                        </div>
                      </div>
                      <span className={`font-display font-extrabold text-xs tracking-tight ${tx.type === 'CashIn' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.type === 'CashIn' ? '+' : '-'}৳{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'packages' && (
            <InternetPacks
              lang={lang}
              packages={dbOffers}
              onSelectPackage={handleSelectPromo}
            />
          )}

          {activeTab === 'history' && (
            <HistoryList
              transactions={transactions}
              lang={lang}
            />
          )}

          {activeTab === 'profile' && (
            <ProfilePanel
              lang={lang}
              onLanguageToggle={handleLanguageToggle}
              onNotificationClick={handleNotificationClick}
              onLogout={handleLogout}
              onAdminClick={currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()) ? () => setIsAdminOpen(true) : undefined}
            />
          )}
        </div>

        {/* Global Bottom Tab Nav bar */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lang={lang}
        />
      </div>
      )}

      {/* SUBMODALS AND OVERLAYS SECTION */}
        <AnimatePresence>
          {/* MOBILE RECHARGE SLIDE-UP WORKFLOW */}
          {isRechargeOpen && (
            <RechargeModal
              isOpen={isRechargeOpen}
              onClose={() => setIsRechargeOpen(false)}
              lang={lang}
              currentBalance={balance}
              onSuccess={handleRechargeSuccess}
              initialOperator={prefilledOp}
              initialAmount={prefilledAmt}
              favorites={favorites}
              onAddFundRedirect={() => {
                setIsRechargeOpen(false);
                setIsAddFundOpen(true);
              }}
            />
          )}

           {/* BILL PAYMENT DIALOGUE */}
          {isBillPayOpen && (
            <BillPayModal
              isOpen={isBillPayOpen}
              onClose={() => setIsBillPayOpen(false)}
              lang={lang}
              currentBalance={balance}
              onSuccess={handleBillSuccess}
              billers={dbBillers}
              onAddFundRedirect={() => {
                setIsBillPayOpen(false);
                setIsAddFundOpen(true);
              }}
            />
          )}

          {/* ADD FUND (DEPOSIT) DIALOGUE */}
          {isAddFundOpen && (
            <AddFundModal
              lang={lang}
              isOpen={isAddFundOpen}
              onClose={() => setIsAddFundOpen(false)}
              onSuccess={handleAddFundSuccess}
            />
          )}

          {/* SECURE ADMIN CONTROL PANEL PORTAL */}
          {isAdminOpen && (
            <AdminPanel
              lang={lang}
              isOpen={isAdminOpen}
              onClose={() => setIsAdminOpen(false)}
            />
          )}

          {/* PUSH NOTIFICATION DRAWER OVERLAY */}
          {isNotificationsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotificationsOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: 50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 50, opacity: 0, scale: 0.95 }}
                className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto border border-slate-100"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-slate-900 font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                    <Bell className="h-4.5 w-4.5 text-blue-600" />
                    <span>{t.notifications}</span>
                  </h3>
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-2xl border transition-all text-xs space-y-1 ${
                        notif.read ? 'bg-white border-slate-100' : 'bg-blue-50/50 border-blue-200/30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">
                          {lang === 'bn' ? notif.titleBn : notif.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-semibold">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-slate-500 leading-relaxed font-medium">
                        {lang === 'bn' ? notif.descBn : notif.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }
