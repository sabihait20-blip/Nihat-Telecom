import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { 
  X, ShieldCheck, Check, AlertTriangle, Plus, Trash2, Edit2, 
  Smartphone, CreditCard, Layers, Sparkles, RefreshCw, AlertCircle, FileText, Gift, Send,
  LogOut, User, Settings, Copy, MessageSquare, Globe, ShoppingBag, Volume2, Maximize, Minimize
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, 
  query, orderBy, writeBatch, updateDoc, getDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Language, Operator, RechargePackage, PromoBanner, Transaction, BillProvider, StoreProduct, StoreOrder } from '../types';

const ADMIN_EMAILS = [
  'musicnrs2020@gmail.com',
  'nurnobyr36@gmail.com',
  'sabihait20@gmail.com',
  'dhukabuzz420@gmail.com'
];


function translateBanglaToEnglish(banglaText: string): string {
  if (!banglaText) return '';
  
  // 1. Convert Bangla numbers to English numbers
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let text = banglaText;
  for (let i = 0; i < 10; i++) {
    text = text.replace(new RegExp(banglaDigits[i], 'g'), englishDigits[i]);
  }

  // 2. Vocabulary translations (exact & substring mapping)
  const dictionary: [RegExp, string][] = [
    // Operators
    [/গ্রামীণফোন/gi, 'GP'],
    [/গ্রামীণ/gi, 'GP'],
    [/জিপি/gi, 'GP'],
    [/রবি/gi, 'Robi'],
    [/এয়ারটেল/gi, 'Airtel'],
    [/এয়ারটেল/gi, 'Airtel'],
    [/বাংলালিংক/gi, 'Banglalink'],
    [/টেলিটক/gi, 'Teletalk'],

    // Volume & Units
    [/জিবি/gi, 'GB'],
    [/জি\.বি\./gi, 'GB'],
    [/জি বি/gi, 'GB'],
    [/এমবি/gi, 'MB'],
    [/এম\.বি\./gi, 'MB'],
    [/এম বি/gi, 'MB'],
    [/মিনিট/gi, 'Minutes'],
    [/টাকা/gi, 'Taka'],
    [/টাকায়/gi, 'Taka'],
    [/প্যাক/gi, 'Pack'],
    [/প্যাকেজ/gi, 'Package'],
    [/অফার/gi, 'Offer'],
    [/সব/gi, 'All'],
    [/দিন/gi, 'Days'],
    [/ঘণ্টা/gi, 'Hours'],
    [/ঘन्টা/gi, 'Hours'],
    [/সপ্তাহ/gi, 'Week'],
    [/মাস/gi, 'Month'],
    [/মেয়াদঃ/gi, 'Validity:'],
    [/মেয়াদ:/gi, 'Validity:'],
    [/মেয়াদ/gi, 'Validity'],
    [/আজকের/gi, "Today's"],
    [/ধামাকা/gi, 'Dhamaka'],
    [/স্পেশাল/gi, 'Special'],
    [/ভয়েস/gi, 'Voice'],
    [/টকটাইম/gi, 'Talktime'],
    [/টকটইম/gi, 'Talktime'],
    [/বান্ডেল/gi, 'Bundle'],
    [/বান্ডিল/gi, 'Bundle'],
    [/যেকোনো/gi, 'Any'],
    [/যে কোনো/gi, 'Any'],
    [/লোকাল/gi, 'Local'],
    [/নাম্বার/gi, 'Number'],
    [/নাম্বারে/gi, 'Number'],
    [/সীমিত/gi, 'Limited'],
    [/অফুরন্ত/gi, 'Unlimited'],
    [/আনলিমিটেড/gi, 'Unlimited'],
    [/হবে/gi, 'will be'],
    [/এবং/gi, 'and'],
    [/পাবেন/gi, 'will get'],
    [/মাত্র/gi, 'Only'],
    [/সাথে/gi, 'with'],
    [/ফ্রি/gi, 'Free'],
  ];

  // Apply substitutions
  dictionary.forEach(([regex, replacement]) => {
    text = text.replace(regex, replacement);
  });

  const banglaToEnPhonetic: { [key: string]: string } = {
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'v', 'ম': 'm',
    'য': 'y', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ष': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y',
    'া': 'a', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
    'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
    'ৎ': 't', '্': ''
  };

  let phoneticText = '';
  for (let char of text) {
    if (banglaToEnPhonetic[char] !== undefined) {
      phoneticText += banglaToEnPhonetic[char];
    } else {
      phoneticText += char;
    }
  }

  // Clean up whitespace
  phoneticText = phoneticText.replace(/\s+/g, ' ').trim();

  // Capitalize words elegantly (First letter of each word)
  return phoneticText.split(' ').map(word => {
    if (!word) return '';
    if (word.toLowerCase() === 'gp') return 'GP';
    if (word.toLowerCase() === 'gb') return 'GB';
    if (word.toLowerCase() === 'mb') return 'MB';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function parseSmartOfferText(rawText: string, currentOperator: Operator): Partial<Omit<RechargePackage, 'id'>> {
  if (!rawText) return {};

  // Convert Bangla numbers in the whole string to English first for easier processing
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let englishText = rawText;
  for (let i = 0; i < 10; i++) {
    englishText = englishText.replace(new RegExp(banglaDigits[i], 'g'), englishDigits[i]);
  }

  // Normalize spaces and lower case for search
  const normalized = englishText.toLowerCase().replace(/\s+/g, ' ');

  // 1. Detect Operator
  let operator: Operator = currentOperator;
  if (normalized.includes('robi') || normalized.includes('রবি')) {
    operator = 'Robi';
  } else if (normalized.includes('gp') || normalized.includes('গ্রামীণ') || normalized.includes('জিপি') || normalized.includes('grameen')) {
    operator = 'GP';
  } else if (normalized.includes('airtel') || normalized.includes('এয়ারটেল') || normalized.includes('এয়ারটেল')) {
    operator = 'Airtel';
  } else if (normalized.includes('banglalink') || normalized.includes('bl') || normalized.includes('বাংলালিংক')) {
    operator = 'Banglalink';
  } else if (normalized.includes('teletalk') || normalized.includes('টেলিটক')) {
    operator = 'Teletalk';
  }

  const operatorNamesBn: Record<Operator, string> = {
    'GP': 'জিপি',
    'Robi': 'রবি',
    'Airtel': 'এয়ারটেল',
    'Banglalink': 'বাংলালিংক',
    'Teletalk': 'টেলিটক'
  };

  const operatorNameBn = operatorNamesBn[operator] || '';

  // 2. Extract Price
  let price = 0;
  // Match patterns like "টাকা: ৩১২", "টাকা : ১৬", "টাকা:১৫", "৳ ৩১২", "312 টাকা", "price: 312"
  const priceRegexes = [
    /(?:টাকা|৳|tk|price|টাকা\s*:\s*|টাকা\s*ঃ\s*|price\s*:\s*)\s*(\d+)/i,
    /(\d+)\s*(?:টাকা|৳|tk)/i,
    /(\d+)\s*$/m // last number in the line
  ];

  for (const regex of priceRegexes) {
    const match = englishText.match(regex);
    if (match && match[1]) {
      price = parseInt(match[1], 10);
      if (price > 0) break;
    }
  }

  // 3. Extract Validity
  let validityBn = '';
  // Match patterns like "মেয়াদ: ৩০ দিন", "মেয়াদ : ১ দিন", "মেয়াদ : ৩ দিন", "মেয়াদ:৩০ দিন"
  const validityRegex = /(?:মেয়াদ|validity)\s*[:ঃ]?\s*([^\n,৳]+)/i;
  const validityMatch = rawText.match(validityRegex);
  if (validityMatch && validityMatch[1]) {
    validityBn = validityMatch[1].trim();
  } else {
    // Fallback search for days/hours in rawText
    const daysMatch = rawText.match(/(\d+|[০-৯]+)\s*(?:দিন|day|days)/i);
    if (daysMatch) {
      validityBn = daysMatch[0].trim();
    } else {
      const hoursMatch = rawText.match(/(\d+|[০-৯]+)\s*(?:ঘণ্টা|ঘन्টা|hour|hours)/i);
      if (hoursMatch) {
        validityBn = hoursMatch[0].trim();
      }
    }
  }

  // Ensure validityBn is cleanly formatted
  validityBn = validityBn.replace(/টাকা.*/g, '').replace(/tk.*/gi, '').trim();

  // Translate validity to English
  const validity = translateBanglaToEnglish(validityBn);

  // 4. Extract Internet (GB/MB) and Minutes
  let internetBn = '';
  let minutesBn = '';
  let smsBn = '';

  // Find gb/mb
  // matches e.g. "১০ জিবি", "১ জিবি", "10 GB", "500 MB", "৫০০ এমবি"
  const internetRegex = /(\d+(?:\.\d+)?|[০-৯]+(?:\.[০-৯]+)?)\s*(?:জিবি|জি\.বি|জি বি|এমবি|এম\.বি|এম বি|gb|mb)/gi;
  const internetMatches = rawText.match(internetRegex);
  if (internetMatches) {
    internetBn = internetMatches.join(' + ');
  }

  // Find minutes
  // matches e.g. "৩৫০ মিনিট", "২৩ মিনিট", "350 minute", "23 min"
  const minutesRegex = /(\d+|[০-৯]+)\s*(?:মিনিট|মিঃ|min|mins|minute|minutes)/gi;
  const minutesMatches = rawText.match(minutesRegex);
  if (minutesMatches) {
    minutesBn = minutesMatches.join(' + ');
  }

  // Find SMS
  // matches e.g. "১০০ এসএমএস", "100 SMS"
  const smsRegex = /(\d+|[০-৯]+)\s*(?:এসএমএস|sms)/gi;
  const smsMatches = rawText.match(smsRegex);
  if (smsMatches) {
    smsBn = smsMatches.join(' + ');
  }

  // 5. Determine category and volumes
  let category: 'internet' | 'bundle' | 'talktime' = 'internet';
  let volumeBn = '';

  if (internetBn && minutesBn) {
    category = 'bundle';
    volumeBn = `${internetBn} + ${minutesBn}`;
    if (smsBn) {
      volumeBn += ` + ${smsBn}`;
    }
  } else if (minutesBn) {
    category = 'talktime';
    volumeBn = minutesBn;
  } else if (internetBn) {
    category = 'internet';
    volumeBn = internetBn;
  } else if (smsBn) {
    category = 'bundle';
    volumeBn = smsBn;
  } else {
    // Default fallback: parse the first part of the text up to "টাকা" or newline
    const firstLine = rawText.split('\n')[0].split(',')[0].split('টাকা')[0].trim();
    volumeBn = firstLine;
  }

  const volume = translateBanglaToEnglish(volumeBn);

  // 6. Build a beautiful descriptive title and description
  // Let's strip away "টাকা: ..." and "মেয়াদ: ..." from the raw text to make a clean descriptionBn
  let descriptionBn = rawText
    .replace(/(?:টাকা|৳|tk|price|মেয়াদ|validity)\s*[:ঃ]?\s*[^\n]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If there's multiple commas or trailing characters, clean them up
  descriptionBn = descriptionBn.replace(/^[,\s]+|[,\s]+$/g, '');

  if (!descriptionBn) {
    descriptionBn = `${volumeBn} মেয়াদ ${validityBn}`;
  }

  const description = translateBanglaToEnglish(descriptionBn);

  // Auto title builder
  // e.g. "রবি ১০ জিবি + ৩৫০ মিনিট (৩০ দিন)"
  let titleBn = `${operatorNameBn} ${volumeBn} (${validityBn})`;
  // Clean up any extra spaces
  titleBn = titleBn.replace(/\s+/g, ' ').trim();
  const title = translateBanglaToEnglish(titleBn);

  return {
    operator,
    price,
    validity,
    validityBn,
    volume,
    volumeBn,
    category,
    description,
    descriptionBn,
    title,
    titleBn
  };
}

interface AdminPanelProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
  onToggleUserView?: () => void;
}

export default function AdminPanel({ lang, isOpen, onClose, isStandalone = false, onToggleUserView }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'offers' | 'banners' | 'billers' | 'users' | 'settings' | 'support' | 'products' | 'orders' | 'sim_orders' | 'scratch' | 'kyc'>('requests');
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState<boolean>(true);
  const [userFilterTab, setUserFilterTab] = useState<'all' | 'verified' | 'pending_kyc' | 'suspended'>('all');
  const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);

  const initialReqLoadRef = useRef(true);
  const initialSupportLoadRef = useRef(true);
  const initialOrderLoadRef = useRef(true);

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    return localStorage.getItem('admin_voice_enabled') !== 'false';
  });

  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const speak = (text: string) => {
    if (!isVoiceEnabled) return;
    if ("speechSynthesis" in window) {
      try {
        // Cancel any pending speech to prevent queue build-up / silence
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Dynamically locate Bengali voice if available on the browser/device
        const voices = window.speechSynthesis.getVoices();
        const bnVoice = voices.find(v => v.lang.startsWith('bn'));
        if (bnVoice) {
          utterance.voice = bnVoice;
        }

        utterance.lang = "bn-BD";
        utterance.rate = 0.95;
        utterance.volume = 1.0;
        
        // Speak!
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Speech Synthesis Error:", err);
      }
    }
  };

  const formatBanglaAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '';
    const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    let text = String(amount);
    for (let i = 0; i < 10; i++) {
      text = text.replace(new RegExp(englishDigits[i], 'g'), banglaDigits[i]);
    }
    return `, পরিমাণ ${text} টাকা`;
  };
  // Store Management state variables
  const [adminProducts, setAdminProducts] = useState<StoreProduct[]>([]);
  const [adminOrders, setAdminOrders] = useState<StoreOrder[]>([]);
  const [productForm, setProductForm] = useState({
    title: '',
    titleBn: '',
    price: 0,
    stock: 0,
    description: '',
    descriptionBn: '',
    imageUrl: '',
    category: 'Lifestyle',
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [orderRejectReason, setOrderRejectReason] = useState('');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  
  // SIM Card order states
  const [adminSimOrders, setAdminSimOrders] = useState<any[]>([]);
  const [rejectingSimOrderId, setRejectingSimOrderId] = useState<string | null>(null);
  const [simOrderRejectReason, setSimOrderRejectReason] = useState('');

  // SIM Card Number Management states
  const [adminSimNumbers, setAdminSimNumbers] = useState<any[]>([]);
  const [simNumSubTab, setSimNumSubTab] = useState<'bookings' | 'numbers'>('bookings');
  const [editingSimNumId, setEditingSimNumId] = useState<string | null>(null);
  const [isSavingSimNum, setIsSavingSimNum] = useState(false);
  const [simNumForm, setSimNumForm] = useState({
    number: '',
    operator: 'GP' as Operator,
    type: 'Regular' as 'Regular' | 'VIP',
    status: 'Available' as 'Available' | 'Locked' | 'Booked',
    fullPrice: 150,
    bookingFee: 50
  });
  const [simNumbersSearchQuery, setSimNumbersSearchQuery] = useState('');

  const [simBookingOperatorFilter, setSimBookingOperatorFilter] = useState<string>('All');
  const [simBookingTypeFilter, setSimBookingTypeFilter] = useState<string>('All');
  const [simBookingStatusFilter, setSimBookingStatusFilter] = useState<string>('All');

  const [simNumberOperatorFilter, setSimNumberOperatorFilter] = useState<string>('All');
  const [simNumberTypeFilter, setSimNumberTypeFilter] = useState<string>('All');
  const [simNumberStatusFilter, setSimNumberStatusFilter] = useState<string>('All');

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
    referralBonus: 10,
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
          referralBonus: typeof data.referralBonus === 'number' ? data.referralBonus : 10,
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
  
  // Support Tickets States
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  
  // Scratch Cards Management State
  const [scratchCards, setScratchCards] = useState<any[]>([]);
  const [scratchForm, setScratchForm] = useState({
    operator: 'Grameenphone',
    title: '1 GB + 20 Min',
    price: 20,
    pin: '',
    validity: '২ দিন',
    dialCode: '*১২১*পিন#'
  });
  const [editingScratchId, setEditingScratchId] = useState<string | null>(null);
  const [isScanningPin, setIsScanningPin] = useState(false);
  
  // KYC management helpers
  const [rejectingKycUserId, setRejectingKycUserId] = useState<string | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState('');

  const handleApproveKyc = async (userId: string) => {
    if (!window.confirm(lang === 'bn' ? 'আপনি কি এই গ্রাহকের কেওয়াইসি এপ্রুভ করতে চান?' : 'Do you want to approve this user\'s KYC?')) return;
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', userId);
      const regUserRef = doc(db, 'registered_users', userId);
      
      const updateData = {
        kycStatus: 'verified',
        'kycData.verifiedAt': new Date().toISOString()
      };
      
      batch.update(userRef, updateData);
      batch.update(regUserRef, updateData);
      
      await batch.commit();
      alert(lang === 'bn' ? 'কেওয়াইসি সফলভাবে এপ্রুভ করা হয়েছে!' : 'KYC successfully approved!');
    } catch (err) {
      console.error("Error approving KYC:", err);
      alert('Error: ' + err);
    }
  };

  const handleRejectKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingKycUserId || !kycRejectReason) return;
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', rejectingKycUserId);
      const regUserRef = doc(db, 'registered_users', rejectingKycUserId);
      
      const updateData = {
        kycStatus: 'rejected',
        'kycData.rejectionReason': kycRejectReason
      };
      
      batch.update(userRef, updateData);
      batch.update(regUserRef, updateData);
      
      await batch.commit();
      setRejectingKycUserId(null);
      setKycRejectReason('');
      alert(lang === 'bn' ? 'কেওয়াইসি বাতিল করা হয়েছে।' : 'KYC rejected.');
    } catch (err) {
      console.error("Error rejecting KYC:", err);
      alert('Error: ' + err);
    }
  };
  
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
  const [smartText, setSmartText] = useState<string>('');

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
      if (!initialReqLoadRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as Transaction;
            if (data.status === 'Pending') {
              let msg = 'নতুন রিকোয়েস্ট এসেছে';
              if (data.type === 'CashIn') {
                msg = 'নতুন অ্যাড ফান্ড রিকোয়েস্ট এসেছে';
              } else if (data.type === 'Recharge') {
                msg = 'নতুন ফ্লেক্সিলোড রিকোয়েস্ট এসেছে';
              } else if (data.type === 'Bill') {
                msg = 'নতুন বিল পে রিকোয়েস্ট এসেছে';
              } else if (data.type === 'Voucher') {
                msg = 'নতুন গেমিং ভাউচার রিকোয়েস্ট এসেছে';
              } else if (data.type === 'Transfer') {
                msg = 'নতুন ব্যালেন্স ট্রান্সফার রিকোয়েস্ট এসেছে';
              }
              const amtStr = formatBanglaAmount(data.amount);
              speak(`${msg}${amtStr}`);
            }
          }
        });
      }

      const list: Transaction[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id } as Transaction);
      });
      setPendingRequests(list);

      if (initialReqLoadRef.current) {
        initialReqLoadRef.current = false;
      }
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

  // 3.1 Listen for scratch cards
  useEffect(() => {
    const q = collection(db, 'scratch_cards');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() });
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setScratchCards(list);
    }, (error) => {
      console.error("Error loading scratch cards inside admin panel: ", error);
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

  // 5b. Listen for support_tickets list
  useEffect(() => {
    const q = collection(db, 'support_tickets');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialSupportLoadRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
             speak('নতুন সাপোর্ট টিকিট এসেছে');
          } else if (change.type === 'modified') {
             const data = change.doc.data();
             if (data.lastMessageSender === 'user' && data.status === 'Open') {
                speak('সাপোর্ট টিকিটে নতুন মেসেজ এসেছে');
             }
          }
        });
      }

      const list: any[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id });
      });
      // Sort in-memory to prevent requiring composite index creation in emulator or firebase console
      list.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
      setSupportTickets(list);

      if (initialSupportLoadRef.current) {
         initialSupportLoadRef.current = false;
      }
    }, (error) => {
      console.error("Error loading support tickets: ", error);
    });

    return () => unsubscribe();
  }, []);

  // 5c. Listen for store products list
  useEffect(() => {
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: StoreProduct[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id } as StoreProduct);
      });
      setAdminProducts(list);
    }, (error) => {
      console.error("Error loading products in admin panel: ", error);
    });

    return () => unsubscribe();
  }, []);

  // 5d. Listen for store orders list
  useEffect(() => {
    const q = collection(db, 'store_orders');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialOrderLoadRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
             const data = change.doc.data() as StoreOrder;
             if (data.status === 'Pending') {
                 const amtStr = formatBanglaAmount(data.totalPrice);
                 speak(`দোকানের নতুন অর্ডারের রিকোয়েস্ট এসেছে${amtStr}`);
             }
          }
        });
      }

      const list: StoreOrder[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id } as StoreOrder);
      });
      // Sort in-memory descending by date
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAdminOrders(list);

      if (initialOrderLoadRef.current) {
         initialOrderLoadRef.current = false;
      }
    }, (error) => {
      console.error("Error loading orders in admin panel: ", error);
    });

    return () => unsubscribe();
  }, []);

  // 5e. Listen for SIM card orders
  useEffect(() => {
    const q = collection(db, 'sim_orders');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id });
      });
      // Sort in-memory descending by date
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAdminSimOrders(list);
    }, (error) => {
      console.error("Error loading SIM orders in admin panel: ", error);
    });

    return () => unsubscribe();
  }, []);

  // 5f. Listen for SIM numbers
  useEffect(() => {
    const q = collection(db, 'sim_numbers');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((snap) => {
        list.push({ ...snap.data(), id: snap.id });
      });
      setAdminSimNumbers(list);
    }, (error) => {
      console.error("Error loading SIM numbers in admin panel: ", error);
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
        const userProfileRef = doc(db, 'registered_users', tx.userId);
        
        const [balanceSnap, profileSnap] = await Promise.all([
          getDoc(balanceDocRef),
          getDoc(userProfileRef)
        ]);
        
        let curBalance = 0;
        let curGiven = 0;
        if (balanceSnap.exists()) {
          curBalance = balanceSnap.data().balance || 0;
        }
        if (profileSnap.exists()) {
          curGiven = parseFloat(profileSnap.data().totalGiven + '') || 0;
        }
        
        const newBalance = curBalance + tx.amount;
        batch.set(balanceDocRef, { balance: newBalance });
        batch.set(userProfileRef, { balance: newBalance, totalGiven: curGiven + tx.amount }, { merge: true });

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
        // For Recharge, Bill, Transfer, and Voucher, the balance is docked immediately during request creation.
        // So upon approval, we simply notify the user of transaction execution.
        const notifId = `notif-${Date.now()}`;
        const notifRef = doc(db, 'users', tx.userId, 'notifications', notifId);
        let detailText = '';
        let detailTextBn = '';
        let title = '';
        let titleBn = '';

        if (tx.type === 'Recharge') {
          detailText = `Your recharge of ৳${tx.amount} to ${tx.targetNumber} has been approved.`;
          detailTextBn = `আপনার ${tx.targetNumber} নম্বরে ৳${tx.amount} টাকা রিচার্জের অনুরোধ সফল হয়েছে।`;
          title = 'Recharge Approved';
          titleBn = 'রিচার্জ অনুমোদিত';
        } else if (tx.type === 'Transfer') {
          detailText = `Your transfer of ৳${tx.amount} to ${tx.transferMethod} (${tx.targetNumber}) has been approved.`;
          detailTextBn = `আপনার ${tx.transferMethod} নম্বরে (${tx.targetNumber}) ৳${tx.amount} টাকা ট্রান্সফারের অনুরোধ অনুমোদিত হয়েছে।`;
          title = 'Transfer Approved';
          titleBn = 'ট্রান্সফার অনুমোদিত';
        } else if (tx.type === 'Voucher') {
          detailText = `Your purchase of ${tx.voucherItem} (${tx.voucherCode}) for ৳${tx.amount} has been approved and delivered.`;
          detailTextBn = `আপনার ${tx.voucherItem} (${tx.voucherCode}) এর ৳${tx.amount} টাকার ভাউচার অনুরোধটি সফলভাবে ডেলিভারি করা হয়েছে।`;
          title = 'Voucher Delivered';
          titleBn = 'ভাউচার ডেলিভারি সফল';
        } else {
          detailText = `Your payment of ৳${tx.amount} to ${tx.billerName} has been approved.`;
          detailTextBn = `আপনার ${tx.billerNameBn} বিলে ৳${tx.amount} টাকা ফি পরিশোধ অনুমোদিত হয়েছে।`;
          title = 'Bill Approved';
          titleBn = 'বিল পরিশোধ অনুমোদিত';
        }

        batch.set(notifRef, {
          id: notifId,
          title,
          titleBn,
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

      // If Recharge, Bill, Transfer, or Voucher, refund docked user balance
      if (tx.type === 'Recharge' || tx.type === 'Bill' || tx.type === 'Transfer' || tx.type === 'Voucher') {
        const balanceDocRef = doc(db, 'users', tx.userId, 'wallet', 'balance_doc');
        const userProfileRef = doc(db, 'registered_users', tx.userId);
        const balanceSnap = await getDoc(balanceDocRef);
        let curBalance = 0;
        if (balanceSnap.exists()) {
          curBalance = balanceSnap.data().balance || 0;
        }
        const newBalance = curBalance + tx.amount;
        batch.set(balanceDocRef, { balance: newBalance });
        batch.set(userProfileRef, { balance: newBalance }, { merge: true });
      }

      // Send rejection notification
      const notifId = `notif-${Date.now()}`;
      const notifRef = doc(db, 'users', tx.userId, 'notifications', notifId);
      
      let title = '';
      let titleBn = '';
      let desc = '';
      let descBn = '';

      if (tx.type === 'CashIn') {
        title = 'Deposit Rejected';
        titleBn = 'টাকা যোগ প্রত্যাখ্যাত';
        desc = `Your deposit request of ৳${tx.amount} has been declined. Reason: ${rejectReason}`;
        descBn = `আপনার ৳${tx.amount} টাকা যোগের অনুরোধ বাতিল করা হয়েছে। কারণ: ${rejectReason}`;
      } else if (tx.type === 'Recharge') {
        title = 'Recharge Rejected';
        titleBn = 'রিচার্জ প্রত্যাখ্যাত';
        desc = `Your mobile recharge of ৳${tx.amount} has been declined. Reason: ${rejectReason}`;
        descBn = `আপনার ৳${tx.amount} টাকা রিচার্জের অনুরোধ বাতিল করা হয়েছে। কারণ: ${rejectReason}`;
      } else if (tx.type === 'Transfer') {
        title = 'Transfer Rejected';
        titleBn = 'ট্রান্সফার প্রত্যাখ্যাত';
        desc = `Your transfer of ৳${tx.amount} has been declined. Reason: ${rejectReason}`;
        descBn = `আপনার ৳${tx.amount} টাকা ট্রান্সফারের অনুরোধ বাতিল করা হয়েছে। কারণ: ${rejectReason}`;
      } else if (tx.type === 'Voucher') {
        title = 'Voucher Rejected';
        titleBn = 'ভাউচার অনুরোধ প্রত্যাখ্যাত';
        desc = `Your voucher purchase of ${tx.voucherItem} for ৳${tx.amount} has been declined. Reason: ${rejectReason}`;
        descBn = `আপনার ${tx.voucherItem} এর ৳${tx.amount} টাকার ভাউচার অনুরোধ বাতিল করা হয়েছে। কারণ: ${rejectReason}`;
      } else {
        title = 'Bill Rejected';
        titleBn = 'বিল পরিশোধ প্রত্যাখ্যাত';
        desc = `Your bill payment of ৳${tx.amount} has been declined. Reason: ${rejectReason}`;
        descBn = `আপনার ৳${tx.amount} টাকার বিল পরিশোধ অনুরোধ বাতিল করা হয়েছে। কারণ: ${rejectReason}`;
      }

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
      setSmartText('');
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
    setSmartText('');
    setOfferForm({
      title: pkg.title || '',
      titleBn: pkg.titleBn || '',
      operator: pkg.operator || 'GP',
      price: pkg.price || 0,
      validity: pkg.validity || '',
      validityBn: pkg.validityBn || '',
      category: pkg.category || 'internet',
      volume: pkg.volume || '',
      volumeBn: pkg.volumeBn || '',
      description: pkg.description || '',
      descriptionBn: pkg.descriptionBn || '',
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
      title: ban.title || '',
      titleEn: ban.titleEn || '',
      desc: ban.desc || '',
      descEn: ban.descEn || '',
      operator: ban.operator || 'GP',
      prefillAmount: ban.prefillAmount || 0,
      gradient: ban.gradient || '',
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
      name: biller.name || '',
      nameBn: biller.nameBn || '',
      category: biller.category || 'Electricity',
      categoryBn: biller.categoryBn || 'বিদ্যুৎ',
      logoColor: biller.logoColor || 'bg-blue-600',
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

  // ---------------- MEGA STORE PRODUCT MANAGEMENT ----------------
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);
    try {
      const prodId = editingProductId || `prod-${Date.now()}`;
      const docRef = doc(db, 'products', prodId);
      
      const catsBn: Record<string, string> = {
        Lifestyle: 'লাইফস্টাইল',
        Digital: 'ডিজিটাল সার্ভিস',
        Electronics: 'ইলেকট্রনিক্স',
        Services: 'সেবাসমূহ',
        Other: 'অন্যান্য'
      };

      const newProduct: StoreProduct = {
        id: prodId,
        title: productForm.title,
        titleBn: productForm.titleBn,
        price: Number(productForm.price) || 0,
        stock: Number(productForm.stock) || 0,
        description: productForm.description,
        descriptionBn: productForm.descriptionBn,
        imageUrl: productForm.imageUrl,
        category: productForm.category,
        categoryBn: catsBn[productForm.category] || 'অন্যান্য',
      };

      await setDoc(docRef, newProduct);

      setEditingProductId(null);
      setProductForm({
        title: '',
        titleBn: '',
        price: 0,
        stock: 0,
        description: '',
        descriptionBn: '',
        imageUrl: '',
        category: 'Lifestyle',
      });
    } catch (err) {
      console.error("Error saving product: ", err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleEditProduct = (prod: StoreProduct) => {
    setEditingProductId(prod.id);
    setProductForm({
      title: prod.title || '',
      titleBn: prod.titleBn || '',
      price: prod.price || 0,
      stock: prod.stock || 0,
      description: prod.description || '',
      descriptionBn: prod.descriptionBn || '',
      imageUrl: prod.imageUrl || '',
      category: prod.category || 'Lifestyle',
    });
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (confirm(lang === 'bn' ? 'আপনি কি নিশ্চিতভাবে এই প্রোডাক্টটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', prodId));
      } catch (err) {
        console.error("Error deleting product:", err);
      }
    }
  };

  // ---------------- STORE ORDERS MANAGEMENT ----------------
  const handleApproveOrder = async (order: StoreOrder) => {
    if (isProcessing) return;
    setIsProcessing(order.id);
    try {
      const batch = writeBatch(db);

      // 1. Update order status to Approved (Delivered)
      batch.update(doc(db, 'store_orders', order.id), { status: 'Approved' });

      // 2. Add customer notifications
      const addedNotifId = `notif-appr-${Date.now()}`;
      const addedNotif = {
        id: addedNotifId,
        title: lang === 'bn' ? 'অর্ডার ডেলিভারড' : 'Order Delivered',
        titleBn: 'অর্ডারটি সম্পন্ন হয়েছে',
        desc: `Your order for ${order.productTitle} (x${order.quantity}) has been approved and delivered!`,
        descBn: `আপনার ${order.productTitleBn} (x${order.quantity}) অর্ডারের অনুরোধটি সফলভাবে অনুমোদিত এবং ডেলিভার করা হয়েছে!`,
        time: 'Just now',
        read: false,
      };
      batch.set(doc(db, 'users', order.userId, 'notifications', addedNotifId), addedNotif);

      // 3. Update status to Approved inside the user's transactions array
      const timestampPart = order.id.replace('order-', '');
      const txDocId = `tx-store-${timestampPart}`;
      
      batch.update(doc(db, 'users', order.userId, 'transactions', txDocId), { status: 'Approved' });

      await batch.commit();
    } catch (err) {
      console.error("Error approving order:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectOrder = async (order: StoreOrder, reason: string) => {
    if (isProcessing) return;
    if (!reason.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে রিজেক্ট করার কারণ লিখুন।' : 'Please enter rejection reason.');
      return;
    }
    setIsProcessing(order.id);
    try {
      const batch = writeBatch(db);

      // 1. Update order status to Rejected with reason
      batch.update(doc(db, 'store_orders', order.id), { 
        status: 'Rejected',
        rejectionReason: reason
      });

      // 2. Refund user's balance
      const userBalanceDocRef = doc(db, 'users', order.userId, 'wallet', 'balance_doc');
      const userProfileRef = doc(db, 'registered_users', order.userId);
      const userBalanceSnap = await getDoc(userBalanceDocRef);
      if (userBalanceSnap.exists()) {
        const currentBal = userBalanceSnap.data().balance || 0;
        const refundedBal = currentBal + order.totalPrice;
        batch.set(userBalanceDocRef, { balance: refundedBal });
        batch.set(userProfileRef, { balance: refundedBal }, { merge: true });
      }

      // 3. Return product stock
      const prodDocRef = doc(db, 'products', order.productId);
      const prodSnap = await getDoc(prodDocRef);
      if (prodSnap.exists()) {
        const currentStock = prodSnap.data().stock || 0;
        batch.update(prodDocRef, { stock: currentStock + order.quantity });
      }

      // 4. Update transaction status
      const timestampPart = order.id.replace('order-', '');
      const txDocId = `tx-store-${timestampPart}`;
      batch.update(doc(db, 'users', order.userId, 'transactions', txDocId), { 
        status: 'Rejected',
        rejectionReason: reason
      });

      // 5. Add customer notification
      const addedNotifId = `notif-rej-${Date.now()}`;
      const addedNotif = {
        id: addedNotifId,
        title: lang === 'bn' ? 'অর্ডার বাতিল' : 'Order Rejected',
        titleBn: 'অর্ডার বাতিল এবং রিফান্ড',
        desc: `Your order for ${order.productTitle} has been rejected. Reason: ${reason}. Refunded ৳${order.totalPrice} to your wallet.`,
        descBn: `আপনার ${order.productTitleBn} অর্ডারের অনুরোধটি বাতিল করা হয়েছে। কারণ: ${reason}। আপনার ওয়ালেটে ৳${order.totalPrice} টাকা ফেরত দেওয়া হয়েছে।`,
        time: 'Just now',
        read: false,
      };
      batch.set(doc(db, 'users', order.userId, 'notifications', addedNotifId), addedNotif);

      await batch.commit();
      setRejectingOrderId(null);
      setOrderRejectReason('');
    } catch (err) {
      console.error("Error rejecting order:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  // ---------------- SIM CARD ORDERS MANAGEMENT ----------------
  const handleApproveSimOrder = async (order: any) => {
    if (isProcessing) return;
    setIsProcessing(order.id);
    try {
      const batch = writeBatch(db);

      // 1. Update order status to Approved (Shipped)
      batch.update(doc(db, 'sim_orders', order.id), { status: 'Approved' });

      // 2. Add customer notifications
      const addedNotifId = `notif-sim-appr-${Date.now()}`;
      const addedNotif = {
        id: addedNotifId,
        title: lang === 'bn' ? 'সিম কার্ড ডেলিভারি অনুমোদিত' : 'SIM Order Shipped',
        titleBn: 'সিম কার্ডের আবেদনটি সম্পন্ন হয়েছে',
        desc: `Your SIM order for ${order.operator} (${order.chosenNumber}) has been approved and shipped for biometric handoff!`,
        descBn: `আপনার ${order.operator} সিম কার্ডের (${order.chosenNumber}) আবেদনটি সফলভাবে অনুমোদিত এবং বায়োমেট্রিক হ্যান্ডওভারের জন্য পাঠানো হয়েছে!`,
        time: 'Just now',
        read: false,
      };
      batch.set(doc(db, 'users', order.userId, 'notifications', addedNotifId), addedNotif);

      // 3. Update status to Approved inside the user's transactions array
      const timestampPart = order.id.replace('sim-', '');
      const txDocId = `tx-sim-${timestampPart}`;
      
      batch.update(doc(db, 'users', order.userId, 'transactions', txDocId), { status: 'Approved' });

      await batch.commit();
      speak(lang === 'bn' ? 'সিম কার্ডের অর্ডার সফলভাবে সম্পন্ন হয়েছে' : 'SIM card order successfully approved');
    } catch (err) {
      console.error("Error approving SIM order:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectSimOrder = async (order: any, reason: string) => {
    if (isProcessing) return;
    if (!reason.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে রিজেক্ট করার কারণ লিখুন।' : 'Please enter rejection reason.');
      return;
    }
    setIsProcessing(order.id);
    try {
      const batch = writeBatch(db);

      // 1. Update order status to Rejected with reason
      batch.update(doc(db, 'sim_orders', order.id), { 
        status: 'Rejected',
        rejectionReason: reason
      });

      // Refund amount is bookingFee if present, otherwise totalCost
      const refundAmt = typeof order.bookingFee === 'number' ? order.bookingFee : (order.totalCost || 0);

      // 2. Refund user's balance
      const userBalanceDocRef = doc(db, 'users', order.userId, 'wallet', 'balance_doc');
      const userProfileRef = doc(db, 'registered_users', order.userId);
      const userBalanceSnap = await getDoc(userBalanceDocRef);
      if (userBalanceSnap.exists()) {
        const currentBal = userBalanceSnap.data().balance || 0;
        const refundedBal = currentBal + refundAmt;
        batch.set(userBalanceDocRef, { balance: refundedBal });
        batch.set(userProfileRef, { balance: refundedBal }, { merge: true });
      }

      // 3. Update transaction status
      const timestampPart = order.id.replace('sim-', '');
      const txDocId = `tx-sim-${timestampPart}`;
      batch.update(doc(db, 'users', order.userId, 'transactions', txDocId), { 
        status: 'Rejected',
        rejectionReason: reason
      });

      // 4. Update the SIM number status back to Available if applicable
      if (order.numberDocId) {
        batch.update(doc(db, 'sim_numbers', order.numberDocId), { status: 'Available' });
      }

      // 5. Add customer notification
      const addedNotifId = `notif-sim-rej-${Date.now()}`;
      const addedNotif = {
        id: addedNotifId,
        title: lang === 'bn' ? 'সিম অর্ডার বাতিল' : 'SIM Order Rejected',
        titleBn: 'সিম অর্ডার বাতিল এবং রিফান্ড',
        desc: `Your SIM order for ${order.operator} has been rejected. Reason: ${reason}. Refunded ৳${refundAmt} to your wallet.`,
        descBn: `আপনার ${order.operator} সিম কার্ডের আবেদনটি বাতিল করা হয়েছে। কারণ: ${reason}। আপনার ওয়ালেটে ৳${refundAmt} টাকা ফেরত দেওয়া হয়েছে।`,
        time: 'Just now',
        read: false,
      };
      batch.set(doc(db, 'users', order.userId, 'notifications', addedNotifId), addedNotif);

      await batch.commit();
      setRejectingSimOrderId(null);
      setSimOrderRejectReason('');
    } catch (err) {
      console.error("Error rejecting SIM order:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  // ---------------- SIM NUMBERS MANAGEMENT CRUD ----------------
  const handleSaveSimNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simNumForm.number.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে নম্বরটি লিখুন!' : 'Please enter the SIM number!');
      return;
    }
    setIsSavingSimNum(true);
    try {
      const docId = editingSimNumId || `sim-num-${Date.now()}`;
      const docRef = doc(db, 'sim_numbers', docId);
      await setDoc(docRef, {
        id: docId,
        number: simNumForm.number.trim(),
        operator: simNumForm.operator,
        type: simNumForm.type,
        status: simNumForm.status,
        fullPrice: Number(simNumForm.fullPrice) || 150,
        bookingFee: Number(simNumForm.bookingFee) || 50
      }, { merge: true });

      alert(lang === 'bn' ? 'সিম নম্বর সফলভাবে সংরক্ষিত হয়েছে!' : 'SIM Number successfully saved!');
      setEditingSimNumId(null);
      setSimNumForm(prev => ({
        ...prev,
        number: '',
        status: 'Available'
      }));
    } catch (err: any) {
      console.error("Error saving SIM number:", err);
      alert("Error: " + err.message);
    } finally {
      setIsSavingSimNum(false);
    }
  };

  const handleDeleteSimNumber = async (numId: string) => {
    if (!confirm(lang === 'bn' ? 'আপনি কি নিশ্চিতভাবে এই নম্বরটি ডিলিট করতে চান?' : 'Are you sure you want to delete this SIM number?')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'sim_numbers', numId));
      alert(lang === 'bn' ? 'সিম নম্বর সফলভাবে ডিলিট হয়েছে!' : 'SIM Number successfully deleted!');
    } catch (err: any) {
      console.error("Error deleting SIM number:", err);
      alert("Error: " + err.message);
    }
  };

  const handleToggleSimNumberStatus = async (numberObj: any) => {
    const nextStatus = numberObj.status === 'Locked' ? 'Available' : 'Locked';
    try {
      await setDoc(doc(db, 'sim_numbers', numberObj.id), { status: nextStatus }, { merge: true });
    } catch (err: any) {
      console.error("Error toggling SIM number status:", err);
    }
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
      let addedAmount = 0;
      
      if (userBalanceAdjustType === 'increment') {
        newBalance += amount;
        addedAmount = amount;
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
        if (amount > selectedUserBalance) {
          addedAmount = amount - selectedUserBalance;
        }
        newBalance = amount;
        typeText = 'Balance Set by Admin';
        typeTextBn = 'অ্যাডমিন কর্তৃক ব্যালেন্স সেট করা হয়েছে';
      }

      const batch = writeBatch(db);

      // 1. Update wallet balance
      const balanceRef = doc(db, 'users', selectedUser.uid, 'wallet', 'balance_doc');
      batch.set(balanceRef, { balance: newBalance });
      
      // Update the user's profile with new balance and totalGiven tracker
      const currentGiven = parseFloat(selectedUser.totalGiven + '') || 0;
      const newTotalGiven = currentGiven + addedAmount;
      const userProfileRef = doc(db, 'registered_users', selectedUser.uid);
      batch.set(userProfileRef, { balance: newBalance, totalGiven: newTotalGiven }, { merge: true });

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
      <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-black">
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

  const handleScanPin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningPin(true);
    try {
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text;
      const digits = text.replace(/\D/g, '');
      if (digits.length > 0) {
        setScratchForm(prev => ({ ...prev, pin: digits }));
        alert(lang === 'bn' ? 'স্ক্যান সফল হয়েছে!' : 'PIN extracted successfully!');
      } else {
        alert(lang === 'bn' ? 'পিন নম্বর খুঁজে পাওয়া যায়নি!' : 'Could not find PIN in image.');
      }
    } catch (err: any) {
      console.error(err);
      alert('OCR Error: ' + err.message);
    }
    setIsScanningPin(false);
  };

  const handleSaveScratchCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scratchForm.pin) {
      alert(lang === 'bn' ? 'পিন নম্বর দিন' : 'Enter PIN number');
      return;
    }
    setLoading(true);
    try {
      if (editingScratchId) {
        const cardRef = doc(db, 'scratch_cards', editingScratchId);
        await updateDoc(cardRef, scratchForm);
        setEditingScratchId(null);
      } else {
        const id = 'sc-' + Date.now();
        const cardRef = doc(db, 'scratch_cards', id);
        await setDoc(cardRef, {
          ...scratchForm,
          status: 'available',
          createdAt: Date.now()
        });
      }
      setScratchForm({
        operator: 'Grameenphone',
        title: '1 GB + 20 Min',
        price: 20,
        pin: '',
        validity: '২ দিন',
        dialCode: '*১২১*পিন#'
      });
      alert(lang === 'bn' ? 'স্ক্র্যাচ কার্ড সফলভাবে সংরক্ষিত হয়েছে' : 'Scratch card successfully saved!');
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleEditScratchCard = (card: any) => {
    setScratchForm({
      operator: card.operator || 'Grameenphone',
      title: card.title || '',
      price: card.price || 0,
      pin: card.pin || '',
      validity: card.validity || '২ দিন',
      dialCode: card.dialCode || '*১২১*পিন#'
    });
    setEditingScratchId(card.id);
  };

  const handleDeleteScratchCard = async (id: string) => {
    if (window.confirm(lang === 'bn' ? 'মুছে ফেলতে চান?' : 'Delete this scratch card?')) {
      try {
        await deleteDoc(doc(db, 'scratch_cards', id));
      } catch (err: any) {
        alert('Error: ' + err.message);
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = editingUserId || `user-${Date.now()}`;
      const userRef = doc(db, 'registered_users', uid);
      const balanceRef = doc(db, 'users', uid, 'wallet', 'balance_doc');
      const userProfileRef = doc(db, 'users', uid);
      
      const batch = writeBatch(db);
      
      const profileData = {
        uid,
        displayName: userForm.displayName,
        phone: userForm.phone,
        email: userForm.email || (userForm.phone ? `${userForm.phone}@nihat-telecom.com` : `${uid}@nihat-telecom.com`),
      };

      // Save/update registered_users profile doc
      batch.set(userRef, {
        ...profileData,
        lastActive: new Date().toISOString()
      }, { merge: true });
      
      // Save/update users profile doc directly (sync user client data)
      batch.set(userProfileRef, profileData, { merge: true });

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

  const handleToggleUserBan = async (uid: string, currentlyBanned: boolean) => {
    const actionText = currentlyBanned ? (lang === 'bn' ? 'সক্রিয়' : 'Unban') : (lang === 'bn' ? 'স্থগিত' : 'Ban');
    if (!window.confirm(lang === 'bn' ? `আপনি কি এই ব্যবহারকারীকে ${actionText} করতে চান?` : `Are you sure you want to ${actionText} this user?`)) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', uid);
      const regUserRef = doc(db, 'registered_users', uid);
      
      const updateData = { isBanned: !currentlyBanned };
      batch.update(userRef, updateData);
      batch.update(regUserRef, updateData);
      
      await batch.commit();
      
      // Update selectedUser local state too if selected
      if (selectedUser && selectedUser.uid === uid) {
        setSelectedUser({ ...selectedUser, isBanned: !currentlyBanned });
      }
      
      alert(lang === 'bn' ? `ব্যবহারকারী সফলভাবে ${currentlyBanned ? 'সক্রিয়' : 'স্থগিত'} করা হয়েছে!` : `User account has been successfully ${currentlyBanned ? 'activated' : 'suspended'}!`);
    } catch (err: any) {
      console.error("Error toggling user ban status: ", err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
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

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTicketId) return;
    
    const ticketRef = doc(db, 'support_tickets', selectedTicketId);
    const ticketDoc = supportTickets.find(t => t.id === selectedTicketId);
    if (!ticketDoc) return;
    
    const newMessage = {
      id: 'msg-' + Date.now(),
      senderId: 'admin',
      senderName: 'Admin Operations Panel',
      text: adminReplyText.trim(),
      time: Date.now()
    };
    
    const updatedMessages = [...(ticketDoc.messages || []), newMessage];
    
    try {
      await setDoc(ticketRef, {
        messages: updatedMessages,
        lastMessageText: newMessage.text,
        lastMessageSender: 'admin',
        lastMessageTime: newMessage.time,
        status: 'Open' // auto re-open if admin replies
      }, { merge: true });
      
      setAdminReplyText('');
    } catch (err) {
      console.error("Error sending admin reply: ", err);
    }
  };

  const handleToggleTicketStatus = async (ticketId: string) => {
    const ticketRef = doc(db, 'support_tickets', ticketId);
    const ticketDoc = supportTickets.find(t => t.id === ticketId);
    if (!ticketDoc) return;
    
    const newStatus = ticketDoc.status === 'Closed' ? 'Open' : 'Closed';
    
    try {
      await updateDoc(ticketRef, {
        status: newStatus
      });
    } catch (err) {
      console.error("Error updating ticket status: ", err);
    }
  };

  const adminTabsList = [
    { id: 'requests' as const, label: labels.requests, icon: Layers, badge: pendingRequests.filter(r => r.status === 'Pending').length, badgeColor: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
    { id: 'offers' as const, label: labels.offers, icon: Gift, badge: offers.length, badgeColor: 'bg-white/5 text-slate-400 border border-white/5' },
    { id: 'banners' as const, label: labels.banners, icon: Sparkles, badge: banners.length, badgeColor: 'bg-white/5 text-slate-400 border border-white/5' },
    { id: 'billers' as const, label: labels.billers, icon: CreditCard, badge: billers.length, badgeColor: 'bg-white/5 text-slate-400 border border-white/5' },
    { id: 'users' as const, label: labels.users, icon: User, badge: registeredUsers.length, badgeColor: 'bg-white/5 text-slate-400 border border-white/5' },
    { id: 'products' as const, label: lang === 'bn' ? 'স্টোর প্রোডাক্টস' : 'Manage Products', icon: Globe, badge: adminProducts.length, badgeColor: 'bg-white/5 text-slate-400 border border-white/5' },
    { id: 'orders' as const, label: lang === 'bn' ? 'স্টোর অর্ডার্স' : 'Store Orders', icon: ShoppingBag, badge: adminOrders.filter(o => o.status === 'Pending').length, badgeColor: 'bg-rose-500/15 text-rose-400 border border-rose-500/25' },
    { id: 'sim_orders' as const, label: lang === 'bn' ? 'সিম অর্ডার্স' : 'SIM Orders', icon: Smartphone, badge: adminSimOrders.filter(s => s.status === 'Pending').length, badgeColor: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25' },
    { id: 'scratch' as const, label: lang === 'bn' ? 'স্ক্র্যাচ কার্ড' : 'Scratch Cards', icon: Smartphone, badge: scratchCards.length, badgeColor: 'bg-white/5 text-slate-400 border border-white/5' },
    { id: 'kyc' as const, label: lang === 'bn' ? 'কেওয়াইসি ভেরিফিকেশন' : 'KYC Verification', icon: ShieldCheck, badge: registeredUsers.filter(u => u.kycStatus === 'pending').length, badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' },
    { id: 'support' as const, label: lang === 'bn' ? 'গ্রাহক সাপোর্ট চ্যাট' : 'Support Tickets', icon: MessageSquare, badge: supportTickets.filter(t => t.status === 'Open').length, badgeColor: 'bg-blue-500/15 text-blue-400 border border-blue-500/25' },
    { id: 'settings' as const, label: lang === 'bn' ? 'সিস্টেম সেটিংস' : 'System Settings', icon: Settings, badge: 0, badgeColor: '' },
  ];

  const adminPanelBody = (
    <>
      <div className={isFullScreen || isStandalone ? "w-full h-full bg-slate-950 flex flex-col lg:flex-row relative overflow-hidden text-slate-100 font-sans" : "relative bg-slate-900/85 backdrop-blur-2xl w-full h-full lg:h-[90%] lg:max-w-6xl rounded-none lg:rounded-[36px] shadow-2xl border-none lg:border lg:border-white/10 flex flex-col lg:flex-row relative z-10 overflow-hidden text-slate-100 animate-scale-up font-sans"}>
      
      {/* Dynamic Ambient Blur Spheres */}
      <div className="absolute top-[-50px] right-[-50px] w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none select-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none select-none" />

      {/* 1. DESKTOP PERMANENT SIDEBAR */}
      <div className="hidden lg:flex flex-col w-72 bg-slate-950/70 border-r border-white/10 h-full shrink-0 relative z-20 overflow-hidden">
        {/* Left header with elite status panel */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3.5 bg-slate-950/40">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 border border-blue-400/30 ring-4 ring-blue-500/10 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-extrabold text-sm tracking-tight truncate uppercase leading-none">
              {labels.title}
            </h2>
            <p className="text-[9px] text-blue-400 font-black font-mono tracking-widest mt-1.5 uppercase truncate">
              {isStandalone ? "HARDENED ADM SYSTEM" : "SANDBOX SECURE ADM"}
            </p>
          </div>
        </div>

        {/* Scrollable vertical navigation of tabs */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5 scroller-hidden">
          {adminTabsList.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id);
                  if (tab.id === 'users') {
                    setSelectedUser(null);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[11.5px] font-bold tracking-wide transition-all duration-200 cursor-pointer text-left border relative group ${
                  isTabActive 
                    ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-600/20 border-blue-500/20' 
                    : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                }`}
              >
                {/* Visual active tab left accent bar */}
                {isTabActive && (
                  <div className="absolute left-1.5 top-3 bottom-3 w-1 bg-white rounded-full" />
                )}
                
                <div className="flex items-center gap-3 min-w-0">
                  <TabIcon className={`h-4 w-4 shrink-0 transition-colors ${isTabActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </div>

                {tab.badge > 0 && (
                  <span className={`text-[9px] font-extrabold tracking-tight px-2 py-0.5 rounded-lg border font-mono ${
                    isTabActive ? 'bg-white/20 text-white border-white/20' : tab.badgeColor
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar bottom control deck */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 space-y-3 shrink-0">
          {/* Fullscreen & View Switches */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleFullScreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullScreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              <span>{isFullScreen ? (lang === 'bn' ? 'মিনিমাইজ' : 'Min') : (lang === 'bn' ? 'ফুলস্ক্রিন' : 'Full')}</span>
            </button>
            {isStandalone && onToggleUserView && (
              <button
                onClick={onToggleUserView}
                className="p-2.5 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 text-blue-400 hover:text-blue-300 transition-all text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{lang === 'bn' ? 'ইউজার ভিউ' : 'User'}</span>
              </button>
            )}
          </div>

          {/* Logout Close Button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{isStandalone ? (lang === 'bn' ? 'লগআউট' : 'Logout') : (lang === 'bn' ? 'বন্ধ করুন' : 'Close Dashboard')}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN LAYOUT WORKSPACE */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
        
        {/* MOBILE PORTRAIT HEADER (Hidden on desktop) */}
        <div className="lg:hidden bg-slate-950/60 backdrop-blur-md border-b border-white/10 px-5 py-4 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md shrink-0">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-extrabold text-xs tracking-tight truncate">
                {labels.title}
              </h2>
              <p className="text-[8px] text-slate-400 font-bold font-mono tracking-wider mt-0.5 uppercase truncate">
                {isStandalone ? "ADMIN SYSTEM" : "SANDBOX MODE"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isStandalone ? (
              <div className="flex items-center gap-1.5">
                {onToggleUserView && (
                  <button
                    onClick={onToggleUserView}
                    className="p-2 bg-blue-500/10 text-blue-400 rounded-xl text-[9px] font-black border border-blue-500/15 cursor-pointer"
                  >
                    <Globe className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black border border-rose-500/15 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* MOBILE HORIZONTAL TABS SELECTOR (Hidden on desktop) */}
        <div className="lg:hidden bg-slate-950/40 border-b border-white/5 px-5 py-2.5 flex gap-2 overflow-x-auto scroller-hidden relative z-20">
          {adminTabsList.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id);
                  if (tab.id === 'users') {
                    setSelectedUser(null);
                  }
                }}
                className={`px-3.5 py-2 rounded-full text-[10.5px] font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 border shrink-0 ${
                  isTabActive 
                    ? 'bg-blue-600 text-white shadow-md border-transparent' 
                    : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isTabActive ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Workspace panel viewport */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 relative z-10 bg-slate-900/30">
          
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

            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const todayRequests = pendingRequests.filter(r => {
              if (!r.date) return false;
              const dateObj = new Date(r.date);
              return dateObj >= startOfToday;
            });

            const todayCashIns = todayRequests
              .filter(r => r.status === 'Success' && r.type === 'CashIn')
              .reduce((acc, r) => acc + (parseFloat(r.amount + '') || 0), 0);

            const todayDebits = todayRequests
              .filter(r => r.status === 'Success' && (r.type === 'Recharge' || r.type === 'Bill'))
              .reduce((acc, r) => acc + (parseFloat(r.amount + '') || 0), 0);
            
            const allTimeAdded = registeredUsers.reduce((acc, u) => acc + (parseFloat(u.totalGiven + '') || 0), 0);

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
                        {lang === 'bn' ? 'আজকের যোগকৃত ফান্ড' : 'Today Added'}
                      </span>
                      <span className="text-xs font-black text-white font-mono mt-0.5 block leading-none">
                        ৳{todayCashIns.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-1 py-0.5 rounded tracking-tighter uppercase font-mono">
                      TODAY
                    </span>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 rounded-2xl flex items-center justify-between text-slate-100">
                    <div>
                      <span className="text-[8px] font-black tracking-wider text-rose-400 uppercase opacity-90 block">
                        {lang === 'bn' ? 'আজকের বিক্রয়/খরচ' : 'Today Sales'}
                      </span>
                      <span className="text-xs font-black text-white font-mono mt-0.5 block leading-none">
                        ৳{todayDebits.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/10 px-1 py-0.5 rounded tracking-tighter uppercase font-mono">
                      TODAY
                    </span>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 rounded-2xl flex items-center justify-between text-slate-100">
                    <div>
                      <span className="text-[8px] font-black tracking-wider text-blue-400 uppercase opacity-90 block">
                        {lang === 'bn' ? 'মোট দেওয়া ফান্ড' : 'Total Added'}
                      </span>
                      <span className="text-xs font-black text-white font-mono mt-0.5 block leading-none">
                        ৳{allTimeAdded.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/10 px-1 py-0.5 rounded tracking-tighter uppercase font-mono">
                      ALL
                    </span>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 rounded-2xl flex items-center justify-between text-slate-100">
                    <div>
                      <span className="text-[8px] font-black tracking-wider text-violet-400 uppercase opacity-90 block">
                        {lang === 'bn' ? 'সর্বমোট ইউজার ব্যালেন্স' : 'Total User Balance'}
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

                {/* PREMIUM REAL-TIME ANALYTICS DASHBOARD */}
                {(() => {
                  // 1. Calculate Operator volume share
                  const opGP = pendingRequests.filter(r => r.status === 'Success' && r.operator === 'GP').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const opRobi = pendingRequests.filter(r => r.status === 'Success' && r.operator === 'Robi').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const opAirtel = pendingRequests.filter(r => r.status === 'Success' && r.operator === 'Airtel').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const opBanglalink = pendingRequests.filter(r => r.status === 'Success' && r.operator === 'Banglalink').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const opTeletalk = pendingRequests.filter(r => r.status === 'Success' && r.operator === 'Teletalk').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const totalOpSum = opGP + opRobi + opAirtel + opBanglalink + opTeletalk || 1;

                  // 2. Calculate Transaction category split
                  const typeCashIn = pendingRequests.filter(r => r.status === 'Success' && r.type === 'CashIn').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const typeRecharge = pendingRequests.filter(r => r.status === 'Success' && r.type === 'Recharge').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const typeBill = pendingRequests.filter(r => r.status === 'Success' && r.type === 'Bill').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const typeTransfer = pendingRequests.filter(r => r.status === 'Success' && r.type === 'Transfer').reduce((sum, r) => sum + (parseFloat(r.amount + '') || 0), 0);
                  const totalTypeSum = typeCashIn + typeRecharge + typeBill + typeTransfer || 1;

                  // 3. KYC Verification Rate
                  const totalUsers = registeredUsers.length || 1;
                  const verifiedUsers = registeredUsers.filter(u => u.kycStatus === 'verified').length;
                  const pendingKyc = registeredUsers.filter(u => u.kycStatus === 'pending').length;
                  const kycPct = Math.round((verifiedUsers / totalUsers) * 100);

                  // Determine column visibility based on active sub tab
                  const showCol1 = activeSubTab === 'requests' || activeSubTab === 'offers' || activeSubTab === 'sim_orders';
                  const showCol2 = activeSubTab === 'requests' || activeSubTab === 'billers';
                  const showCol3 = activeSubTab === 'users' || activeSubTab === 'kyc';
                  const visibleColsCount = (showCol1 ? 1 : 0) + (showCol2 ? 1 : 0) + (showCol3 ? 1 : 0);

                  if (visibleColsCount === 0) return null;

                  const gridClass = visibleColsCount === 3 ? "p-5 grid grid-cols-1 md:grid-cols-3 gap-5" :
                                    visibleColsCount === 2 ? "p-5 grid grid-cols-1 md:grid-cols-2 gap-5" :
                                    "p-5 grid grid-cols-1 gap-5";

                  return (
                    <div className="bg-slate-950/45 border border-white/10 rounded-[28px] overflow-hidden shadow-xl shadow-slate-950/20">
                      {/* Collapse Toggle Header */}
                      <button
                        type="button"
                        onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                            <Layers className="h-4 w-4" />
                          </span>
                          <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">
                              {lang === 'bn' ? '📊 রিয়েল-টাইম লাইভ অ্যানালিটিক্স ও ডিস্ট্রিবিউশন' : '📊 Real-Time Financial Analytics & Distribution'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {lang === 'bn' ? 'অপারেটর রিচার্জ শেয়ার, ট্রানজেকশন ক্যাটাগরি এবং গ্রাহক যাচাইকরণ ট্র্যাকিং' : 'Operator recharge split, transaction share, and customer KYC tracking'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-xl uppercase tracking-widest font-mono">
                          {isAnalyticsExpanded ? (lang === 'bn' ? 'লুকান' : 'Hide') : (lang === 'bn' ? 'দেখান' : 'Show')}
                        </span>
                      </button>

                      <AnimatePresence>
                        {isAnalyticsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className={gridClass}
                          >
                            {/* Column 1: Recharge Operator Shares */}
                            {showCol1 && (
                              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3.5">
                                <span className="text-[9.5px] font-black text-blue-400 tracking-wider uppercase block font-mono">
                                  📱 Operator Recharge Volume (৳)
                                </span>
                                <div className="space-y-3">
                                  {[
                                    { label: 'GP', val: opGP, pct: (opGP/totalOpSum)*100, color: 'bg-blue-500' },
                                    { label: 'Robi', val: opRobi, pct: (opRobi/totalOpSum)*100, color: 'bg-red-500' },
                                    { label: 'Airtel', val: opAirtel, pct: (opAirtel/totalOpSum)*100, color: 'bg-rose-600' },
                                    { label: 'Banglalink', val: opBanglalink, pct: (opBanglalink/totalOpSum)*100, color: 'bg-orange-500' },
                                    { label: 'Teletalk', val: opTeletalk, pct: (opTeletalk/totalOpSum)*100, color: 'bg-emerald-500' }
                                  ].map((item) => (
                                    <div key={item.label} className="space-y-1">
                                      <div className="flex justify-between text-[10.5px] font-bold">
                                        <span className="text-white flex items-center gap-1.5">
                                          <span className={`w-2 h-2 rounded-full ${item.color}`} />
                                          {item.label}
                                        </span>
                                        <span className="text-slate-400 font-mono">
                                          ৳{item.val.toLocaleString()} ({Math.round(item.pct)}%)
                                        </span>
                                      </div>
                                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                        <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.max(item.pct, totalOpSum === 1 ? 0 : 3)}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Column 2: Transaction Category Split */}
                            {showCol2 && (
                              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3.5">
                                <span className="text-[9.5px] font-black text-pink-400 tracking-wider uppercase block font-mono">
                                  💰 Category Volume Share (৳)
                                </span>
                                <div className="space-y-3">
                                  {[
                                    { label: lang === 'bn' ? 'অ্যাড ফান্ড' : 'Cash In', val: typeCashIn, pct: (typeCashIn/totalTypeSum)*100, color: 'bg-violet-500' },
                                    { label: lang === 'bn' ? 'রিচার্জ' : 'Recharge', val: typeRecharge, pct: (typeRecharge/totalTypeSum)*100, color: 'bg-blue-500' },
                                    { label: lang === 'bn' ? 'বিল পে' : 'Bill Payment', val: typeBill, pct: (typeBill/totalTypeSum)*100, color: 'bg-pink-500' },
                                    { label: lang === 'bn' ? 'ট্রান্সফার' : 'Transfer', val: typeTransfer, pct: (typeTransfer/totalTypeSum)*100, color: 'bg-amber-500' }
                                  ].map((item) => (
                                    <div key={item.label} className="space-y-1">
                                      <div className="flex justify-between text-[10.5px] font-bold">
                                        <span className="text-white flex items-center gap-1.5">
                                          <span className={`w-2 h-2 rounded-full ${item.color}`} />
                                          {item.label}
                                        </span>
                                        <span className="text-slate-400 font-mono">
                                          ৳{item.val.toLocaleString()} ({Math.round(item.pct)}%)
                                        </span>
                                      </div>
                                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                        <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.max(item.pct, totalTypeSum === 1 ? 0 : 3)}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Column 3: KYC Verification Hub */}
                            {showCol3 && (
                              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                                <div className="space-y-3.5">
                                  <span className="text-[9.5px] font-black text-emerald-400 tracking-wider uppercase block font-mono">
                                    🪪 KYC Compliance Hub
                                  </span>
                                  <div className="flex items-center gap-4 py-2">
                                    <div className="relative flex items-center justify-center">
                                      {/* SVG Circular Indicator */}
                                      <svg className="w-20 h-20">
                                        <circle cx="40" cy="40" r="32" className="stroke-white/5 stroke-[5]" fill="transparent" />
                                        <circle cx="40" cy="40" r="32" className="stroke-emerald-500 stroke-[5] transition-all duration-700" fill="transparent"
                                                strokeDasharray={`${2 * Math.PI * 32}`}
                                                strokeDashoffset={`${2 * Math.PI * 32 * (1 - kycPct/100)}`}
                                                strokeLinecap="round" />
                                      </svg>
                                      <span className="absolute text-sm text-white font-mono font-black">{kycPct}%</span>
                                    </div>
                                    <div className="space-y-1 text-slate-400 text-[10px] font-semibold">
                                      <p className="flex items-center gap-1.5 text-white">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        {lang === 'bn' ? `${verifiedUsers} জন ভেরিফাইড` : `${verifiedUsers} Clients Verified`}
                                      </p>
                                      <p className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                        {lang === 'bn' ? `${pendingKyc} জন অপেক্ষমান` : `${pendingKyc} Submissions Pending`}
                                      </p>
                                      <p className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                                        {lang === 'bn' ? `মোট গ্রাহক ${totalUsers} জন` : `Total Base: ${totalUsers}`}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveSubTab('kyc')}
                                  className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/15 text-emerald-400 rounded-xl text-[10px] font-black tracking-wider uppercase transition-colors text-center cursor-pointer"
                                >
                                  {lang === 'bn' ? 'কেওয়াইসি রিকোয়েস্ট দেখুন' : 'Verify KYC Submissions'}
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}
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

                {/* Voice Assistant Controls */}
                <div className="bg-slate-900/60 border border-white/5 p-3.5 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isVoiceEnabled ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15' : 'bg-slate-800 text-slate-500'}`}>
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                        {lang === 'bn' ? 'ভয়েস নোটিফিকেশন' : 'Voice Notification Assistant'}
                        <span className={`inline-block w-2 h-2 rounded-full ${isVoiceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      </h5>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {lang === 'bn' 
                          ? 'নতুন অ্যাড ফান্ড, ফ্লেক্সিলোড বা বিল পে রিকোয়েস্টের বাংলা ঘোষণা।' 
                          : 'Announces new orders, flexiloads, or bill pays in Bangla.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isVoiceEnabled;
                        setIsVoiceEnabled(nextState);
                        localStorage.setItem('admin_voice_enabled', String(nextState));
                        if (nextState) {
                          // Trigger a silent speak to unblock browser sound rules
                          setTimeout(() => {
                            speak(lang === 'bn' ? 'ভয়েস সহকারী সক্রিয় করা হয়েছে' : 'Voice assistant activated');
                          }, 100);
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        isVoiceEnabled 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/45' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {isVoiceEnabled 
                        ? (lang === 'bn' ? 'ভয়েস অন' : 'Voice On') 
                        : (lang === 'bn' ? 'ভয়েস অফ' : 'Voice Off')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Force speak even if isVoiceEnabled is false for testing
                        if ("speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                          const utterance = new SpeechSynthesisUtterance(lang === 'bn' ? 'বাংলা নোটিফিকেশন সিস্টেম চমৎকারভাবে কাজ করছে' : 'Bangla voice assistant is working properly');
                          const voices = window.speechSynthesis.getVoices();
                          const bnVoice = voices.find(v => v.lang.startsWith('bn'));
                          if (bnVoice) utterance.voice = bnVoice;
                          utterance.lang = "bn-BD";
                          utterance.rate = 0.95;
                          window.speechSynthesis.speak(utterance);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-950/45"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {lang === 'bn' ? 'টেস্ট ভয়েস' : 'Test Voice'}
                    </button>
                  </div>
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
                    <option value="Transfer">{lang === 'bn' ? '💸 ব্যালেন্স ট্রান্সফার' : '💸 Balance Transfer'}</option>
                    <option value="Voucher">{lang === 'bn' ? '🎁 গেমিং ও ওটিটি ভাউচার' : '🎁 Gaming & OTT Voucher'}</option>
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
                    {filteredRequests.map((req, index) => {
                      const isTxPending = req.status === 'Pending';
                      return (
                        <div 
                          key={`${req.id || index}-${index}`} 
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
                                  {req.type === 'Transfer' && (
                                    <p className="flex items-center gap-1.5 flex-wrap">
                                      <span>{lang === 'bn' ? `টাকা স্থানান্তর (${req.transferMethod}): ${req.targetNumber}` : `Transfer (${req.transferMethod}): ${req.targetNumber}`}</span>
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
                                  )}
                                  {req.type === 'Voucher' && (
                                    <div className="space-y-1">
                                      <p className="font-extrabold text-blue-400 flex items-center gap-1">
                                        <span>🎁 {req.voucherItem} ({req.voucherCode})</span>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded font-normal uppercase tracking-wider">{req.voucherCategory}</span>
                                      </p>
                                      <p className="flex items-center gap-1.5 flex-wrap">
                                        <span>{lang === 'bn' ? `একাউন্ট/আইডি: ${req.targetNumber}` : `Account ID / UID: ${req.targetNumber}`}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyToClipboard(req.targetNumber || '', req.id + '-targetNumber')}
                                          className="p-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[9px] font-bold"
                                          title={lang === 'bn' ? 'কপি করুন' : 'Copy'}
                                        >
                                          {copiedFieldId === req.id + '-targetNumber' ? (
                                            <span className="text-emerald-400">{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                                          ) : (
                                            <Copy className="h-2.5 w-2.5" />
                                          )}
                                        </button>
                                      </p>
                                    </div>
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
                    setSmartText('');
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

                  {/* Smart Autofill Box */}
                  <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-blue-900 uppercase flex items-center gap-1">
                        <span>✨ Smart Autofill (স্মার্ট অটোফিল)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseSmartOfferText(smartText, offerForm.operator);
                          setOfferForm(prev => ({
                            ...prev,
                            ...parsed
                          }));
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer select-none border-0"
                      >
                        {lang === 'bn' ? 'প্রয়োগ করুন' : 'Apply'}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      placeholder={lang === 'bn' ? "এখানে কপি করা অফার পেস্ট করুন...\nযেমন:\n১০ জিবি , ৩৫০ মিনিট এবং ১০০ এসএমএস\nটাকা: ৩১২\nমেয়াদ: ৩০ দিন" : "Paste copy-pasted offer text here...\ne.g.\n10 GB, 350 Min\nTaka: 312\nValidity: 30 Days"}
                      value={smartText}
                      onChange={(e) => {
                        const text = e.target.value;
                        setSmartText(text);
                        const parsed = parseSmartOfferText(text, offerForm.operator);
                        setOfferForm(prev => ({
                          ...prev,
                          ...parsed
                        }));
                      }}
                      className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500 placeholder-slate-400 font-mono text-slate-800"
                    />
                    <p className="text-[10px] text-blue-700 font-semibold leading-normal">
                      {lang === 'bn' 
                        ? '💡 এখানে শুধু অফার ডিটেইলস লিখলেই ক্যাটাগরি, প্রাইস, ভলিউম, ভ্যালিডিটি এবং টাইটেল ইংরেজি ও বাংলা অটোমেটিক পূরণ হয়ে যাবে!' 
                        : '💡 Simply paste details here; category, price, volume, validity, and titles will be auto-generated instantly!'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase flex justify-between items-center">
                        <span>Title (EN)</span>
                        <span className="text-[8px] font-extrabold text-blue-500 lowercase bg-blue-50 px-1 py-0.5 rounded">auto-generated</span>
                      </label>
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setOfferForm({
                            ...offerForm,
                            titleBn: val,
                            title: translateBanglaToEnglish(val)
                          });
                        }}
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
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase flex justify-between items-center">
                        <span>Validity (EN)</span>
                        <span className="text-[8px] font-extrabold text-blue-500 lowercase bg-blue-50 px-1 py-0.5 rounded">auto-generated</span>
                      </label>
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setOfferForm({
                            ...offerForm,
                            validityBn: val,
                            validity: translateBanglaToEnglish(val)
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-black text-slate-500 uppercase flex justify-between items-center">
                        <span>Volume Volume (EN)</span>
                        <span className="text-[8px] font-extrabold text-blue-500 lowercase bg-blue-50 px-1 py-0.5 rounded">auto-generated</span>
                      </label>
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setOfferForm({
                            ...offerForm,
                            volumeBn: val,
                            volume: translateBanglaToEnglish(val)
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mt-1 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black text-slate-500 uppercase flex justify-between items-center">
                      <span>Description (EN)</span>
                      <span className="text-[8px] font-extrabold text-blue-500 lowercase bg-blue-50 px-1 py-0.5 rounded">auto-generated</span>
                    </label>
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setOfferForm({
                          ...offerForm,
                          descriptionBn: val,
                          description: translateBanglaToEnglish(val)
                        });
                      }}
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
                    {filteredOffers.map((pkg, index) => (
                      <div key={`${pkg.id || index}-${index}`} className="bg-white border border-slate-200/60 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
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
                {banners.map((ban, index) => (
                  <div key={`${ban.id || index}-${index}`} className="bg-slate-900/40 backdrop-blur-md border border-white/15 p-4 rounded-3xl flex flex-col justify-between gap-3.5 group hover:bg-slate-900/60 hover:border-white/20 transition-all duration-300">
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
                    {filteredBillers.map((biller, index) => (
                      <div key={`${biller.id || index}-${index}`} className="bg-white border border-slate-150 p-4 rounded-3xl flex flex-col justify-between gap-3.5 shadow-xs group hover:shadow-md transition-shadow">
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
                <div className={`space-y-3.5 ${selectedUser ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                  {/* Premium CRM Filter Tabs */}
                  <div className="flex bg-slate-950/60 p-1 border border-white/5 rounded-2xl gap-1">
                    {[
                      { id: 'all', label: lang === 'bn' ? 'সব গ্রাহক' : 'All' },
                      { id: 'verified', label: lang === 'bn' ? 'ভেরিফাইড' : 'Verified' },
                      { id: 'pending_kyc', label: lang === 'bn' ? 'কেওয়াইসি অপেক্ষমান' : 'Pending' },
                      { id: 'suspended', label: lang === 'bn' ? 'স্থগিত' : 'Suspended' }
                    ].map((tab) => {
                      const isActive = userFilterTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setUserFilterTab(tab.id as any);
                            // Clear selected user if they don't match the new filter tab to maintain consistent state
                            setSelectedUser(null);
                          }}
                          className={`flex-1 py-1.5 text-[9.5px] font-black tracking-wider rounded-xl uppercase transition-all cursor-pointer text-center ${
                            isActive
                              ? 'bg-blue-600 border border-blue-500 text-white shadow-lg shadow-blue-500/15'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-white/[0.02]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-slate-950/30 border border-white/10 rounded-3xl p-3 max-h-[480px] overflow-y-auto">
                    {registeredUsers.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        {lang === 'bn' ? 'কোনো রেজিষ্ট্রেশনকৃত ইউজার পাওয়া যায়নি!' : 'No registered users found yet.'}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {registeredUsers
                          .filter((u) => {
                            // 1. CRM Status Filter Checks
                            if (userFilterTab === 'verified' && u.kycStatus !== 'verified') return false;
                            if (userFilterTab === 'pending_kyc' && u.kycStatus !== 'pending') return false;
                            if (userFilterTab === 'suspended' && !u.isBanned) return false;

                            // 2. Search Text Matches
                            const queryLower = searchUserQuery.toLowerCase().trim();
                            if (!queryLower) return true;
                            return (
                              (u.displayName || '').toLowerCase().includes(queryLower) ||
                              (u.email || '').toLowerCase().includes(queryLower) ||
                              (u.phone || '').toLowerCase().includes(queryLower) ||
                              (u.uid || '').toLowerCase().includes(queryLower)
                            );
                          })
                          .map((userObj, idx) => {
                            const isSelected = selectedUser?.uid === userObj.uid;
                            return (
                              <button
                                key={userObj.uid || userObj.id || `user-item-${idx}`}
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
                                <div className="space-y-1 pr-2 truncate flex-1">
                                  <div className="flex items-center justify-between mr-2">
                                    <h4 className="text-xs font-black truncate">
                                      {userObj.displayName}
                                    </h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-green-500/10 text-green-400'}`}>
                                      ৳{(parseFloat(userObj.balance + '') || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 mr-2">
                                    <p className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                      {userObj.phone ? `📱 ${userObj.phone}` : `✉️ ${userObj.email}`}
                                    </p>
                                    <span className={`text-[9px] font-black tracking-wide ${isSelected ? 'text-blue-200' : 'text-emerald-500'}`}>
                                      IN: ৳{(parseFloat(userObj.totalGiven + '') || 0).toLocaleString()}
                                    </span>
                                  </div>
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
                      <div className="flex gap-4 items-start flex-1 min-w-0">
                        {/* Profile Image */}
                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center font-display text-white text-xl font-bold overflow-hidden shrink-0 shadow-inner">
                          {selectedUser.photoURL ? (
                            <img src={selectedUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{selectedUser.displayName?.[0]?.toUpperCase() || 'U'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[9px] font-black tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/15 rounded px-1.5 py-0.5 uppercase font-mono">
                              {lang === 'bn' ? 'নির্বাচিত ইউজার প্রোফাইল' : 'Selected Customer Profile'}
                            </span>
                            {selectedUser.isBanned && (
                              <span className="text-[9px] font-black tracking-widest text-rose-400 bg-rose-500/15 border border-rose-500/35 rounded px-1.5 py-0.5 uppercase font-mono animate-pulse">
                                {lang === 'bn' ? 'স্থগিত' : 'Suspended'}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-extrabold text-white mt-2 truncate">
                            {selectedUser.displayName}
                          </h3>
                          <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                            UID: <span className="text-slate-300">{selectedUser.uid}</span>
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 font-medium truncate">
                            {lang === 'bn' ? 'মোবাইল/ইমেইল' : 'Contact'}: <span className="text-slate-300 font-mono">{selectedUser.phone || selectedUser.email}</span>
                          </p>

                          {/* Edit / Delete / Suspend control buttons */}
                          <div className="flex flex-wrap gap-2 mt-3">
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
                              onClick={() => handleToggleUserBan(selectedUser.uid, !!selectedUser.isBanned)}
                              className={`p-1 px-2.5 bg-white/5 border text-[10px] font-black cursor-pointer transition-colors flex items-center gap-1 rounded-xl ${
                                selectedUser.isBanned
                                  ? 'hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20'
                                  : 'hover:bg-amber-600/20 text-amber-500 border-amber-500/20'
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>
                                {selectedUser.isBanned
                                  ? (lang === 'bn' ? 'সক্রিয় করুন' : 'Activate User')
                                  : (lang === 'bn' ? 'স্থগিত করুন' : 'Suspend User')}
                              </span>
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

                    {/* Permanent NID Card Records (KYC) */}
                    {selectedUser.kycData && (
                      <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 space-y-4">
                        <span className="text-[10px] font-black text-blue-400 block uppercase tracking-wider font-mono">
                          🪪 {lang === 'bn' ? 'স্থায়ী এনআইডি কার্ড রেকর্ড' : 'Permanent NID Card Records'}
                        </span>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3.5 bg-slate-950/60 rounded-2xl text-slate-200">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{lang === 'bn' ? 'এনআইডি নাম' : 'NID Name'}</span>
                            <p className="text-white text-xs font-bold truncate">{selectedUser.kycData?.fullName || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{lang === 'bn' ? 'এনআইডি নম্বর' : 'NID Number'}</span>
                            <p className="text-white text-xs font-bold font-mono">{selectedUser.kycData?.nidNumber || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{lang === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}</span>
                            <p className="text-white text-xs font-bold font-mono">{selectedUser.kycData?.dob || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{lang === 'bn' ? 'কেওয়াইসি স্ট্যাটাস' : 'KYC Status'}</span>
                            <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              selectedUser.kycStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-400' :
                              selectedUser.kycStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                              selectedUser.kycStatus === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>
                              {selectedUser.kycStatus || 'Not Submitted'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{lang === 'bn' ? 'সামনের অংশ' : 'Front Side'}</span>
                            <div className="aspect-video bg-slate-950 border border-white/5 rounded-2xl overflow-hidden relative group shadow-md">
                              {selectedUser.kycData?.nidFrontUrl ? (
                                <a href={selectedUser.kycData.nidFrontUrl} target="_blank" rel="noreferrer" className="block w-full h-full relative">
                                  <img src={selectedUser.kycData.nidFrontUrl} alt="NID Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-white">
                                    {lang === 'bn' ? 'ক্লিক করে বড় করুন' : 'Click to Zoom'}
                                  </div>
                                </a>
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-bold">No Image</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">{lang === 'bn' ? 'পিছনের অংশ' : 'Back Side'}</span>
                            <div className="aspect-video bg-slate-950 border border-white/5 rounded-2xl overflow-hidden relative group shadow-md">
                              {selectedUser.kycData?.nidBackUrl ? (
                                <a href={selectedUser.kycData.nidBackUrl} target="_blank" rel="noreferrer" className="block w-full h-full relative">
                                  <img src={selectedUser.kycData.nidBackUrl} alt="NID Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-white">
                                    {lang === 'bn' ? 'ক্লিক করে বড় করুন' : 'Click to Zoom'}
                                  </div>
                                </a>
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-bold">No Image</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                          selectedUserHistory.map((hTx, index) => {
                            const isApproved = hTx.status === 'Approved';
                            const isRejected = hTx.status === 'Rejected';
                            const isCashIn = hTx.type === 'CashIn';
                            return (
                              <div
                                key={`${hTx.id || index}-${index}`} 
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

                {/* Section E: Referral Rewards System */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-400 border-b border-white/5 pb-2 uppercase tracking-wider font-mono">
                    5. Referral Rewards Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block ml-1 font-mono">
                        Referral Bonus Amount (৳)
                      </label>
                      <input
                        type="number"
                        required
                        value={settingsForm.referralBonus}
                        onChange={(e) => setSettingsForm({ ...settingsForm, referralBonus: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-2xl py-2.5 px-3.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      />
                      <p className="text-[9px] text-slate-500 font-bold ml-1">
                        {lang === 'bn' ? '* নতুন ইউজার রেফারেল কোড ব্যবহার করলে রেফারার এই পরিমাণ বোনাস পাবে।' : '* Referrer will receive this amount when a new user signs up using their code.'}
                      </p>
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

          {/* SUPPORT TICKETS AND CHAT TAB */}
          {activeSubTab === 'support' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
              {/* Left Side: Ticket List */}
              <div className="lg:col-span-5 bg-slate-950/40 border border-white/5 rounded-3xl p-4 flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                    <MessageSquare className="h-4.5 w-4.5 text-blue-500" />
                    <span>{lang === 'bn' ? 'সাপোর্ট টিকিট সমূহ' : 'Customer Support Tickets'}</span>
                  </h3>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 font-extrabold px-2.5 py-1 rounded-full border border-blue-500/10">
                    {supportTickets.length} Total
                  </span>
                </div>

                {/* Tickets scroller */}
                <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 scroller-hidden">
                  {supportTickets.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <div className="p-3 bg-white/5 w-fit rounded-full mx-auto">
                        <MessageSquare className="h-7 w-7 text-slate-500" />
                      </div>
                      <p className="text-xs font-bold">
                        {lang === 'bn' ? 'কোনো সাপোর্ট টিকিট তৈরি হয়নি' : 'No support tickets found'}
                      </p>
                    </div>
                  ) : (
                    supportTickets.map((ticket) => {
                      const isActive = selectedTicketId === ticket.id;
                      const hasUnread = ticket.lastMessageSender === 'user' && ticket.status === 'Open';
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                          }}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2 text-xs relative ${
                            isActive 
                              ? 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-600/10' 
                              : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                          }`}
                        >
                          {/* Unread indicator */}
                          {hasUnread && !isActive && (
                            <span className="absolute top-3.5 right-3.5 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse border border-slate-900" />
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-100 truncate max-w-[130px]">
                              {ticket.userName || 'Unknown Customer'}
                            </span>
                            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md ${
                              ticket.status === 'Closed' 
                                ? 'bg-slate-800 text-slate-400' 
                                : isActive 
                                ? 'bg-white/20 text-white' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>

                          <div className="text-[11px] font-bold tracking-tight text-slate-350 truncate">
                            {ticket.subject}
                          </div>

                          {ticket.lastMessageText && (
                            <div className={`text-[10px] truncate max-w-[240px] italic ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                              <strong>{ticket.lastMessageSender === 'admin' ? 'You: ' : 'User: '}</strong>
                              {ticket.lastMessageText}
                            </div>
                          )}

                          <div className={`text-[9px] font-mono font-bold text-right ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                            {new Date(ticket.lastMessageTime || ticket.createdAt).toLocaleString()}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Side: Chat Session Window */}
              <div className="lg:col-span-7 bg-slate-950/40 border border-white/5 rounded-3xl p-4 flex flex-col justify-between min-h-[500px]">
                {(() => {
                  const activeTicket = supportTickets.find(t => t.id === selectedTicketId);
                  if (!activeTicket) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                        <div className="p-4 bg-white/5 text-slate-400 rounded-full">
                          <MessageSquare className="h-9 w-9 stroke-[1.5]" />
                        </div>
                        <div>
                          <h4 className="text-white text-xs font-extrabold">
                            {lang === 'bn' ? 'চ্যাট শুরু করতে একটি টিকিট সিলেক্ট করুন' : 'Select a Ticket to Begin Chatting'}
                          </h4>
                          <p className="text-[11px] font-medium max-w-[220px] mx-auto mt-1 leading-relaxed">
                            {lang === 'bn' 
                              ? 'বাম পাশের তালিকা থেকে যেকোনো সক্রিয় টিকিট সিলেক্ট করে গ্রাহকের সাথে সরাসরি লাইভ চ্যাট করুন।' 
                              : 'Select any active ticket from the list to reply to the user in real-time.'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col h-full flex-1 justify-between">
                      {/* Chat Window Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs uppercase shadow-sm">
                            {(activeTicket.userName || 'U').slice(0, 1)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-white leading-tight">
                              {activeTicket.userName || 'Customer'}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {activeTicket.userEmail}
                            </p>
                          </div>
                        </div>

                        {/* Toggle Ticket Status */}
                        <button
                          type="button"
                          onClick={() => handleToggleTicketStatus(activeTicket.id)}
                          className={`text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            activeTicket.status === 'Closed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {activeTicket.status === 'Closed' 
                            ? (lang === 'bn' ? 'টিকিট পুনরায় খুলুন' : 'Re-open Ticket') 
                            : (lang === 'bn' ? 'টিকিট বন্ধ করুন' : 'Close Ticket')}
                        </button>
                      </div>

                      {/* Messages body */}
                      <div className="flex-1 overflow-y-auto max-h-[350px] my-4 p-2 space-y-3 scroller-hidden">
                        {/* Initial system message */}
                        <div className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-mono font-black text-blue-400 uppercase tracking-wider">
                            <span>Ticket Created</span>
                            <span>{new Date(activeTicket.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-slate-250 font-bold leading-normal">
                            Subject: {activeTicket.subject}
                          </p>
                        </div>

                        {/* Array messages log */}
                        {activeTicket.messages && activeTicket.messages.map((msg: any) => {
                          const isAdmin = msg.senderId === 'admin';
                          return (
                            <div 
                              key={msg.id} 
                              className={`flex flex-col max-w-[80%] ${isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                            >
                              <div className={`p-3 rounded-2xl text-[11.5px] font-medium leading-relaxed ${
                                isAdmin 
                                  ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10' 
                                  : 'bg-white/10 text-slate-100 rounded-tl-none border border-white/5'
                              }`}>
                                {msg.text}
                              </div>
                              <span className="text-[8.5px] font-mono text-slate-500 mt-1 font-bold">
                                {msg.senderName} • {new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply form submission */}
                      <form onSubmit={handleSendAdminReply} className="border-t border-white/5 pt-3.5 flex gap-2">
                        <input
                          type="text"
                          required
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          placeholder={
                            activeTicket.status === 'Closed' 
                              ? (lang === 'bn' ? 'এই টিকিটটি বন্ধ রয়েছে...' : 'This ticket is closed...')
                              : (lang === 'bn' ? 'গ্রাহকের জন্য বার্তা লিখুন...' : 'Write reply message for customer...')
                          }
                          disabled={activeTicket.status === 'Closed'}
                          className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500 focus:bg-white/10 transition-all disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={activeTicket.status === 'Closed'}
                          className="px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white font-extrabold rounded-2xl text-xs transition-colors shadow-md flex items-center justify-center cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 5c. STORE PRODUCTS MANAGEMENT */}
          {activeSubTab === 'products' && (
            <div className="space-y-6">
              {/* Add/Edit Product Form */}
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 text-slate-100">
                <h3 className="text-sm font-black tracking-tight mb-4 flex items-center gap-2">
                  <Plus className="h-4.5 w-4.5 text-blue-500" />
                  <span>{editingProductId ? (lang === 'bn' ? 'প্রোডাক্ট এডিট করুন' : 'Edit Store Product') : (lang === 'bn' ? 'নতুন প্রোডাক্ট যোগ করুন' : 'Add New Store Product')}</span>
                </h3>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400 font-extrabold">{lang === 'bn' ? 'নাম (ইংরেজি)' : 'Title (English)'}</label>
                      <input
                        type="text"
                        required
                        value={productForm.title}
                        onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400 font-extrabold">{lang === 'bn' ? 'নাম (বাংলা)' : 'Title (Bangla)'}</label>
                      <input
                        type="text"
                        required
                        value={productForm.titleBn}
                        onChange={(e) => setProductForm({ ...productForm, titleBn: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400 font-extrabold">{lang === 'bn' ? 'मूल्य (৳)' : 'Price (৳)'}</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400 font-extrabold">{lang === 'bn' ? 'স্টক পরিমাণ' : 'Stock Qty'}</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={productForm.stock}
                        onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400 font-extrabold">{lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500 appearance-none cursor-pointer text-slate-300"
                      >
                        <option value="Lifestyle" className="bg-slate-900">Lifestyle</option>
                        <option value="Digital" className="bg-slate-900">Digital</option>
                        <option value="Electronics" className="bg-slate-900">Electronics</option>
                        <option value="Services" className="bg-slate-900">Services</option>
                        <option value="Other" className="bg-slate-900">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase text-slate-400 font-extrabold">{lang === 'bn' ? 'ইমেজ ইউআরএল' : 'Image URL'}</label>
                    <input
                      type="url"
                      placeholder="https://example.com/product.jpg"
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400 font-extrabold">{lang === 'bn' ? 'বিবরণ (ইংরেজি)' : 'Description (English)'}</label>
                      <textarea
                        rows={2}
                        required
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-slate-400 font-extrabold">{lang === 'bn' ? 'বিবরণ (বাংলা)' : 'Description (Bangla)'}</label>
                      <textarea
                        rows={2}
                        required
                        value={productForm.descriptionBn}
                        onChange={(e) => setProductForm({ ...productForm, descriptionBn: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProductId(null);
                          setProductForm({
                            title: '',
                            titleBn: '',
                            price: 0,
                            stock: 0,
                            description: '',
                            descriptionBn: '',
                            imageUrl: '',
                            category: 'Lifestyle',
                          });
                        }}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                      >
                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingProduct}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs transition-colors flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProduct && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      <span>{editingProductId ? (lang === 'bn' ? 'হালনাগাদ করুন' : 'Update Product') : (lang === 'bn' ? 'সেভ করুন' : 'Save Product')}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Products List Table */}
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-black tracking-tight mb-4">{lang === 'bn' ? 'বিদ্যমান প্রোডাক্টসমূহ' : 'Available Products List'} ({adminProducts.length})</h3>

                {adminProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center font-semibold">{lang === 'bn' ? 'কোন প্রোডাক্ট পাওয়া যায়নি!' : 'No products found. Add some above!'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 font-bold">
                          <th className="py-3 px-2">{lang === 'bn' ? 'ছবি' : 'Image'}</th>
                          <th className="py-3 px-2">{lang === 'bn' ? 'নাম' : 'Title'}</th>
                          <th className="py-3 px-2">{lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                          <th className="py-3 px-2">{lang === 'bn' ? 'मूल্য' : 'Price'}</th>
                          <th className="py-3 px-2">{lang === 'bn' ? 'স্টক' : 'Stock'}</th>
                          <th className="py-3 px-2 text-right">{lang === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {adminProducts.map((prod, index) => (
                          <tr key={`${prod.id || index}-${index}`} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2">
                              <div className="h-10 w-10 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                                {prod.imageUrl ? (
                                  <img src={prod.imageUrl} alt={prod.title} referrerPolicy="no-referrer" className="object-cover h-full w-full" />
                                ) : (
                                  <ShoppingBag className="h-5 w-5 text-slate-500" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <p className="font-extrabold text-slate-100">{prod.title}</p>
                              <p className="text-[10px] text-slate-400">{prod.titleBn}</p>
                            </td>
                            <td className="py-3 px-2">
                              <span className="bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full text-[10px] text-slate-300 uppercase font-black tracking-wider">
                                {prod.category}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-mono font-bold text-blue-400">৳{prod.price}</td>
                            <td className="py-3 px-2 font-bold">
                              <span className={prod.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {prod.stock}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => handleEditProduct(prod)}
                                className="p-1.5 bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="p-1.5 bg-white/5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5d. STORE ORDERS MANAGEMENT */}
          {activeSubTab === 'orders' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-black tracking-tight mb-4 flex items-center justify-between">
                  <span>{lang === 'bn' ? 'স্টোর অর্ডার রিকোয়েস্টসমূহ' : 'Customer Store Purchase Orders'}</span>
                  <span className="text-xs bg-blue-600/20 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">
                    {adminOrders.filter(o => o.status === 'Pending').length} Pending
                  </span>
                </h3>

                {adminOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-semibold text-xs">
                    {lang === 'bn' ? 'এখনো কোনো অর্ডার পাওয়া যায়নি!' : 'No store orders found in database yet.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {adminOrders.map((order, index) => {
                      const isPending = order.status === 'Pending';
                      return (
                        <div key={`${order.id || index}-${index}`} className="bg-slate-950 border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row gap-5 items-start justify-between hover:border-slate-700/80 transition-all">
                          {/* Order specifications details */}
                          <div className="space-y-2 flex-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                order.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                order.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                              }`}>
                                {order.status}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono font-bold">ID: {order.id}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              {/* Customer Information Column */}
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400">{lang === 'bn' ? 'ক্রেতার বিবরণ' : 'Customer Info'}</p>
                                <p className="font-extrabold text-slate-200">{order.userName}</p>
                                <p className="text-[11px] text-slate-400">{order.userEmail}</p>
                                <p className="text-[11px] text-blue-400 font-bold flex items-center gap-1 cursor-pointer" onClick={() => handleCopyToClipboard(order.userPhone, order.id + '-phone')}>
                                  <span>{order.userPhone}</span>
                                  <Copy className="h-3 w-3" />
                                </p>
                              </div>

                              {/* Product Particulars Column */}
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400">{lang === 'bn' ? 'পণ্যের বিবরণ' : 'Product Particulars'}</p>
                                <p className="font-extrabold text-slate-200">{order.productTitle} (x{order.quantity})</p>
                                <p className="text-[11px] text-[#e2125d] font-bold">Total: ৳{order.totalPrice.toLocaleString()}</p>
                                <p className="text-[10px] text-slate-500">{new Date(order.date).toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Delivery shipping specifications */}
                            <div className="pt-2 border-t border-white/5 space-y-1 text-[11px]">
                              <p className="text-slate-300">
                                <strong className="text-slate-400">{lang === 'bn' ? 'ডেলিভারি ঠিকানা:' : 'Shipping Address:'}</strong> {order.deliveryAddress}
                              </p>
                              {order.note && (
                                <p className="text-slate-400 italic">
                                  <strong>Memo:</strong> {order.note}
                                </p>
                              )}
                              {order.rejectionReason && (
                                <p className="text-rose-400 font-semibold bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl mt-1">
                                  <strong>Rejection Reason:</strong> {order.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Approval reject action CTAs */}
                          {isPending && (
                            <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                              <button
                                onClick={() => handleApproveOrder(order)}
                                className="flex-1 md:w-36 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Check className="h-4 w-4" />
                                <span>{lang === 'bn' ? 'অনুমোদন করুন' : 'Approve & Ship'}</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingOrderId(order.id);
                                  setOrderRejectReason('');
                                }}
                                className="flex-1 md:w-36 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black shadow-md shadow-rose-500/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <X className="h-4 w-4" />
                                <span>{lang === 'bn' ? 'প্রত্যাখ্যান করুন' : 'Reject Order'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order Rejection Custom Dialog Prompt */}
              {rejectingOrderId && (
                <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
                  <div 
                    onClick={() => setRejectingOrderId(null)}
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
                  />
                  <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 border border-slate-100 flex flex-col space-y-4 relative z-50 animate-scale-up text-slate-800">
                    <div className="flex items-center gap-2.5 text-rose-600 pb-1 border-b border-slate-100">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <h3 className="text-slate-950 font-black text-sm tracking-tight">
                        {lang === 'bn' ? 'অর্ডার প্রত্যাখ্যান করুন' : 'Reject Customer Order'}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      {lang === 'bn' ? 'অর্ডারটি প্রত্যাখ্যান করার সুনির্দিষ্ট কারণ লিখুন। এটি কাস্টমার ইনবক্সে দেখতে পাবে এবং টাকা স্বয়ংক্রিয় রিফান্ড হবে।' : 'Specify why you are rejecting this purchase. The customer will see this and funds will automatically be refunded.'}
                    </p>

                    <input
                      type="text"
                      required
                      placeholder={lang === 'bn' ? 'যেমন: স্টক আউট, ভুল ঠিকানা ইত্যাদি' : 'e.g., Stock unavailable, Incorrect address...'}
                      value={orderRejectReason}
                      onChange={(e) => setOrderRejectReason(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 outline-none focus:border-rose-500"
                    />

                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setRejectingOrderId(null)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer text-center"
                      >
                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const orderObj = adminOrders.find(o => o.id === rejectingOrderId);
                          if (orderObj) {
                            handleRejectOrder(orderObj, orderRejectReason);
                          }
                        }}
                        className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/10 transition-all active:scale-98 cursor-pointer text-center"
                      >
                        {lang === 'bn' ? 'বাতিল করুন' : 'Reject & Refund'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5e. SIM CARD ORDERS MANAGEMENT */}
          {activeSubTab === 'sim_orders' && (
            <div className="space-y-5">
              {/* Secondary Sub-Tab Toggles */}
              <div className="flex gap-2 p-1.5 bg-slate-950 border border-white/5 rounded-2xl max-w-sm">
                <button
                  type="button"
                  onClick={() => setSimNumSubTab('bookings')}
                  className={`flex-1 py-2 text-xs font-black rounded-xl text-center transition-all cursor-pointer ${
                    simNumSubTab === 'bookings'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {lang === 'bn' ? 'সিম বুকিং অর্ডারস' : 'SIM Bookings'}
                </button>
                <button
                  type="button"
                  onClick={() => setSimNumSubTab('numbers')}
                  className={`flex-1 py-2 text-xs font-black rounded-xl text-center transition-all cursor-pointer ${
                    simNumSubTab === 'numbers'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {lang === 'bn' ? 'সিম নম্বর কালেকশন' : 'Manage Numbers'}
                </button>
              </div>

              {simNumSubTab === 'bookings' ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                  <h3 className="text-sm font-black tracking-tight mb-4 flex items-center justify-between">
                    <span>{lang === 'bn' ? 'সিম কার্ড অর্ডারের আবেদনসমূহ' : 'SIM Card Order Applications'}</span>
                    <span className="text-xs bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-bold">
                      {adminSimOrders.filter(o => o.status === 'Pending').length} Pending
                    </span>
                  </h3>

                  {/* Dropdown filters for SIM Bookings */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'অপারেটর ফিল্টার' : 'Filter Operator'}</label>
                      <select
                        value={simBookingOperatorFilter}
                        onChange={(e) => setSimBookingOperatorFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-1.5 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="All">{lang === 'bn' ? 'সব অপারেটর' : 'All Operators'}</option>
                        <option value="GP">GP</option>
                        <option value="Robi">Robi</option>
                        <option value="Airtel">Airtel</option>
                        <option value="Banglalink">Banglalink</option>
                        <option value="Teletalk">Teletalk</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'টাইপ ফিল্টার' : 'Filter SIM Type'}</label>
                      <select
                        value={simBookingTypeFilter}
                        onChange={(e) => setSimBookingTypeFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-1.5 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="All">{lang === 'bn' ? 'সব ধরন' : 'All Types'}</option>
                        <option value="Prepaid">Prepaid</option>
                        <option value="Postpaid">Postpaid</option>
                        <option value="eSIM">eSIM</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'স্ট্যাটাস ফিল্টার' : 'Filter Status'}</label>
                      <select
                        value={simBookingStatusFilter}
                        onChange={(e) => setSimBookingStatusFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-1.5 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="All">{lang === 'bn' ? 'সব স্ট্যাটাস' : 'All Status'}</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const filteredSimOrders = adminSimOrders.filter(o => {
                      const matchesOp = simBookingOperatorFilter === 'All' || o.operator === simBookingOperatorFilter;
                      const matchesType = simBookingTypeFilter === 'All' || o.simType === simBookingTypeFilter;
                      const matchesStatus = simBookingStatusFilter === 'All' || o.status === simBookingStatusFilter;
                      return matchesOp && matchesType && matchesStatus;
                    });

                    if (filteredSimOrders.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500 font-semibold text-xs">
                          {lang === 'bn' ? 'ফিল্টার অনুযায়ী কোনো সিম কার্ড অর্ডার পাওয়া যায়নি!' : 'No SIM card orders match your selected filters.'}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {filteredSimOrders.map((order, index) => {
                          const isPending = order.status === 'Pending';
                          const operatorColor = order.operator === 'GP' ? 'bg-sky-500' :
                                                order.operator === 'Robi' ? 'bg-[#e2125d]' :
                                                order.operator === 'Airtel' ? 'bg-rose-600' :
                                                order.operator === 'Banglalink' ? 'bg-orange-500' :
                                                'bg-emerald-600';
                          
                          // Handle pricing labels beautifully
                          const isBookingPaid = typeof order.bookingFee === 'number';
                          const bookingFeeAmt = isBookingPaid ? order.bookingFee : (order.totalCost || 150);
                          const dueAmt = isBookingPaid ? (order.dueAmount || 0) : 0;

                        return (
                          <div key={`${order.id || index}-${index}`} className="bg-slate-950 border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row gap-5 items-start justify-between hover:border-slate-700/80 transition-all">
                            {/* Order specifications details */}
                            <div className="space-y-2 flex-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                  order.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  order.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                }`}>
                                  {order.status}
                                </span>
                                <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded-md ${operatorColor}`}>
                                  {order.operator}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono font-bold">ID: {order.id}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                {/* Customer Information Column */}
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-bold text-slate-400">{lang === 'bn' ? 'গ্রাহকের বিবরণ' : 'Customer Info'}</p>
                                  <p className="font-extrabold text-slate-200">{order.userName}</p>
                                  <p className="text-[11px] text-slate-400">{order.userEmail}</p>
                                  <p className="text-[11px] text-blue-400 font-bold flex items-center gap-1 cursor-pointer" onClick={() => handleCopyToClipboard(order.contactPhone, order.id + '-phone')}>
                                    <span>{order.contactPhone}</span>
                                    <Copy className="h-3 w-3" />
                                  </p>
                                </div>

                                {/* SIM Specifications Column */}
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-bold text-slate-400">{lang === 'bn' ? 'সিমের বিবরণ' : 'SIM Particulars'}</p>
                                  <p className="font-extrabold text-slate-200">
                                    {order.simType === 'eSIM' ? 'eSIM (Digital)' : `${order.simType} SIM Card`}
                                  </p>
                                  <p className="text-xs font-black font-mono text-indigo-400">
                                    {lang === 'bn' ? 'পছন্দের নম্বর: ' : 'Chosen Number: '} {order.chosenNumber}
                                  </p>
                                  
                                  {/* Detailed Booking Pricing display */}
                                  <div className="pt-1.5 space-y-0.5 text-[11px] font-semibold">
                                    <p className="text-slate-300">
                                      {lang === 'bn' ? 'মোট মূল্য: ' : 'Total Cost: '} <span className="font-mono text-slate-100 font-black">৳{order.totalCost}</span>
                                    </p>
                                    <p className="text-emerald-400">
                                      {lang === 'bn' ? 'বুকিং ফি পরিশোধিত: ' : 'Booking Fee Paid: '} <span className="font-mono font-black">৳{bookingFeeAmt}</span>
                                    </p>
                                    <p className="text-amber-400">
                                      {lang === 'bn' ? 'দোকানে পরিশোধযোগ্য বাকি: ' : 'Due Amount at Shop: '} <span className="font-mono font-black">৳{dueAmt}</span>
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-slate-500 pt-1">{new Date(order.date).toLocaleString()}</p>
                                </div>
                              </div>

                              {/* Delivery & NID information */}
                              <div className="pt-2 border-t border-white/5 space-y-1 text-[11px]">
                                <p className="text-slate-300">
                                  <strong className="text-slate-400">{lang === 'bn' ? 'এনআইডি (NID) নম্বর:' : 'NID Number:'}</strong> <span className="font-mono text-indigo-300 font-bold">{order.nidNumber}</span>
                                </p>
                                <p className="text-slate-300">
                                  <strong className="text-slate-400">{lang === 'bn' ? 'ডেলিভারি ঠিকানা:' : 'Shipping Address:'}</strong> {order.deliveryAddress}
                                </p>
                                {order.note && (
                                  <p className="text-slate-400 italic">
                                    <strong>Memo:</strong> {order.note}
                                  </p>
                                )}
                                {order.rejectionReason && (
                                  <p className="text-rose-400 font-semibold bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl mt-1">
                                    <strong>Rejection Reason:</strong> {order.rejectionReason}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Approval reject action CTAs */}
                            {isPending && (
                              <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                                <button
                                  onClick={() => handleApproveSimOrder(order)}
                                  className="flex-1 md:w-36 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Check className="h-4 w-4" />
                                  <span>{lang === 'bn' ? 'ডেলিভার করুন' : 'Approve & Ship'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingSimOrderId(order.id);
                                    setSimOrderRejectReason('');
                                  }}
                                  className="flex-1 md:w-36 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black shadow-md shadow-rose-500/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <X className="h-4 w-4" />
                                  <span>{lang === 'bn' ? 'বাতিল করুন' : 'Reject Order'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Form to Add / Edit SIM Numbers */}
                  <form onSubmit={handleSaveSimNumber} className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-4 text-slate-100">
                    <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
                      {editingSimNumId ? (lang === 'bn' ? 'সিম নম্বর এডিট করুন' : 'Edit SIM Number') : (lang === 'bn' ? 'নতুন সিম নম্বর যোগ করুন' : 'Add New SIM Number')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'অপারেটর' : 'Operator'}</label>
                        <select
                          value={simNumForm.operator}
                          onChange={(e) => setSimNumForm({ ...simNumForm, operator: e.target.value as Operator })}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                        >
                          <option value="GP">GP</option>
                          <option value="Robi">Robi</option>
                          <option value="Airtel">Airtel</option>
                          <option value="Banglalink">Banglalink</option>
                          <option value="Teletalk">Teletalk</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 01711-223344"
                          value={simNumForm.number}
                          onChange={(e) => {
                            const val = e.target.value;
                            let detectedOp = simNumForm.operator;
                            const cleanVal = val.replace(/[\s-]/g, '');
                            if (cleanVal.startsWith('017') || cleanVal.startsWith('013') || cleanVal.startsWith('+88017') || cleanVal.startsWith('+88013')) {
                              detectedOp = 'GP';
                            } else if (cleanVal.startsWith('018') || cleanVal.startsWith('+88018')) {
                              detectedOp = 'Robi';
                            } else if (cleanVal.startsWith('016') || cleanVal.startsWith('+88016')) {
                              detectedOp = 'Airtel';
                            } else if (cleanVal.startsWith('019') || cleanVal.startsWith('014') || cleanVal.startsWith('+88019') || cleanVal.startsWith('+88014')) {
                              detectedOp = 'Banglalink';
                            } else if (cleanVal.startsWith('015') || cleanVal.startsWith('+88015')) {
                              detectedOp = 'Teletalk';
                            }
                            setSimNumForm({ ...simNumForm, number: val, operator: detectedOp });
                          }}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'ধরন' : 'Type'}</label>
                        <select
                          value={simNumForm.type}
                          onChange={(e) => {
                            const newType = e.target.value as 'Regular' | 'VIP';
                            setSimNumForm({ 
                              ...simNumForm, 
                              type: newType,
                              fullPrice: newType === 'VIP' ? 450 : 150,
                              bookingFee: newType === 'VIP' ? 100 : 50
                            });
                          }}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                        >
                          <option value="Regular">Regular</option>
                          <option value="VIP">VIP Golden</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'সম্পূর্ণ মূল্য (৳)' : 'Full Price (৳)'}</label>
                        <input
                          type="number"
                          required
                          value={simNumForm.fullPrice}
                          onChange={(e) => setSimNumForm({ ...simNumForm, fullPrice: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'বুকিং ফি (৳)' : 'Booking Fee (৳)'}</label>
                        <input
                          type="number"
                          required
                          value={simNumForm.bookingFee}
                          onChange={(e) => setSimNumForm({ ...simNumForm, bookingFee: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</label>
                        <select
                          value={simNumForm.status}
                          onChange={(e) => setSimNumForm({ ...simNumForm, status: e.target.value as any })}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                        >
                          <option value="Available">Available</option>
                          <option value="Locked">Locked (Unavailable)</option>
                          <option value="Booked">Booked (Ordered)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      {editingSimNumId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSimNumId(null);
                            setSimNumForm({
                              number: '',
                              operator: 'GP',
                              type: 'Regular',
                              status: 'Available',
                              fullPrice: 150,
                              bookingFee: 50
                            });
                          }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSavingSimNum}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingSimNum ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>{editingSimNumId ? (lang === 'bn' ? 'আপডেট করুন' : 'Update Number') : (lang === 'bn' ? 'নম্বর যোগ করুন' : 'Add Number')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* List / Table of Available SIM Numbers */}
                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <h3 className="text-sm font-black tracking-tight">{lang === 'bn' ? 'সিম নম্বর গ্যালারি' : 'SIM Numbers Collection'}</h3>
                      <input
                        type="text"
                        placeholder={lang === 'bn' ? 'নম্বর দিয়ে খুঁজুন...' : 'Search by number...'}
                        value={simNumbersSearchQuery}
                        onChange={(e) => setSimNumbersSearchQuery(e.target.value)}
                        className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none w-full md:w-64 focus:border-indigo-500 font-semibold"
                      />
                    </div>

                    {/* Dropdown filters for SIM Numbers Collection */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'অপারেটর ফিল্টার' : 'Filter Operator'}</label>
                        <select
                          value={simNumberOperatorFilter}
                          onChange={(e) => setSimNumberOperatorFilter(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-1.5 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                        >
                          <option value="All">{lang === 'bn' ? 'সব অপারেটর' : 'All Operators'}</option>
                          <option value="GP">GP</option>
                          <option value="Robi">Robi</option>
                          <option value="Airtel">Airtel</option>
                          <option value="Banglalink">Banglalink</option>
                          <option value="Teletalk">Teletalk</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'টাইপ ফিল্টার' : 'Filter Type'}</label>
                        <select
                          value={simNumberTypeFilter}
                          onChange={(e) => setSimNumberTypeFilter(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-1.5 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                        >
                          <option value="All">{lang === 'bn' ? 'সব ধরন' : 'All Types'}</option>
                          <option value="Regular">Regular</option>
                          <option value="VIP">VIP Golden</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'স্ট্যাটাস ফিল্টার' : 'Filter Status'}</label>
                        <select
                          value={simNumberStatusFilter}
                          onChange={(e) => setSimNumberStatusFilter(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 text-white rounded-xl py-1.5 px-3 text-xs outline-none focus:border-indigo-500 font-bold"
                        >
                          <option value="All">{lang === 'bn' ? 'সব স্ট্যাটাস' : 'All Status'}</option>
                          <option value="Available">Available</option>
                          <option value="Locked">Locked</option>
                          <option value="Booked">Booked</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-4">{lang === 'bn' ? 'অপারেটর' : 'Operator'}</th>
                            <th className="py-3 px-4">{lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}</th>
                            <th className="py-3 px-4">{lang === 'bn' ? 'টাইপ' : 'Type'}</th>
                            <th className="py-3 px-4">{lang === 'bn' ? 'সম্পূর্ণ মূল্য' : 'Full Price'}</th>
                            <th className="py-3 px-4">{lang === 'bn' ? 'বুকিং ফি' : 'Booking Fee'}</th>
                            <th className="py-3 px-4">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                            <th className="py-3 px-4 text-right">{lang === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {adminSimNumbers
                            .filter(n => {
                              const queryLower = simNumbersSearchQuery.toLowerCase();
                              const matchesSearch = (
                                (n.number || '').toLowerCase().includes(queryLower) ||
                                (n.operator || '').toLowerCase().includes(queryLower) ||
                                (n.type || '').toLowerCase().includes(queryLower) ||
                                (n.status || '').toLowerCase().includes(queryLower)
                              );
                              const matchesOp = simNumberOperatorFilter === 'All' || n.operator === simNumberOperatorFilter;
                              const matchesType = simNumberTypeFilter === 'All' || n.type === simNumberTypeFilter;
                              const matchesStatus = simNumberStatusFilter === 'All' || n.status === simNumberStatusFilter;
                              return matchesSearch && matchesOp && matchesType && matchesStatus;
                            })
                            .map((num, idx) => {
                              const opColor = num.operator === 'GP' ? 'bg-sky-500' :
                                              num.operator === 'Robi' ? 'bg-[#e2125d]' :
                                              num.operator === 'Airtel' ? 'bg-rose-600' :
                                              num.operator === 'Banglalink' ? 'bg-orange-500' :
                                              'bg-emerald-600';
                              return (
                                <tr key={num.id || idx} className="hover:bg-white/5 transition-colors font-semibold text-slate-200">
                                  <td className="py-3 px-4">
                                    <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-md ${opColor}`}>
                                      {num.operator}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-slate-100">{num.number}</td>
                                  <td className="py-3 px-4">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      num.type === 'VIP' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {num.type}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono">৳{num.fullPrice}</td>
                                  <td className="py-3 px-4 font-mono text-[#e2125d]">৳{num.bookingFee}</td>
                                  <td className="py-3 px-4">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                      num.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      num.status === 'Booked' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {num.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      {/* Quick Lock/Unlock Status toggle */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleSimNumberStatus(num)}
                                        title={num.status === 'Locked' ? 'Unlock Number' : 'Lock Number'}
                                        disabled={num.status === 'Booked'}
                                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                          num.status === 'Locked'
                                            ? 'bg-rose-600/20 border-rose-500/20 text-rose-400 hover:bg-rose-600/30'
                                            : 'bg-emerald-600/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/30'
                                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                                      >
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                      </button>
                                      {/* Edit Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSimNumId(num.id);
                                          setSimNumForm({
                                            number: num.number,
                                            operator: num.operator,
                                            type: num.type,
                                            status: num.status,
                                            fullPrice: num.fullPrice,
                                            bookingFee: num.bookingFee
                                          });
                                        }}
                                        className="p-1.5 bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg cursor-pointer"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      {/* Delete Button */}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSimNumber(num.id)}
                                        className="p-1.5 bg-rose-600/20 border border-rose-500/20 text-rose-400 hover:bg-rose-600/30 rounded-lg cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {adminSimNumbers.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-500 font-semibold text-xs">
                                {lang === 'bn' ? 'কোনো নম্বর পাওয়া যায়নি!' : 'No numbers found! Adding or seeding on load...'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SIM Order Rejection Custom Dialog Prompt */}
              {rejectingSimOrderId && (
                <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
                  <div 
                    onClick={() => setRejectingSimOrderId(null)}
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
                  />
                  <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 border border-slate-100 flex flex-col space-y-4 relative z-50 animate-scale-up text-slate-800">
                    <div className="flex items-center gap-2.5 text-rose-600 pb-1 border-b border-slate-100">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <h3 className="text-slate-950 font-black text-sm tracking-tight">
                        {lang === 'bn' ? 'সিম অর্ডার বাতিল করুন' : 'Reject SIM Order'}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      {lang === 'bn' ? 'অর্ডারটি রিজেক্ট করার কারণ লিখুন। এটি গ্রাহকের প্যানেলে দেখা যাবে এবং ওয়ালেট টাকা ফেরত যাবে।' : 'Specify why you are rejecting this SIM order. The customer will be refunded automatically.'}
                    </p>

                    <input
                      type="text"
                      required
                      placeholder={lang === 'bn' ? 'যেমন: ভুল এনআইডি নম্বর, অসম্পূর্ণ ঠিকানা ইত্যাদি' : 'e.g., Invalid NID, Incomplete address...'}
                      value={simOrderRejectReason}
                      onChange={(e) => setSimOrderRejectReason(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 outline-none focus:border-rose-500"
                    />

                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setRejectingSimOrderId(null)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer text-center"
                      >
                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const orderObj = adminSimOrders.find(o => o.id === rejectingSimOrderId);
                          if (orderObj) {
                            handleRejectSimOrder(orderObj, simOrderRejectReason);
                          }
                        }}
                        className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/10 transition-all active:scale-98 cursor-pointer text-center"
                      >
                        {lang === 'bn' ? 'বাতিল করুন' : 'Reject & Refund'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. KYC VERIFICATION MANAGEMENT */}
          {activeSubTab === 'kyc' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 bg-white/5 p-4 rounded-3xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm tracking-tight">
                      {lang === 'bn' ? 'কেওয়াইসি ভেরিফিকেশন রিকুয়েস্ট' : 'KYC Verification Requests'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {registeredUsers.filter(u => u.kycStatus === 'pending').length} {lang === 'bn' ? 'টি রিকুয়েস্ট পেন্ডিং' : 'Requests Pending'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {registeredUsers.filter(u => u.kycStatus === 'pending').map((user, index) => (
                  <div key={`${user.uid || index}-${index}`} className="bg-slate-950 border border-white/5 rounded-3xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-sm">
                          {user.displayName?.[0] || 'U'}
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-xs">{user.displayName}</h4>
                          <p className="text-[10px] text-slate-500 font-mono">{user.phone || user.email}</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-wider border border-amber-500/20">
                        {lang === 'bn' ? 'পেন্ডিং' : 'Pending'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-2xl">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase">{lang === 'bn' ? 'এনআইডি নাম' : 'NID Name'}</span>
                        <p className="text-white text-[11px] font-bold">{user.kycData?.fullName}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase">{lang === 'bn' ? 'এনআইডি নম্বর' : 'NID Number'}</span>
                        <p className="text-white text-[11px] font-bold">{user.kycData?.nidNumber}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase">{lang === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}</span>
                        <p className="text-white text-[11px] font-bold">{user.kycData?.dob}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase">{lang === 'bn' ? 'জমাদান' : 'Submitted'}</span>
                        <p className="text-white text-[11px] font-bold">{user.kycData?.submittedAt ? new Date(user.kycData.submittedAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase ml-1">{lang === 'bn' ? 'সামনের অংশ' : 'Front Side'}</span>
                        <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                          <img src={user.kycData?.nidFrontUrl} alt="Front" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase ml-1">{lang === 'bn' ? 'পিছনের অংশ' : 'Back Side'}</span>
                        <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                          <img src={user.kycData?.nidBackUrl} alt="Back" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => setRejectingKycUserId(user.uid)}
                        className="py-3 bg-rose-600/10 text-rose-500 rounded-2xl text-[10px] font-black border border-rose-500/20 hover:bg-rose-600/20 transition-all cursor-pointer"
                      >
                        {lang === 'bn' ? 'বাতিল করুন' : 'Reject KYC'}
                      </button>
                      <button
                        onClick={() => handleApproveKyc(user.uid)}
                        className="py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all cursor-pointer"
                      >
                        {lang === 'bn' ? 'এপ্রুভ করুন' : 'Approve KYC'}
                      </button>
                    </div>
                  </div>
                ))}

                {registeredUsers.filter(u => u.kycStatus === 'pending').length === 0 && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center space-y-3 bg-white/5 rounded-[32px] border border-white/5">
                    <div className="p-4 bg-white/5 rounded-full">
                      <ShieldCheck className="h-8 w-8 text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-500 font-bold">
                      {lang === 'bn' ? 'কোন পেন্ডিং কেওয়াইসি রিকুয়েস্ট নেই' : 'No pending KYC requests found'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. SCRATCH CARDS MANAGEMENT */}
          {activeSubTab === 'scratch' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-orange-500" />
                    <span>{lang === 'bn' ? 'স্ক্র্যাচ কার্ড ম্যানেজমেন্ট' : 'Manage Scratch Cards'}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-950/40 border border-white/5 p-5 rounded-2xl">
                    <h4 className="text-xs font-black text-slate-300 mb-4">{lang === 'bn' ? 'নতুন কার্ড যোগ করুন' : 'Add New Scratch Card'}</h4>
                    <form onSubmit={handleSaveScratchCard} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Operator</label>
                          <select
                            value={scratchForm.operator}
                            onChange={(e) => setScratchForm({...scratchForm, operator: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="Grameenphone">Grameenphone</option>
                            <option value="Banglalink">Banglalink</option>
                            <option value="Robi">Robi</option>
                            <option value="Airtel">Airtel</option>
                            <option value="Teletalk">Teletalk</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Price</label>
                          <input
                            type="number"
                            required
                            value={scratchForm.price}
                            onChange={(e) => setScratchForm({...scratchForm, price: Number(e.target.value)})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Title / Package Details</label>
                        <input
                          type="text"
                          required
                          value={scratchForm.title}
                          onChange={(e) => setScratchForm({...scratchForm, title: e.target.value})}
                          placeholder="e.g. 1 GB + 20 Min or 50 Tk Recharge"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                          <span>Secret PIN</span>
                          <label className="flex items-center gap-1 text-orange-400 hover:text-orange-300 cursor-pointer">
                            <Plus className="h-3 w-3" />
                            <span>Scan with Camera</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment"
                              className="hidden" 
                              onChange={handleScanPin}
                            />
                          </label>
                        </label>
                        {isScanningPin && (
                          <div className="text-[10px] text-orange-500 animate-pulse font-bold">Scanning image with OCR...</div>
                        )}
                        <input
                          type="text"
                          required
                          value={scratchForm.pin}
                          onChange={(e) => setScratchForm({...scratchForm, pin: e.target.value})}
                          placeholder="Enter PIN number"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Validity</label>
                        <input
                          type="text"
                          value={scratchForm.validity}
                          onChange={(e) => setScratchForm({...scratchForm, validity: e.target.value})}
                          placeholder="e.g., ২ দিন"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Dial Code</label>
                        <input
                          type="text"
                          value={scratchForm.dialCode}
                          onChange={(e) => setScratchForm({...scratchForm, dialCode: e.target.value})}
                          placeholder="e.g., *121*PIN#"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isProcessing === 'scratch'}
                          className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50"
                        >
                          {editingScratchId ? (lang === 'bn' ? 'আপডেট করুন' : 'Update Card') : (lang === 'bn' ? 'সেভ করুন' : 'Save Scratch Card')}
                        </button>
                        {editingScratchId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingScratchId(null);
                              setScratchForm({ operator: 'Grameenphone', title: '1 GB + 20 Min', price: 20, pin: '', validity: '২ দিন', dialCode: '*১২১*পিন#' });
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl text-xs font-black transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="bg-slate-950/40 border border-white/5 p-5 rounded-2xl flex flex-col h-[500px]">
                    <h4 className="text-xs font-black text-slate-300 mb-4">{lang === 'bn' ? 'কার্ড তালিকা' : 'Inventory List'}</h4>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                      {scratchCards.map((card, index) => {
                        const parsed = parseTitle(card.title);

                        return (
                          <div key={`${card.id || index}-${index}`} className="aspect-[3.5/1] w-full bg-gradient-to-br from-[#006a4e] to-[#f42a41] rounded-xl shadow-md border-2 border-white p-3 flex flex-col justify-between text-white select-none relative overflow-hidden">
                            {/* Top Section */}
                            <div className="flex justify-between items-center relative z-10">
                              <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border border-white/10 uppercase">
                                {localizeOperatorName(card.operator)}
                              </div>
                              <div className="text-sm font-black drop-shadow-md flex items-center gap-1.5">
                                <span className="opacity-80 text-xs">৳</span>
                                <span>{card.price}</span>
                                <span className="text-[10px] font-bold opacity-70 ml-1">
                                  ({parsed.number || card.title} {parsed.rest})
                                </span>
                              </div>
                            </div>

                            {/* Middle: PIN Area */}
                            <div className="bg-white py-1.5 rounded-lg text-center relative border border-white/30 shadow-inner group-hover:bg-white transition-colors">
                              <p className="text-[11px] font-mono font-black text-slate-800 tracking-wider">
                                {card.pin.split('').map((char, i) => (
                                  <span key={i} className={i % 4 === 0 && i !== 0 ? 'ml-2' : ''}>{char}</span>
                                ))}
                              </p>
                              <div className="absolute top-1 right-2">
                                <div className={`w-2 h-2 rounded-full ${card.status === 'sold' ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse'}`} />
                              </div>
                            </div>

                            {/* Bottom Section */}
                            <div className="flex justify-between items-center text-[9px] font-bold opacity-90 relative z-10">
                              <div className="flex items-center gap-2">
                                <span className={`bg-white/10 px-1.5 rounded uppercase ${card.status === 'sold' ? 'text-rose-200' : 'text-emerald-200'}`}>{card.status === 'sold' ? 'USED' : 'AVAILABLE'}</span>
                                <span>{card.dialCode || '*১২১*পিন#'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] opacity-60">{localizeOperatorName(card.operator)}</span>
                                <button
                                  onClick={() => handleEditScratchCard(card)}
                                  className="p-1.5 bg-white/20 hover:bg-orange-500 text-white rounded-lg transition-all shadow-sm"
                                  title="Edit Card"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteScratchCard(card.id)}
                                  className="p-1.5 bg-white/20 hover:bg-rose-600 text-white rounded-lg transition-all shadow-sm"
                                  title="Delete Card"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Glossy overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
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

      {/* KYC REJECTION MODAL */}
      {rejectingKycUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRejectingKycUserId(null)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-slate-100 space-y-4 z-10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-slate-900 font-black text-sm tracking-tight flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                <span>{lang === 'bn' ? 'কেওয়াইসি বাতিলের কারণ' : 'KYC Rejection Reason'}</span>
              </h3>
              <button onClick={() => setRejectingKycUserId(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRejectKyc} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                  {lang === 'bn' ? 'কেন বাতিল করা হচ্ছে?' : 'Why is it being rejected?'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={kycRejectReason}
                  onChange={e => setKycRejectReason(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: ঝাপসা ছবি, ভুল তথ্য...' : 'e.g. Blurry photo, Incorrect details...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-rose-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingKycUserId(null)}
                  className="py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="py-3 bg-rose-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-rose-600/20"
                >
                  {lang === 'bn' ? 'বাতিল নিশ্চিত করুন' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </motion.div>
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-0 lg:p-4'}`}>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer ${isFullScreen ? 'hidden' : 'hidden lg:block'}`}
      />
      {adminPanelBody}
    </div>
  );
}
