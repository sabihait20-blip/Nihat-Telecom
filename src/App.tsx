import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone, Wifi, Landmark, Eye, History, Heart,
  Bell, Check, Info, Sparkles, X, ChevronRight, HelpCircle, ArrowRight
} from 'lucide-react';

// Data types & assets
import { AppTab, Language, Operator, Transaction, FavoriteContact } from './types';
import { TRANSLATIONS } from './data/translations';
import {
  OPERATORS,
  POPULAR_PACKAGES,
  MOCK_FAVORITE_CONTACTS,
  INITIAL_TRANSACTIONS,
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
  const [balance, setBalance] = useState<number>(5254.50);
  
  // Real-time transactional tracking arrays
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [favorites, setFavorites] = useState<FavoriteContact[]>(MOCK_FAVORITE_CONTACTS);

  // Modal triggers
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [prefilledOp, setPrefilledOp] = useState<Operator | null>(null);
  const [prefilledAmt, setPrefilledAmt] = useState<number | null>(null);

  const [isBillPayOpen, setIsBillPayOpen] = useState(false);
  const [isAddFundOpen, setIsAddFundOpen] = useState(false);

  // Notification states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: '১০% Teletalk অফার!',
      titleBn: '১০% টেলিটক অফার!',
      desc: 'Get immediate 10% cash bonus on Teletalk recharge.',
      descBn: 'টেলিটক রিচার্জে ১০% তাৎক্ষণিক ক্যাশব্যাক বোনাস উপভোগ করুন।',
      time: '10m ago',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'DESCO Bill Paid Successfully',
      titleBn: 'ডেসকো বিদ্যুৎ বিল পরিশোধ সফল',
      desc: 'Your utility bill of ৳1,450 was completed.',
      descBn: 'ডেসকো বিদ্যুৎ বিল ১,৪৫০ টাকা সফলভাবে পরিশোধ করা হয়েছে।',
      time: '1d ago',
      read: true,
    },
    {
      id: 'notif-3',
      title: 'Security Notice',
      titleBn: 'নিরাপত্তা বার্তা',
      desc: 'Do not share your wallet 4-digit PIN code with anyone.',
      descBn: 'নিরাপত্তার স্বার্থে আপনার ওয়ালেটের ৪-ডিজিটের গোপন পিন কারো সাথে শেয়ার করবেন না।',
      time: '2d ago',
      read: true,
    }
  ]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
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
        setDoc(balanceDocRef, { balance: 5254.50 });
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Firestore transaction observer scoped to logged in user
  useEffect(() => {
    if (!currentUser) return;
    const txCollectionRef = collection(db, 'users', currentUser.uid, 'transactions');
    const q = query(txCollectionRef, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      if (querySnapshot.empty) {
        try {
          const batch = writeBatch(db);
          INITIAL_TRANSACTIONS.forEach((tx) => {
            const docRef = doc(txCollectionRef, tx.id);
            batch.set(docRef, tx);
          });
          await batch.commit();
        } catch (err) {
          console.error("Error seeding transactions: ", err);
        }
      } else {
        const txList: Transaction[] = [];
        querySnapshot.forEach((docSnap) => {
          txList.push(docSnap.data() as Transaction);
        });
        setTransactions(txList);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Firestore favorites observer scoped to logged in user
  useEffect(() => {
    if (!currentUser) return;
    const favCollectionRef = collection(db, 'users', currentUser.uid, 'favorites');
    const unsubscribe = onSnapshot(favCollectionRef, async (querySnapshot) => {
      if (querySnapshot.empty) {
        try {
          const batch = writeBatch(db);
          MOCK_FAVORITE_CONTACTS.forEach((fav) => {
            const docRef = doc(favCollectionRef, fav.id);
            batch.set(docRef, fav);
          });
          await batch.commit();
        } catch (err) {
          console.error("Error seeding favorites: ", err);
        }
      } else {
        const favList: FavoriteContact[] = [];
        querySnapshot.forEach((docSnap) => {
          favList.push(docSnap.data() as FavoriteContact);
        });
        setFavorites(favList);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Firestore notification observer scoped to logged in user
  useEffect(() => {
    if (!currentUser) return;
    const notifCollectionRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(notifCollectionRef, orderBy('id', 'desc'));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const initialNotifs = [
        {
          id: 'notif-1',
          title: '১০% Teletalk অফার!',
          titleBn: '১০% টেলিটক অফার!',
          desc: 'Get immediate 10% cash bonus on Teletalk recharge.',
          descBn: 'টেলিটক রিচার্জে ১০% তাৎক্ষণিক ক্যাশব্যাক বোনাস উপভোগ করুন।',
          time: '10m ago',
          read: false,
        },
        {
          id: 'notif-2',
          title: 'DESCO Bill Paid Successfully',
          titleBn: 'ডেসকো বিদ্যুৎ বিল পরিশোধ সফল',
          desc: 'Your utility bill of ৳1,450 was completed.',
          descBn: 'ডেসকো বিদ্যুৎ বিল ১,৪৫০ টাকা সফলভাবে পরিশোধ করা হয়েছে।',
          time: '1d ago',
          read: true,
        },
        {
          id: 'notif-3',
          title: 'Security Notice',
          titleBn: 'নিরাপত্তা বার্তা',
          desc: 'Do not share your wallet 4-digit PIN code with anyone.',
          descBn: 'নিরাপত্তার স্বার্থে আপনার ওয়ালেটের ৪-ডিজিটের গোপন পিন কারো সাথে শেয়ার করবেন না।',
          time: '2d ago',
          read: true,
        }
      ];

      if (querySnapshot.empty) {
        try {
          const batch = writeBatch(db);
          initialNotifs.forEach((notif) => {
            const docRef = doc(notifCollectionRef, notif.id);
            batch.set(docRef, notif);
          });
          await batch.commit();
        } catch (err) {
          console.error("Error seeding notifications: ", err);
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
    const newTxId = `tx-${Date.now()}`;
    const newTx: Transaction = {
      id: newTxId,
      type: 'Recharge',
      operator,
      targetNumber: number,
      amount,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      txId: `FLX${Math.random().toString(36).substr(2, 11).toUpperCase()}`,
      status: 'Success'
    };

    const addedNotifId = `notif-${Date.now()}`;
    const addedNotif: NotificationItem = {
      id: addedNotifId,
      title: 'Recharge Done',
      titleBn: 'রিচার্জ সফল',
      desc: `৳${amount} has been successfully recharged to ${number}`,
      descBn: `৳${amount} টাকা সফলভাবে রিচার্জ হয়েছে (${number}) নম্বরে।`,
      time: 'Just now',
      read: false,
    };

    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'transactions', newTxId), newTx);
      await setDoc(doc(db, 'users', currentUser.uid, 'notifications', addedNotifId), addedNotif);
      
      const newBalanceVal = Math.max(balance - amount, 0);
      await setDoc(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });
    } catch (err) {
      console.error("Error recharging: ", err);
    }
  };

  // Utility Bill Payment transactional settlement callback
  const handleBillSuccess = async (amount: number, billerName: string, billerNameBn: string) => {
    if (!currentUser) return;
    const newTxId = `tx-${Date.now()}`;
    const newTx: Transaction = {
      id: newTxId,
      type: 'Bill',
      amount,
      billerName,
      billerNameBn,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      txId: `FLX${Math.random().toString(36).substr(2, 11).toUpperCase()}`,
      status: 'Success'
    };

    const addedNotifId = `notif-${Date.now()}`;
    const addedNotif: NotificationItem = {
      id: addedNotifId,
      title: 'Bill Settled',
      titleBn: 'বিল পরিশোধ সফল',
      desc: `Your bill payment of ৳${amount} to ${billerName} was processed.`,
      descBn: `আপনার ${billerNameBn} বিলের ৳${amount} টাকা সফলভাবে পরিশোধিত হয়েছে।`,
      time: 'Just now',
      read: false,
    };

    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'transactions', newTxId), newTx);
      await setDoc(doc(db, 'users', currentUser.uid, 'notifications', addedNotifId), addedNotif);
      
      const newBalanceVal = Math.max(balance - amount, 0);
      await setDoc(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });
    } catch (err) {
      console.error("Error paying bill: ", err);
    }
  };

  const handleAddFundSuccess = async (amount: number, method: string) => {
    if (!currentUser) return;
    const newTxId = `tx-${Date.now()}`;
    const newTx: Transaction = {
      id: newTxId,
      type: 'CashIn',
      amount,
      targetNumber: method,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      txId: `ADD${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: 'Success'
    };

    const addedNotifId = `notif-${Date.now()}`;
    const addedNotif: NotificationItem = {
      id: addedNotifId,
      title: 'Fund Added',
      titleBn: 'ওয়ালেটে টাকা যোগ সফল',
      desc: `৳${amount} has been added successfully to your wallet via ${method}`,
      descBn: `৳${amount} টাকা সফলভাবে ${method} এর মাধ্যমে ওয়ালেটে যোগ করা হয়েছে।`,
      time: 'Just now',
      read: false,
    };

    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'transactions', newTxId), newTx);
      await setDoc(doc(db, 'users', currentUser.uid, 'notifications', addedNotifId), addedNotif);
      
      const newBalanceVal = balance + amount;
      await setDoc(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 md:p-6 select-none font-sans antialiased text-slate-800">
      
      {/* Smartphone Frame Outer Body container */}
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
              onResetBalance={handleResetBalance}
              onLogout={handleLogout}
            />
          )}
        </div>

        {/* Global Bottom Tab Nav bar */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lang={lang}
        />

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
    </div>
  );
}
