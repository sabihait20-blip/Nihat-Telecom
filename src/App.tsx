import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone, Wifi, Landmark, Eye, History, Heart,
  Bell, Check, Info, Sparkles, X, ChevronRight, HelpCircle, ArrowRight,
  Monitor, LogOut, Globe, Plus, Home, Package, User, Send, Wallet, ShoppingBag, Coins, Percent, Gift, MessageSquare,
  Calculator, CreditCard, AlertTriangle
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
  getDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  updateDoc
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
import TransferModal from './components/TransferModal';
import SecureLockModal from './components/SecureLockModal';
import VoucherModal from './components/VoucherModal';
import ScratchCardModal from './components/ScratchCardModal';
import SupportModal from './components/SupportModal';
import AuthPanel from './components/AuthPanel';
import AdminPanel from './components/AdminPanel';
import CashOutCalculatorModal from './components/CashOutCalculatorModal';
import StorePanel from './components/StorePanel';
import ReferralPanel from './components/ReferralPanel';
import KYCModal from './components/KYCModal';
import SimCardModal from './components/SimCardModal';

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
  const [userData, setUserData] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => !!localStorage.getItem('secure_wallet_pin'));
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
  const [adminUserViewMode, setAdminUserViewMode] = useState<'admin' | 'user'>('admin');
  const [appConfig, setAppConfig] = useState<any>({
    bkashNumber: '01970250988',
    nagadNumber: '01970250988',
    rocketNumber: '019702509883',
    helplineNumber: '01970250988',
    whatsappUrl: 'https://wa.me/8801970250988',
    minAddFund: 100,
    maxAddFund: 25000,
    globalNoticeEn: 'Airtel packages are currently in maintenance. Please purchase other packages!',
    globalNoticeBn: 'এয়ারটেল প্যাকেজগুলোর রক্ষণাবেক্ষনের কাজ চলছে। অন্য প্যাকেজ ব্যবহার করুন!',
    showNotice: true
  });

  // Dynamic App Settings / Notice Ticker observer
  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'app_config');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppConfig(docSnap.data());
      } else {
        // Seed default config document if empty
        const docRef = doc(db, 'settings', 'app_config');
        setDoc(docRef, {
          bkashNumber: '01970250988',
          nagadNumber: '01970250988',
          rocketNumber: '019702509883',
          helplineNumber: '01970250988',
          whatsappUrl: 'https://wa.me/8801970250988',
          minAddFund: 100,
          maxAddFund: 25000,
          globalNoticeEn: 'Airtel packages are currently in maintenance. Please purchase other packages!',
          globalNoticeBn: 'এয়ারটেল প্যাকেজগুলোর রক্ষণাবেক্ষনের কাজ চলছে। অন্য প্যাকেজ ব্যবহার করুন!',
          showNotice: true
        }).catch(err => console.error("Error seeding config: ", err));
      }
    }, (error) => {
      console.error("Error loading app config in App: ", error);
    });
    return () => unsubscribe();
  }, []);

  // Modal triggers
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [isScratchCardOpen, setIsScratchCardOpen] = useState(false);
  const [prefilledOp, setPrefilledOp] = useState<Operator | null>(null);
  const [prefilledAmt, setPrefilledAmt] = useState<number | null>(null);

  const [isBillPayOpen, setIsBillPayOpen] = useState(false);
  const [isAddFundOpen, setIsAddFundOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isCashOutCalcOpen, setIsCashOutCalcOpen] = useState(false);
  const [isKYCOpen, setIsKYCOpen] = useState(false);
  const [isSimOpen, setIsSimOpen] = useState(false);

  // Notification states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const knownNotifIdsRef = useRef<Set<string>>(new Set());

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserData(null);
        setAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // User Data Listener
  useEffect(() => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        // Synchronize KYC details and photoURL to registered_users immediately
        const updatePayload: any = {};
        if (data.kycStatus !== undefined) updatePayload.kycStatus = data.kycStatus;
        if (data.kycData !== undefined) updatePayload.kycData = data.kycData;
        if (data.photoURL !== undefined) updatePayload.photoURL = data.photoURL;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        if (data.displayName !== undefined) updatePayload.displayName = data.displayName;

        if (Object.keys(updatePayload).length > 0) {
          updateDoc(doc(db, 'registered_users', currentUser.uid), updatePayload).catch((err) => {
            console.warn("Failed to sync profile to registered_users: ", err);
          });
        }
      }
      setAuthChecking(false);
    }, (err) => {
      console.error("Error fetching user data:", err);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

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

  // Synchronize user profile into a global admin-accessible registered_users collection
  useEffect(() => {
    if (!currentUser) return;
    const syncProfile = async () => {
      try {
        const userProfileRef = doc(db, 'registered_users', currentUser.uid);
        const profileSnap = await getDoc(userProfileRef);
        let existingPhone = '';
        if (profileSnap.exists()) {
          existingPhone = profileSnap.data().phone || '';
        }

        await setDoc(userProfileRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Unknown User',
          email: currentUser.email || '',
          phone: existingPhone || (currentUser.email?.endsWith('@nihat-telecom.com') 
            ? currentUser.email.split('@')[0] 
            : ''),
          lastActive: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Error syncing user profile: ", err);
      }
    };
    syncProfile();
  }, [currentUser]);

  // Firestore balance observer scoped to logged in user
  useEffect(() => {
    if (!currentUser) return;
    const balanceDocRef = doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc');
    const unsubscribe = onSnapshot(balanceDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.balance === 'number') {
          setBalance(data.balance);
          // Sync balance to registered_users for admin panel
          updateDoc(doc(db, 'registered_users', currentUser.uid), { balance: data.balance }).catch(() => {});
        }
      } else {
        // Initialize balance in Firestore
        setDoc(balanceDocRef, { balance: 0 });
        setDoc(doc(db, 'registered_users', currentUser.uid), { balance: 0 }, { merge: true }).catch(() => {});
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
        txList.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
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
    if (!currentUser) {
      knownNotifIdsRef.current.clear();
      return;
    }

    // Auto-prompt permission if default on user login
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        setNotificationPermission(perm);
      });
    }

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

        const isFirstLoad = knownNotifIdsRef.current.size === 0;

        notifList.forEach((notif) => {
          if (!knownNotifIdsRef.current.has(notif.id)) {
            // Trigger push notification for subsequent new notifications
            if (!isFirstLoad) {
              const title = lang === 'bn' ? (notif.titleBn || notif.title) : (notif.title || notif.titleBn);
              const body = lang === 'bn' ? (notif.descBn || notif.desc) : (notif.desc || notif.descBn);

              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(title || 'Nihat Telecom', {
                    body: body || '',
                    icon: '/favicon.ico',
                    tag: notif.id,
                  });
                } catch (e) {
                  console.error("Error displaying notification: ", e);
                }
              }
            }
            knownNotifIdsRef.current.add(notif.id);
          }
        });

        setNotifications(notifList);
        const hasUnread = notifList.some(n => !n.read);
        setUnreadNotifications(hasUnread);
      }
    });
    return () => unsubscribe();
  }, [currentUser, lang]);

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

  const handleTransferSuccess = async (
    amount: number, 
    method: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Nihad Wallet (User)', 
    targetNumber: string,
    note?: string,
    recipientUid?: string,
    recipientName?: string,
    recipientEmail?: string
  ) => {
    if (!currentUser) return;

    if (balance < amount) {
      alert(lang === 'bn' ? 'দুঃখিত, আপনার ব্যালেন্স অপর্যাপ্ত!' : 'Insufficient wallet balance!');
      return;
    }

    if (method === 'Nihad Wallet (User)') {
      if (!recipientUid) {
        alert(lang === 'bn' ? 'গ্রাহক তথ্য পাওয়া যায়নি!' : 'Recipient info not found!');
        return;
      }

      try {
        const recipientBalanceRef = doc(db, 'users', recipientUid, 'wallet', 'balance_doc');
        const recipientBalanceSnap = await getDoc(recipientBalanceRef);
        let recipientCurrentBalance = 0;
        if (recipientBalanceSnap.exists()) {
          recipientCurrentBalance = recipientBalanceSnap.data().balance || 0;
        }

        const batch = writeBatch(db);

        // Update Sender's Balance
        const newSenderBalance = Math.max(balance - amount, 0);
        batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newSenderBalance });

        // Update Recipient's Balance
        batch.set(recipientBalanceRef, { balance: recipientCurrentBalance + amount });

        // Create Sender's Transaction Document
        const senderTxId = `tx-${Date.now()}`;
        const txReferenceId = `P2P${Math.random().toString(36).substr(2, 11).toUpperCase()}`;
        const senderTx: Transaction = {
          id: senderTxId,
          type: 'Transfer',
          amount,
          targetNumber, // recipient phone/email
          transferMethod: 'Nihad Wallet (User)',
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          txId: txReferenceId,
          status: 'Success', // P2P is instant
          userId: currentUser.uid,
          userEmail: currentUser.email || 'user@test.com',
          userName: currentUser.displayName || 'Sender',
          operator: recipientName as any,
          note: note || undefined
        };
        batch.set(doc(db, 'users', currentUser.uid, 'transactions', senderTxId), senderTx);

        // Create Recipient's Transaction Document (Received)
        const recipientTxId = `tx-rx-${Date.now()}`;
        const senderPhone = currentUser.email?.endsWith('@nihat-telecom.com') 
          ? currentUser.email.split('@')[0] 
          : currentUser.email || '';
        const recipientTx: Transaction = {
          id: recipientTxId,
          type: 'CashIn',
          amount,
          targetNumber: senderPhone, // sender identifier
          transferMethod: 'Received from User',
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          txId: txReferenceId,
          status: 'Success',
          userId: recipientUid,
          userEmail: recipientEmail || '',
          userName: recipientName || 'Recipient',
          operator: (currentUser.displayName || 'Sender') as any,
          note: note || undefined
        };
        batch.set(doc(db, 'users', recipientUid, 'transactions', recipientTxId), recipientTx);

        // Create Sender's Notification
        const senderNotifId = `notif-${Date.now()}`;
        const senderNotif: NotificationItem = {
          id: senderNotifId,
          title: 'Send Money Successful',
          titleBn: 'সেন্ড মানি সফল হয়েছে',
          desc: `You have successfully sent ৳${amount} to ${recipientName} (${targetNumber}).`,
          descBn: `আপনি সফলভাবে ${recipientName}-কে (${targetNumber}) ৳${amount} টাকা পাঠিয়েছেন।`,
          time: 'Just now',
          read: false
        };
        batch.set(doc(db, 'users', currentUser.uid, 'notifications', senderNotifId), senderNotif);

        // Create Recipient's Notification
        const recipientNotifId = `notif-rx-${Date.now()}`;
        const recipientNotif: NotificationItem = {
          id: recipientNotifId,
          title: 'Received Send Money',
          titleBn: 'টাকা গ্রহণ করেছেন',
          desc: `You have received ৳${amount} from ${currentUser.displayName || 'User'} (${senderPhone}).`,
          descBn: `আপনি ${currentUser.displayName || 'ইউজার'} (${senderPhone}) এর থেকে ৳${amount} টাকা গ্রহণ করেছেন।`,
          time: 'Just now',
          read: false
        };
        batch.set(doc(db, 'users', recipientUid, 'notifications', recipientNotifId), recipientNotif);

        await batch.commit();
      } catch (err) {
        console.error("Error processing instant wallet transfer: ", err);
        alert(lang === 'bn' ? 'ব্যালেন্স ট্রান্সফার ব্যর্থ হয়েছে! আবার চেষ্টা করুন।' : 'P2P Transfer failed! Please try again.');
        throw err;
      }
    } else {
      const newTxId = `tx-${Date.now()}`;
      const txReferenceId = `TRF${Math.random().toString(36).substr(2, 11).toUpperCase()}`;

      const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      const userEmail = currentUser.email || 'user@test.com';

      const newTx: Transaction = {
        id: newTxId,
        type: 'Transfer',
        amount,
        targetNumber,
        transferMethod: method,
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
        title: 'Transfer Request Submitted',
        titleBn: 'ট্রান্সফার অনুরোধ পাঠানো হয়েছে',
        desc: `Your transfer of ৳${amount} to ${method} (${targetNumber}) is pending admin verification.`,
        descBn: `আপনার ${method} নম্বরে (${targetNumber}) ৳${amount} টাকা ট্রান্সফারের অনুরোধ যাচাইয়ের অপেক্ষায় আছে।`,
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
        console.error("Error submitting transfer: ", err);
        throw err;
      }
    }
  };

  const handleVoucherSuccess = async (
    amount: number, 
    item: string, 
    packName: string, 
    targetAccount: string, 
    category: 'Gaming' | 'OTT'
  ) => {
    if (!currentUser) return;

    if (balance < amount) {
      alert(lang === 'bn' ? 'দুঃখিত, আপনার ব্যালেন্স অপর্যাপ্ত!' : 'Insufficient wallet balance!');
      return;
    }

    const newTxId = `tx-${Date.now()}`;
    const txReferenceId = `VCH${Math.random().toString(36).substr(2, 11).toUpperCase()}`;

    const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    const userEmail = currentUser.email || 'user@test.com';

    const newTx: Transaction = {
      id: newTxId,
      type: 'Voucher',
      amount,
      targetNumber: targetAccount,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      txId: txReferenceId,
      status: 'Pending',
      userId: currentUser.uid,
      userEmail,
      userName,
      voucherItem: item,
      voucherCode: packName,
      voucherCategory: category
    };

    const addedNotifId = `notif-${Date.now()}`;
    const addedNotif: NotificationItem = {
      id: addedNotifId,
      title: 'Voucher Purchase Pending',
      titleBn: 'ভাউচার ক্রয় অনুরোধ যাচাইধীন',
      desc: `Your purchase of ${item} (${packName}) for account ${targetAccount} is pending delivery.`,
      descBn: `আপনার ${item} (${packName}) এর জন্য ${targetAccount} অ্যাকাউন্টের অনুরোধটি ডেলিভারির অপেক্ষায় রয়েছে।`,
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
      console.error("Error submitting voucher transaction: ", err);
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

  const handleScratchCardSuccess = (amount: number) => {
    // Balance and transaction are already handled in ScratchCardModal via writeBatch
    // Firestore listener will auto-update the balance state.
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAppLocked(true);
    } catch (err) {
      console.error("Error signing out: ", err);
    }
  };

  // Home Dashboard quick shortcut grids restored with bKash pink color design and macOS dock spring animation styles
  const gridServices = [
    {
      id: 'recharge',
      title: t.mobileRecharge,
      icon: Smartphone,
      color: 'bg-pink-50 text-[#e2125d] border border-pink-100/40 shadow-xs shadow-pink-500/2',
      action: () => {
        setPrefilledOp(null);
        setPrefilledAmt(null);
        setIsRechargeOpen(true);
      }
    },
    {
      id: 'scratch_card',
      title: lang === 'bn' ? 'স্ক্র্যাচ কার্ড' : 'Scratch Card',
      icon: CreditCard,
      color: 'bg-orange-50 text-orange-600 border border-orange-100/40 shadow-xs shadow-orange-500/2',
      action: () => setIsScratchCardOpen(true)
    },
    {
      id: 'add_fund',
      title: lang === 'bn' ? 'এড ফান্ড' : 'Add Fund',
      icon: Wallet,
      color: 'bg-teal-50 text-teal-600 border border-teal-100/40 shadow-xs shadow-teal-500/2',
      action: () => setIsAddFundOpen(true)
    },
    {
      id: 'packs',
      title: t.internetPackage,
      icon: Wifi,
      color: 'bg-emerald-50 text-emerald-600 border border-emerald-100/40 shadow-xs shadow-emerald-500/2',
      action: () => setActiveTab('packages')
    },
    {
      id: 'bill',
      title: t.billPayment,
      icon: Landmark,
      color: 'bg-amber-50 text-amber-600 border border-amber-100/40 shadow-xs shadow-amber-500/2',
      action: () => setIsBillPayOpen(true)
    },
    {
      id: 'transfer',
      title: lang === 'bn' ? 'ব্যালেন্স ট্রান্সফার' : 'Balance Transfer',
      icon: Send,
      color: 'bg-violet-50 text-violet-600 border border-violet-100/40 shadow-xs shadow-violet-500/2',
      action: () => setIsTransferOpen(true)
    },
    {
      id: 'store',
      title: lang === 'bn' ? 'মেগা স্টোর' : 'Mega Store',
      icon: ShoppingBag,
      color: 'bg-pink-50 text-[#e2125d] border border-pink-100/40 shadow-xs shadow-pink-500/2',
      action: () => setActiveTab('store')
    },
    {
      id: 'sim',
      title: lang === 'bn' ? 'সিম কার্ড' : 'SIM Card',
      icon: Smartphone,
      color: 'bg-indigo-50 text-indigo-600 border border-indigo-100/40 shadow-xs shadow-indigo-500/2',
      action: () => setIsSimOpen(true)
    },
    {
      id: 'support',
      title: lang === 'bn' ? 'সাপোর্ট ও চ্যাট' : 'Support & Chat',
      icon: MessageSquare,
      color: 'bg-blue-50 text-blue-600 border border-blue-100/40 shadow-xs shadow-blue-500/2',
      action: () => setIsSupportOpen(true)
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

        {currentUser && userData?.isBanned && (
          <div className="absolute inset-0 z-55 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black mb-3 text-white">
              {lang === 'bn' ? 'অ্যাকাউন্ট স্থগিত করা হয়েছে' : 'Account Suspended'}
            </h2>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed font-semibold mb-6">
              {lang === 'bn' 
                ? 'আপনার অ্যাকাউন্টটি নীতিমালার পরিপন্থী কাজের কারণে স্থগিত করা হয়েছে। বিস্তারিত জানতে বা ওয়ালেট সক্রিয় করতে হেল্পলাইনে যোগাযোগ করুন।' 
                : 'Your account has been suspended due to policy violations. Please contact our helpline to resolve this issue and activate your wallet.'}
            </p>
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 w-full max-w-xs space-y-3.5 text-left font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-extrabold">HELPLINE:</span>
                <span className="text-blue-400 font-black">01970250988</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-extrabold">EMAIL:</span>
                <span className="text-slate-300">sabihait20@gmail.com</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2">
                <span className="text-slate-500 font-extrabold">STATUS:</span>
                <span className="text-rose-400 font-extrabold uppercase">SUSPENDED</span>
              </div>
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
        <aside className="w-[280px] bg-slate-950 text-white flex flex-col justify-between shrink-0 border-r border-slate-800/60 h-screen sticky top-0 p-5 z-20 shadow-2xl relative overflow-hidden">
          {/* Decorative background glows */}
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
          
          <div className="space-y-8 relative z-10">
            {/* App Logo */}
            <div className="flex items-center gap-3.5 px-2">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white">{t.appName}</h1>
                <span className="text-[9px] text-blue-400 font-bold tracking-widest uppercase font-mono block">WORKSPACE</span>
              </div>
            </div>

            {/* User Wallet Card */}
            {currentUser && (
              <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 backdrop-blur-md border border-slate-700/50 p-5 rounded-3xl shadow-xl space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-11 h-11 bg-slate-800 rounded-2xl flex items-center justify-center text-sm font-bold border border-slate-600 shadow-inner">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-200 truncate">{userName}</p>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 inline-block mt-1 uppercase tracking-wider">
                      {t.userStatus}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/50 relative z-10">
                  <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mb-1.5 block">
                    {t.currBalance}
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-extrabold text-white tracking-tight">
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    {/* Floating Add Fund button shortcut */}
                    <button
                      onClick={() => setIsAddFundOpen(true)}
                      title={lang === 'bn' ? 'টাকা যোগ করুন' : 'Add Fund'}
                      className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
                    >
                      <Plus className="h-4 w-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1.5">
              {[
                { id: 'home' as AppTab, label: t.home, icon: Home },
                { id: 'store' as AppTab, label: lang === 'bn' ? 'স্টোর' : 'Store', icon: ShoppingBag },
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
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[13px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-400 shadow-inner border border-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                    <span>{tab.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                    )}
                  </button>
                );
              })}

              {currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()) && (
                <button
                  onClick={() => setAdminUserViewMode('admin')}
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
        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f8f9fc] relative">
          {/* Subtle background ambient blur */}
          <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-blue-400/5 rounded-full blur-[100px] pointer-events-none" />
          
          {/* Top Bar Navigation */}
          <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-10 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm shadow-slate-200/20">
            <div>
              <h2 className="text-slate-900 font-black text-[1.35rem] tracking-tight font-display drop-shadow-sm">
                {activeTab === 'home' && (lang === 'bn' ? 'ড্যাশবোর্ড ওভারভিউ' : 'Dashboard Overview')}
                {activeTab === 'packages' && t.packages}
                {activeTab === 'history' && t.history}
                {activeTab === 'profile' && t.profile}
              </h2>
              <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                {activeTab === 'home' && (lang === 'bn' ? 'আপনার নিহাদ টেলিকম পোর্টালে স্বাগতম' : 'Welcome to your premium Nihad Telecom workspace')}
                {activeTab === 'packages' && (lang === 'bn' ? 'সেরা অফার ও বান্ডেল চেক করুন' : 'Check out top-tier cellular recharge packages')}
                {activeTab === 'history' && (lang === 'bn' ? 'সকল মোবাইল রিচার্জ ও বিল বিবরণী' : 'View secure logs and ledgers for references')}
                {activeTab === 'profile' && (lang === 'bn' ? 'প্রোফাইল সেটিংস ও সাপোর্ট' : 'Manage your billing settings and account parameters')}
              </p>
            </div>

            {/* Toolbar Items */}
            <div className="flex items-center gap-4">
              {/* Notification icon */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
              >
                <Bell className="h-5 w-5 stroke-[2]" />
                {unreadNotifications && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Dynamic Scrollable Working Space */}
          <div className="flex-1 overflow-y-auto p-10 relative z-0">
            <div className="max-w-[1400px] mx-auto space-y-8">

              {activeTab === 'home' && (
                <div className="space-y-8">
                  {/* Dynamic Warning Marquee notice ticker */}
                  {appConfig.showNotice && (
                    <div id="notice-ticker" className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl py-2.5 px-4 flex items-center gap-3 overflow-hidden shadow-sm">
                      <div className="p-1 px-2 bg-amber-500/15 border border-amber-500/20 text-amber-700 rounded-lg shrink-0 flex items-center justify-center gap-2 font-bold text-[10.5px] tracking-widest uppercase">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                        </span>
                        <span>{lang === 'bn' ? 'নোটিশ' : 'Notice'}</span>
                      </div>
                      <div className="flex-1 overflow-hidden relative">
                        <div className="animate-marquee whitespace-nowrap text-amber-900/80 text-[12px] font-bold font-sans">
                          {lang === 'bn' ? appConfig.globalNoticeBn : appConfig.globalNoticeEn}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Banner promotions on top */}
                  <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-5 shadow-sm hover:shadow-md transition-shadow">
                    <Banners
                      lang={lang}
                      banners={dbBanners}
                      onSelectPromo={handleSelectPromo}
                    />
                  </div>

                  {/* Desktop Interactive Service Deck */}
                  <div className="grid grid-cols-4 gap-5">
                    {gridServices.map((srv) => {
                      const Icon = srv.icon;
                      return (
                        <button
                          key={srv.id}
                          onClick={srv.action}
                          className="bg-white border border-slate-200/60 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 rounded-[2rem] p-7 transition-all duration-300 flex flex-col items-start justify-between text-left group cursor-pointer min-h-[150px] relative overflow-hidden"
                        >
                          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-8 -mt-8 opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${srv.color}`} />
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-4 shadow-sm ${srv.color}`}>
                            <Icon className="h-5 w-5 stroke-[2.25]" />
                          </div>
                          <div>
                            <h3 className="text-[14px] font-black text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight">
                              {srv.title}
                            </h3>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Split Layout of Additional widgets */}
                  <div className="grid grid-cols-12 gap-6">
                    {/* Left Pane: Favorites list */}
                    <div className="col-span-12 xl:col-span-7 bg-white border border-slate-200/60 rounded-[2.5rem] p-7 shadow-sm hover:shadow-md transition-shadow">
                      <FavoritesGrid
                        favorites={favorites}
                        onSelectContact={handleSelectFavorite}
                        onAddContact={handleAddContact}
                        onRemoveContact={handleRemoveContact}
                        lang={lang}
                      />
                    </div>

                    {/* Right Pane: Compact ledger list */}
                    <div className="col-span-12 xl:col-span-5 bg-white border border-slate-200/60 rounded-[2.5rem] p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
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
                          {transactions.slice(0, 3).map((tx, index) => (
                            <div
                              key={`${tx.id || index}-${index}`}
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
                <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-7 shadow-sm hover:shadow-md transition-shadow">
                  <InternetPacks
                    lang={lang}
                    packages={dbOffers}
                    onSelectPackage={handleSelectPromo}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-7 shadow-sm hover:shadow-md transition-shadow">
                  <HistoryList
                    transactions={transactions}
                    lang={lang}
                  />
                </div>
              )}

              {activeTab === 'store' && (
                <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[700px]">
                  <StorePanel
                    lang={lang}
                    walletBalance={balance}
                  />
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-7 shadow-sm hover:shadow-md transition-shadow">
                  <ProfilePanel
                    lang={lang}
                    onLanguageToggle={handleLanguageToggle}
                    onNotificationClick={() => setIsNotificationsOpen(true)}
                    onLogout={handleLogout}
                    onAdminClick={currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()) ? () => setAdminUserViewMode('admin') : undefined}
                    helplineNumber={appConfig.helplineNumber}
                    whatsappUrl={appConfig.whatsappUrl}
                    onAddFundClick={() => setIsAddFundOpen(true)}
                    onReferralClick={() => setActiveTab('referral')}
                  />
                </div>
              )}

              {activeTab === 'referral' && (
                <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-7 shadow-sm hover:shadow-md transition-shadow">
                  <ReferralPanel
                    lang={lang}
                    onBack={() => setActiveTab('profile')}
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

  if (currentUser && isUserAdmin && adminUserViewMode === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 select-none font-sans antialiased text-slate-100 w-full">
        <div className="w-full h-screen bg-slate-950 overflow-hidden relative flex flex-col border-none animate-scale-up">
          <AdminPanel
            lang={lang}
            isOpen={true}
            onClose={handleLogout}
            isStandalone={true}
            onToggleUserView={() => setAdminUserViewMode('user')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${(!currentUser || viewMode === 'mobile-mock') ? 'bg-slate-950' : 'bg-slate-50'} flex items-center justify-center p-0 md:p-6 select-none font-sans antialiased text-slate-800`}>
      
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
        <div className={`w-full max-w-md ${!currentUser ? 'bg-slate-900 border-slate-800 shadow-slate-950/50' : 'bg-slate-50 border-slate-200/45 shadow-2xl'} min-h-screen md:min-h-[812px] md:rounded-[3rem] relative overflow-hidden flex flex-col pb-24 border`}>
        
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

              {/* Grid block of Fintech Services themed like bKash with macOS dock Magnification */}
              <div className="px-4 -mt-12 relative z-20">
                <div className="bg-white border border-slate-100/70 rounded-[32px] p-5 shadow-xl grid grid-cols-4 gap-y-5 gap-x-4">
                  {gridServices.map((srv) => {
                    const Icon = srv.icon;
                    return (
                      <motion.button
                        key={srv.id}
                        onClick={srv.action}
                        id={`home-service-${srv.id}`}
                        whileHover={{ 
                          scale: 1.14, 
                          y: -5,
                          boxShadow: '0 10px 20px rgba(226,18,93,0.08)' 
                        }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 400, 
                          damping: 15 
                        }}
                        className="flex flex-col items-center justify-center text-center group cursor-pointer focus:outline-none selection:bg-transparent"
                      >
                        {/* Circular bKash-style icon base container */}
                        <div className={`h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 mb-2 border border-white shadow-xs ${srv.color}`}>
                          <Icon className="h-6 w-6 stroke-[2.25]" />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 leading-tight block truncate w-full px-0.5 font-sans">
                          {srv.title}
                        </span>
                      </motion.button>
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

              {/* Dynamic Warning Marquee notice ticker */}
              {appConfig.showNotice && (
                <div id="notice-ticker" className="mx-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl py-2 px-3.5 flex items-center gap-2.5 overflow-hidden shadow-xs">
                  <div className="p-1 px-1.5 bg-amber-500/10 border border-amber-500/10 text-amber-600 rounded-lg shrink-0 flex items-center justify-center gap-1 font-bold text-[10px] tracking-wide uppercase">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    <span>{lang === 'bn' ? 'নোটিশ' : 'Notice'}</span>
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <div className="animate-marquee whitespace-nowrap text-slate-700 text-[10.5px] font-bold font-sans">
                      {lang === 'bn' ? appConfig.globalNoticeBn : appConfig.globalNoticeEn}
                    </div>
                  </div>
                </div>
              )}

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
                  {transactions.slice(0, 2).map((tx, index) => (
                    <div
                      key={`${tx.id || index}-${index}`}
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

          {activeTab === 'store' && (
            <StorePanel
              lang={lang}
              walletBalance={balance}
            />
          )}

          {activeTab === 'referral' && (
            <ReferralPanel
              lang={lang}
              onBack={() => setActiveTab('profile')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfilePanel
              lang={lang}
              onLanguageToggle={handleLanguageToggle}
              onNotificationClick={handleNotificationClick}
              onLogout={handleLogout}
              onAdminClick={currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim()) ? () => setAdminUserViewMode('admin') : undefined}
              helplineNumber={appConfig.helplineNumber}
              whatsappUrl={appConfig.whatsappUrl}
              onAddFundClick={() => setIsAddFundOpen(true)}
              userData={userData}
              onKYCClick={() => setIsKYCOpen(true)}
              onReferralClick={() => setActiveTab('referral')}
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

          {/* BALANCE TRANSFER DIALOGUE */}
          {isTransferOpen && (
            <TransferModal
              lang={lang}
              isOpen={isTransferOpen}
              onClose={() => setIsTransferOpen(false)}
              currentBalance={balance}
              onSuccess={handleTransferSuccess}
              favorites={favorites}
              currentUser={currentUser}
            />
          )}

          {/* VOUCHER STORE DIALOGUE */}
          {isVoucherOpen && (
            <VoucherModal
              lang={lang}
              isOpen={isVoucherOpen}
              onClose={() => setIsVoucherOpen(false)}
              currentBalance={balance}
              onSuccess={handleVoucherSuccess}
            />
          )}

          {/* SCRATCH CARD STORE */}
          <ScratchCardModal
            lang={lang}
            isOpen={isScratchCardOpen}
            onClose={() => setIsScratchCardOpen(false)}
            balance={balance}
            uid={currentUser?.uid || null}
            onSuccess={handleScratchCardSuccess}
          />

          {/* CASHOUT CALCULATOR & SIMULATOR DIALOGUE */}
          {isCashOutCalcOpen && (
            <CashOutCalculatorModal
              lang={lang}
              isOpen={isCashOutCalcOpen}
              onClose={() => setIsCashOutCalcOpen(false)}
              currentBalance={balance}
              onSuccess={() => {}}
              favorites={favorites}
            />
          )}

          {/* HELP & SUPPORT PORTAL */}
          {isSupportOpen && (
            <SupportModal
              lang={lang}
              isOpen={isSupportOpen}
              onClose={() => setIsSupportOpen(false)}
            />
          )}

          {/* SIM CARD ORDERING MODAL */}
          {isSimOpen && (
            <SimCardModal
              lang={lang}
              isOpen={isSimOpen}
              onClose={() => setIsSimOpen(false)}
              walletBalance={balance}
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

          {/* KYC VERIFICATION MODAL */}
          {isKYCOpen && (
            <KYCModal
              lang={lang}
              onClose={() => setIsKYCOpen(false)}
              onSuccess={() => setIsKYCOpen(false)}
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

                {('Notification' in window) && notificationPermission !== 'granted' && (
                  <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex flex-col gap-2">
                    <div className="flex gap-2">
                      <span className="text-lg">🔔</span>
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-blue-900 font-bold leading-normal">
                          {lang === 'bn' ? 'ফেইসবুকের মতো পুশ নোটিফিকেশন' : 'Facebook-style Push Notifications'}
                        </p>
                        <p className="text-[10px] text-blue-700/80 font-medium leading-normal">
                          {lang === 'bn' 
                            ? 'আপনার রিচার্জ রিকুয়েষ্ট সফল বা বাতিল হলে ফোনের হোম স্ক্রিনে সাথে সাথে নোটিফিকেশন যাবে।' 
                            : 'Get instant updates on your phone screen whenever your recharge request is processed.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const perm = await Notification.requestPermission();
                        setNotificationPermission(perm);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition-colors shadow-sm cursor-pointer select-none border-0"
                    >
                      {lang === 'bn' ? 'অনুমতি দিন এবং নোটিফিকেশন চালু করুন' : 'Enable & Allow Notifications'}
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {notifications.map((notif, index) => (
                    <div
                      key={`${notif.id || index}-${index}`}
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
