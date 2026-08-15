import React, { useState } from 'react';
import { 
  X, Smartphone, RefreshCw, Sparkles, Search, Filter, Plus, 
  MapPin, Phone, MessageSquare, ShieldCheck, CheckCircle2, 
  DollarSign, ArrowLeftRight, Tag, Info, AlertCircle, Camera,
  Share2, Eye, Cpu, HardDrive, Battery, Image as ImageIcon,
  ChevronRight, Award, Zap, Check, Trash2, SlidersHorizontal,
  ArrowUpDown, Maximize2, Copy, Send, CheckCheck, Scale, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PhoneListing, Language } from '../types';

export interface DirectMessage {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage?: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  offerDetails?: {
    phoneModel?: string;
    cashTopup?: string;
  };
}

interface PhoneExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  listings: PhoneListing[];
  onCreateListing: (newListing: Omit<PhoneListing, 'id' | 'createdAt' | 'status'>) => void;
  onDeleteListing?: (id: string) => void;
  onUpdateListingStatus?: (id: string, status: 'Active' | 'Sold' | 'Exchanged') => void;
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserPhone?: string;
}

export default function PhoneExchangeModal({
  isOpen,
  onClose,
  lang,
  listings,
  onCreateListing,
  onDeleteListing,
  onUpdateListingStatus,
  currentUserEmail,
  currentUserName,
  currentUserPhone,
}: PhoneExchangeModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'post' | 'my_ads' | 'inbox' | 'ai_advisor'>('all');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [filterType, setFilterType] = useState<'All' | 'Sell' | 'Exchange' | 'Both'>('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [selectedListing, setSelectedListing] = useState<PhoneListing | null>(null);

  // Form State for Posting New Listing
  const [postTitle, setPostTitle] = useState('');
  const [postBrand, setPostBrand] = useState('Apple');
  const [postModel, setPostModel] = useState('');
  const [postRam, setPostRam] = useState('8 GB');
  const [postRom, setPostRom] = useState('128 GB');
  const [postBattery, setPostBattery] = useState('100% Health / 5000 mAh');
  const [postCamera, setPostCamera] = useState('50 MP Main + 12 MP Ultrawide');
  const [postProcessor, setPostProcessor] = useState('Octa-Core High Performance');
  const [postDisplay, setPostDisplay] = useState('6.67 inch AMOLED 120Hz');
  const [postSim, setPostSim] = useState('Dual SIM 5G');
  const [postPurchaseDate, setPostPurchaseDate] = useState('6 Months Ago');
  const [postUsageDuration, setPostUsageDuration] = useState('5 Months Used');
  const [postCondition, setPostCondition] = useState<'Mint / Like New' | 'Good (Minor Marks)' | 'Fair / Has Scratches' | 'Needs Screen Repair'>('Mint / Like New');
  const [postListingType, setPostListingType] = useState<'Sell' | 'Exchange' | 'Both'>('Both');
  const [postExpectedPrice, setPostExpectedPrice] = useState<number>(35000);
  const [postSwapTarget, setPostSwapTarget] = useState('');
  const [postCashTopup, setPostCashTopup] = useState('');
  const [postReason, setPostReason] = useState('Upgrading to new model');
  const [postAccessories, setPostAccessories] = useState<string[]>([
    'Original Box & IMEI Match',
    'Original Charger Cable',
    'Money Receipt / Cash Memo'
  ]);
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postImageUrlsList, setPostImageUrlsList] = useState<string[]>([
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80'
  ]);
  const [postSellerName, setPostSellerName] = useState(currentUserName || 'Nihad User');
  const [postSellerPhone, setPostSellerPhone] = useState(currentUserPhone || '01700000000');
  const [postSellerLocation, setPostSellerLocation] = useState('Dhanmondi, Dhaka');

  // AI Assistant States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSpecInput, setAiSpecInput] = useState('');
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');
  
  // AI Estimator Tool State
  const [aiEstimateModel, setAiEstimateModel] = useState('iPhone 13 Pro');
  const [aiEstimateCondition, setAiEstimateCondition] = useState('Mint / Like New');
  const [aiEstimatePrice, setAiEstimatePrice] = useState(75000);
  const [aiEstimateResult, setAiEstimateResult] = useState<any>(null);

  // Swap Evaluator Modal State inside Listing details
  const [swapTargetInput, setSwapTargetInput] = useState('Galaxy S23 Ultra');
  const [swapEvalResult, setSwapEvalResult] = useState<any>(null);
  const [isEvaluatingSwap, setIsEvaluatingSwap] = useState(false);

  // Advanced Sorting & Filter States
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [maxPrice, setMaxPrice] = useState<number>(200000);

  // Comparison Tool State (max 2 items)
  const [compareItems, setCompareItems] = useState<PhoneListing[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Lightbox Image Preview State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Direct Swap Offer Modal State
  const [swapOfferItem, setSwapOfferItem] = useState<PhoneListing | null>(null);
  const [offerPhoneModel, setOfferPhoneModel] = useState('');
  const [offerCashTopup, setOfferCashTopup] = useState('');
  const [offerMsg, setOfferMsg] = useState('');

  // Copy Toast Feedback
  const [copyToast, setCopyToast] = useState(false);

  // Direct In-App Chat & Messaging State
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => {
    try {
      const saved = localStorage.getItem('phone_exchange_direct_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'msg-1',
        listingId: 'sample-1',
        listingTitle: 'iPhone 13 Pro Max - 256GB',
        listingImage: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
        senderName: 'তানভীর আহমেদ',
        senderPhone: '01812345678',
        recipientName: currentUserName || 'আপনি',
        recipientPhone: currentUserPhone || '01700000000',
        text: 'আসসালামু আলাইকুম! আপনার iPhone 13 Pro Max ফোনটির সাথে আমার Samsung S22 Ultra + ৳১০,০০০ ক্যাশ এক্সচেঞ্জ করতে আগ্রহী। রাজি থাকলে বলবেন!',
        timestamp: '১০:৪৫ AM, আজ',
        isMine: false,
        offerDetails: {
          phoneModel: 'Samsung S22 Ultra 256GB',
          cashTopup: '+ ৳১০,০০০'
        }
      }
    ];
  });

  const [activeChatListing, setActiveChatListing] = useState<PhoneListing | null>(null);
  const [chatMessageText, setChatMessageText] = useState('');
  const [inboxSearch, setInboxSearch] = useState('');
  const [messageToast, setMessageToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const brandsList = ['All', 'Apple', 'Samsung', 'Xiaomi', 'Realme', 'OnePlus', 'Google Pixel', 'Vivo', 'Oppo', 'Other'];

  // Accessories Checklist options
  const accessoryOptions = [
    'Original Box & IMEI Match',
    'Original Charger Cable',
    'Original Fast Charging Adapter',
    'Money Receipt / Cash Memo',
    'Official Warranty Card',
    'Back Cover / Screen Protector'
  ];

  const handleToggleAccessory = (acc: string) => {
    if (postAccessories.includes(acc)) {
      setPostAccessories(postAccessories.filter(a => a !== acc));
    } else {
      setPostAccessories([...postAccessories, acc]);
    }
  };

  const handleAddImage = () => {
    if (postImageUrl && postImageUrl.trim().startsWith('http')) {
      setPostImageUrlsList([...postImageUrlsList, postImageUrl.trim()]);
      setPostImageUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setPostImageUrlsList((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Call Server AI to Auto Spec Fill
  const handleAiAutoSpec = async () => {
    if (!aiSpecInput.trim()) return;
    setAiLoading(true);
    setAiSuccessMsg('');

    try {
      const res = await fetch('/api/ai-phone-estimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_spec',
          modelQuery: aiSpecInput.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const spec = data.data;
        if (spec.brand) setPostBrand(spec.brand);
        if (spec.model) setPostModel(spec.model);
        if (spec.suggestedTitle) setPostTitle(spec.suggestedTitle);
        if (spec.ram) setPostRam(spec.ram);
        if (spec.rom) setPostRom(spec.rom);
        if (spec.display) setPostDisplay(spec.display);
        if (spec.processor) setPostProcessor(spec.processor);
        if (spec.camera) setPostCamera(spec.camera);
        if (spec.battery) setPostBattery(spec.battery);
        if (spec.sim) setPostSim(spec.sim);
        if (spec.estimatedNewPriceBdt) setPostExpectedPrice(Math.round(spec.estimatedNewPriceBdt * 0.65));
        if (spec.generatedDescriptionBn) setPostReason(spec.generatedDescriptionBn);

        setAiSuccessMsg(lang === 'bn' ? '✨ AI স্পেসিফিকেশন ও বিবরণ সফলভাবে জেনারেট হয়েছে!' : '✨ AI successfully generated phone specifications!');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Call Server AI for Price Valuation
  const handleAiPriceEstimate = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-phone-estimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'estimate_price',
          phoneData: {
            brand: 'Smart Device',
            model: aiEstimateModel,
            condition: aiEstimateCondition,
            expectedPrice: aiEstimatePrice,
            ram: '8 GB',
            rom: '128 GB',
            usageDuration: '6 Months'
          }
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiEstimateResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Call Server AI to Evaluate Swap
  const handleAiSwapEvaluate = async (targetPhoneTitle: string) => {
    setIsEvaluatingSwap(true);
    try {
      const res = await fetch('/api/ai-phone-estimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_swap',
          swapData: {
            myPhone: swapTargetInput,
            targetPhone: targetPhoneTitle
          }
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSwapEvalResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluatingSwap(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postModel || !postExpectedPrice) return;

    onCreateListing({
      title: postTitle || `${postBrand} ${postModel} (${postRam}/${postRom})`,
      brand: postBrand,
      model: postModel,
      ram: postRam,
      rom: postRom,
      batteryHealth: postBattery,
      camera: postCamera,
      processor: postProcessor,
      display: postDisplay,
      sim: postSim,
      purchaseDate: postPurchaseDate,
      usageDuration: postUsageDuration,
      condition: postCondition,
      listingType: postListingType,
      expectedPrice: Number(postExpectedPrice),
      swapTarget: postSwapTarget,
      cashTopup: postCashTopup,
      reasonForSelling: postReason,
      includedAccessories: postAccessories,
      images: postImageUrlsList.length > 0 ? postImageUrlsList : ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80'],
      sellerName: postSellerName,
      sellerPhone: postSellerPhone,
      sellerWhatsapp: postSellerPhone,
      sellerLocation: postSellerLocation,
      sellerEmail: currentUserEmail || 'user@test.com',
      isVerifiedSeller: true,
      aiPriceRating: '🔥 Verified Listing',
      userId: currentUserEmail
    });

    setActiveTab('all');
    // Reset Form
    setPostModel('');
    setPostTitle('');
    setAiSuccessMsg('');
  };

  // Helper handlers
  const handleToggleCompare = (item: PhoneListing, e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareItems.some(c => c.id === item.id)) {
      setCompareItems(compareItems.filter(c => c.id !== item.id));
    } else {
      if (compareItems.length >= 2) {
        setCompareItems([compareItems[1], item]);
      } else {
        setCompareItems([...compareItems, item]);
      }
    }
  };

  const handleCopyAd = (item: PhoneListing, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `📱 *${item.title}*\n💰 মূল্য: ৳${item.expectedPrice.toLocaleString('bn-BD')}\n⚙️ র‍্যাম/রম: ${item.ram} • ${item.rom}\n📍 লোকেশন: ${item.sellerLocation}\n📞 যোগাযোগ: ${item.sellerPhone}`;
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const saveMessages = (msgs: DirectMessage[]) => {
    setDirectMessages(msgs);
    try {
      localStorage.setItem('phone_exchange_direct_messages', JSON.stringify(msgs));
    } catch (e) {}
  };

  const handleSendInAppDirectMessage = (
    listing: PhoneListing, 
    customText?: string, 
    offerDetails?: { phoneModel?: string; cashTopup?: string }
  ) => {
    const textToSend = customText !== undefined ? customText : chatMessageText.trim();
    if (!textToSend && !offerDetails) return;

    const newMsg: DirectMessage = {
      id: 'msg-' + Date.now(),
      listingId: listing.id,
      listingTitle: listing.title,
      listingImage: listing.images[0] || '',
      senderName: currentUserName || 'আমি',
      senderPhone: currentUserPhone || '01700000000',
      recipientName: listing.sellerName,
      recipientPhone: listing.sellerPhone,
      text: textToSend || `সোয়াপ অফার: ${offerDetails?.phoneModel || ''} (${offerDetails?.cashTopup || ''})`,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) + ', আজ',
      isMine: true,
      offerDetails
    };

    const updated = [...directMessages, newMsg];
    saveMessages(updated);
    setChatMessageText('');
    setSwapOfferItem(null);
    setMessageToast('💬 ডিরেক্ট ইন-অ্যাপ মেসেজ সফলভাবে পাঠানো হয়েছে!');
    setTimeout(() => setMessageToast(null), 3000);

    // Open active chat window
    setActiveChatListing(listing);
  };

  const handleSendDirectSMS = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
    setMessageToast('📱 ডিরেক্ট SMS মেসেঞ্জার অন করা হয়েছে!');
    setTimeout(() => setMessageToast(null), 3000);
  };

  // Filter and Sort listings
  const filteredListings = listings.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sellerLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBrand = selectedBrand === 'All' || item.brand.toLowerCase() === selectedBrand.toLowerCase();
    const matchesType = filterType === 'All' || item.listingType === filterType || item.listingType === 'Both';
    const matchesCondition = selectedCondition === 'All' || item.condition === selectedCondition;
    const matchesPrice = item.expectedPrice <= maxPrice;

    return matchesSearch && matchesBrand && matchesType && matchesCondition && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === 'price_low') return a.expectedPrice - b.expectedPrice;
    if (sortBy === 'price_high') return b.expectedPrice - a.expectedPrice;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const myFilteredListings = listings.filter(item => 
    currentUserEmail && item.sellerEmail && item.sellerEmail.toLowerCase() === currentUserEmail.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#1a0826] border border-pink-500/30 rounded-3xl shadow-2xl shadow-pink-950/80 text-white overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-pink-900/90 via-purple-900/80 to-slate-900 px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-pink-500 to-rose-600 rounded-2xl shadow-lg shadow-pink-500/30 text-white border border-white/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-display">
                  {lang === 'bn' ? 'ফোন এক্সচেঞ্জ ও সেল বাজার' : 'Phone Exchange & Buy/Sell Hub'}
                </h2>
                <span className="px-2 py-0.5 text-[9.5px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                  <ShieldCheck className="h-2.5 w-2.5 text-emerald-300" />
                  <span>Verified Hub</span>
                </span>
              </div>
              <p className="text-[11px] text-pink-200/80 font-medium">
                {lang === 'bn' ? 'স্মার্টফোন ক্রয়, বিক্রয় ও এক্সচেঞ্জের নিরাপদ প্ল্যাটফর্ম' : 'Verified peer-to-peer smartphone swap & marketplace'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-950/90 px-4 py-2 border-b border-white/10 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'সব বিজ্ঞাপন (' + filteredListings.length + ')' : 'All Listings'}</span>
          </button>

          <button
            onClick={() => setActiveTab('post')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'post'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'বিজ্ঞাপন দিন / এক্সচেঞ্জ' : 'Post Ad / Swap'}</span>
          </button>

          <button
            onClick={() => setActiveTab('my_ads')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'my_ads'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'আমার বিজ্ঞাপন' : 'My Listings'}</span>
          </button>

          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer relative ${
              activeTab === 'inbox'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            <span>{lang === 'bn' ? 'ইনবক্স / মেসেজ' : 'Inbox Messages'}</span>
            {directMessages.length > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-black">
                {directMessages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ai_advisor')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ai_advisor'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-amber-300 hover:bg-amber-500/10 border border-amber-500/30'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            <span>{lang === 'bn' ? 'প্রাইস ও সোয়াপ ক্যালকুলেটর' : 'Price & Swap Estimator'}</span>
          </button>
        </div>

        {/* Tab 1: ALL LISTINGS & SEARCH MARKETPLACE */}
        {activeTab === 'all' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Search and Filters Deck */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === 'bn' ? 'ফোন মডেল, ব্র্যান্ড বা লোকেশন লিখে সার্চ করুন...' : 'Search model, brand or location...'}
                    className="w-full bg-slate-950 border border-white/10 focus:border-rose-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 border border-white/10 rounded-xl">
                  <button
                    onClick={() => setFilterType('All')}
                    className={`px-2.5 py-1.5 text-[10.5px] font-bold rounded-lg transition-all ${
                      filterType === 'All' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'bn' ? 'সব' : 'All'}
                  </button>
                  <button
                    onClick={() => setFilterType('Sell')}
                    className={`px-2.5 py-1.5 text-[10.5px] font-bold rounded-lg transition-all ${
                      filterType === 'Sell' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'bn' ? 'বিক্রয়' : 'For Sale'}
                  </button>
                  <button
                    onClick={() => setFilterType('Exchange')}
                    className={`px-2.5 py-1.5 text-[10.5px] font-bold rounded-lg transition-all ${
                      filterType === 'Exchange' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'bn' ? 'এক্সচেঞ্জ' : 'Swap'}
                  </button>
                </div>
              </div>

              {/* Brands horizontal scroll */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3" />
                  {lang === 'bn' ? 'ব্র্যান্ড:' : 'Brand:'}
                </span>
                {brandsList.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
                      selectedBrand === b
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border-white/5 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {/* Secondary Filter & Sorting Bar */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Price Range Slider */}
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/5 flex-1 min-w-[200px]">
                  <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">সর্বোচ্চ বাজেট:</span>
                  <input
                    type="range"
                    min="10000"
                    max="200000"
                    step="5000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="text-[11px] font-black text-emerald-400 font-mono whitespace-nowrap">
                    ৳{maxPrice.toLocaleString('bn-BD')}
                  </span>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-white/5 shrink-0">
                  <ArrowUpDown className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-[10px] text-slate-400 font-bold">ক্রমানুসারে:</span>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-slate-900">সর্বশেষ বিজ্ঞাপন</option>
                    <option value="price_low" className="bg-slate-900">কম দাম থেকে বেশি</option>
                    <option value="price_high" className="bg-slate-900">বেশি দাম থেকে কম</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Phone Listings Cards Grid */}
            {filteredListings.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-900/40 rounded-2xl border border-dashed border-white/10 space-y-3">
                <Smartphone className="h-10 w-10 text-slate-600 mx-auto animate-bounce" />
                <h3 className="text-sm font-bold text-slate-300">
                  {lang === 'bn' ? 'কোনো ফোন পাওয়া যায়নি!' : 'No phone listings found!'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {lang === 'bn' ? 'আপনার সার্চ কিওয়ার্ড বা বাজেট ফিল্টার পরিবর্তন করুন অথবা নতুন ফোনের বিজ্ঞাপন দিন।' : 'Try changing your search filters or post a new phone ad.'}
                </p>
                <button
                  onClick={() => setActiveTab('post')}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 mt-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{lang === 'bn' ? 'বিজ্ঞাপন তৈরি করুন' : 'Create Phone Ad'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredListings.map(item => {
                  const isCompared = compareItems.some(c => c.id === item.id);
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -3, scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSelectedListing(item)}
                      className={`bg-slate-900/90 border ${
                        isCompared ? 'border-pink-500/80 shadow-lg shadow-pink-500/20' : 'border-white/10 hover:border-pink-500/40'
                      } rounded-2xl p-3.5 transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden`}
                    >
                      {/* Top Tag Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wide border ${
                            item.listingType === 'Exchange' 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                              : item.listingType === 'Sell'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          }`}>
                            {item.listingType === 'Exchange' ? '🔄 এক্সচেঞ্জ' : item.listingType === 'Sell' ? '💰 বিক্রয়' : '🔄 এক্সচেঞ্জ / বিক্রয়'}
                          </span>
                          
                          {item.isVerifiedSeller && (
                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md text-[9px] font-bold flex items-center gap-1">
                              <ShieldCheck className="h-2.5 w-2.5 text-blue-400" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>

                        {/* Top Action Icons (Compare & Copy) */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleToggleCompare(item, e)}
                            title="তুলনা তালিকায় যোগ করুন"
                            className={`px-2 py-0.5 text-[9.5px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                              isCompared
                                ? 'bg-pink-500 text-white border-pink-400 font-black'
                                : 'bg-slate-950/80 text-slate-400 border-white/10 hover:text-white hover:border-white/30'
                            }`}
                          >
                            <Scale className="h-3 w-3" />
                            <span>{isCompared ? 'তুলনায় আছে' : 'তুলনা'}</span>
                          </button>

                          <button
                            onClick={(e) => handleCopyAd(item, e)}
                            title="কপি করুন"
                            className="p-1 bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Main Image and Specs Summary */}
                      <div className="flex items-start gap-3 my-1">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.images && item.images.length > 0) setLightboxImage(item.images[0]);
                          }}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-950 border border-white/10 overflow-hidden shrink-0 relative group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                        >
                          <img
                            src={item.images[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80';
                            }}
                          />
                          <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-slate-950/80 backdrop-blur-md rounded text-[8.5px] font-bold text-slate-300 flex items-center gap-0.5">
                            <ImageIcon className="h-2.5 w-2.5" />
                            <span>{item.images.length}</span>
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-pink-300 transition-colors line-clamp-1 font-display">
                            {item.title}
                          </h4>
                          
                          <p className="text-[11px] text-slate-300 font-bold mt-1">
                            {item.ram} RAM • {item.rom} ROM
                          </p>

                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            কন্ডিশন: <span className="text-amber-300 font-medium">{item.condition}</span> • {item.usageDuration}
                          </p>

                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                            <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
                            <span className="truncate">{item.sellerLocation}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Price & Call Button */}
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">আকাঙ্ক্ষিত মূল্য / বাজেট</span>
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            ৳{item.expectedPrice.toLocaleString('bn-BD')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSwapOfferItem(item);
                            }}
                            className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ArrowLeftRight className="h-3 w-3 text-purple-300" />
                            <span>অফার</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedListing(item);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1 group-hover:shadow-pink-500/30 transition-all cursor-pointer"
                          >
                            <span>ডিটেইলস</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: POST AD FORM WITH AI SPEC FILL */}
        {activeTab === 'post' && (
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleFormSubmit} className="space-y-4 max-w-2xl mx-auto">
              
              {/* Auto Spec Generator Box */}
              <div className="bg-gradient-to-r from-purple-950/80 via-pink-950/80 to-slate-900 border border-pink-500/40 rounded-2xl p-4 shadow-xl relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-pink-500/20 text-pink-300 rounded-lg border border-pink-500/30">
                      <Zap className="h-4 w-4 text-pink-400" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-pink-200 uppercase tracking-wide">
                      ⚡ অটো-স্পেক্স ফিলার (Auto-Fill Specs)
                    </h3>
                  </div>
                  <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-bold">
                    Fast & Easy
                  </span>
                </div>

                <p className="text-[11px] text-pink-200/80 leading-relaxed">
                  আপনার ফোনের মডেল নাম লিখুন (যেমন: <span className="text-amber-300 font-bold">iPhone 13 Pro 128GB</span> অথবা <span className="text-amber-300 font-bold">Galaxy S23 Ultra 12/256GB</span>)। সিস্টেম নিমিষেই অটো স্পেসিফিকেশন ও বিবরণ ফিল করবে।
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiSpecInput}
                    onChange={(e) => setAiSpecInput(e.target.value)}
                    placeholder="মডেল নাম লিখুন... e.g. iPhone 14 Pro Max 256GB"
                    className="flex-1 bg-slate-950/90 border border-pink-500/30 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAiAutoSpec}
                    disabled={aiLoading || !aiSpecInput.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs rounded-xl shadow-lg disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>অটো-ফিল হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5 text-amber-300" />
                        <span>স্পেক্স ফিল করুন</span>
                      </>
                    )}
                  </button>
                </div>

                {aiSuccessMsg && (
                  <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{aiSuccessMsg}</span>
                  </p>
                )}
              </div>

              {/* Basic Listing Details */}
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-rose-300 tracking-wider flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>১. স্মার্টফোনের মৌলিক তথ্য (Basic Device Specs)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">স্মার্টফোন ব্র্যান্ড *</label>
                    <select
                      value={postBrand}
                      onChange={(e) => setPostBrand(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    >
                      {brandsList.filter(b => b !== 'All').map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">মডেল নাম *</label>
                    <input
                      type="text"
                      required
                      value={postModel}
                      onChange={(e) => setPostModel(e.target.value)}
                      placeholder="e.g. Galaxy S23 Ultra"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">বিজ্ঞাপনের শিরোনাম (Title)</label>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="e.g. iPhone 13 Pro Max (128GB) - Fresh Condition"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">RAM / ROM স্টোরেজ</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={postRam}
                        onChange={(e) => setPostRam(e.target.value)}
                        placeholder="RAM (e.g. 8 GB)"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                      <input
                        type="text"
                        value={postRom}
                        onChange={(e) => setPostRom(e.target.value)}
                        placeholder="ROM (e.g. 256 GB)"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">ব্যাটারি হেলথ / ক্যাফাসিটি</label>
                    <input
                      type="text"
                      value={postBattery}
                      onChange={(e) => setPostBattery(e.target.value)}
                      placeholder="e.g. 88% Health / 5000 mAh"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">ক্যামেরা ও প্রসেসর</label>
                    <input
                      type="text"
                      value={postCamera}
                      onChange={(e) => setPostCamera(e.target.value)}
                      placeholder="e.g. 200MP Main Camera + 12MP Ultrawide"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Condition, Type & Pricing */}
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>২. কন্ডিশন, মূল্য ও এক্সচেঞ্জ শর্তাবলী</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">কন্ডিশন কেমন?</label>
                    <select
                      value={postCondition}
                      onChange={(e: any) => setPostCondition(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="Mint / Like New">Mint / Like New (একদম ফ্রেশ)</option>
                      <option value="Good (Minor Marks)">Good (হালকা স্ক্র্যাচ)</option>
                      <option value="Fair / Has Scratches">Fair (ব্যবহারের দাগ আছে)</option>
                      <option value="Needs Screen Repair">Needs Screen Repair (স্ক্রিন ডিসপ্লে ইস্যু)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">বিজ্ঞাপনের ধরন</label>
                    <select
                      value={postListingType}
                      onChange={(e: any) => setPostListingType(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="Both">এক্সচেঞ্জ বা বিক্রি দুটোই (Both)</option>
                      <option value="Sell">শুধুমাত্র বিক্রি (Only Sell)</option>
                      <option value="Exchange">শুধুমাত্র এক্সচেঞ্জ (Only Exchange)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">আকাঙ্ক্ষিত মূল্য (BDT ৳) *</label>
                    <input
                      type="number"
                      required
                      value={postExpectedPrice}
                      onChange={(e) => setPostExpectedPrice(Number(e.target.value))}
                      placeholder="e.g. 45000"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Exchange Target details if Exchange selected */}
                {(postListingType === 'Exchange' || postListingType === 'Both') && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-amber-200 mb-1">
                        কোন মডেলের সাথে এক্সচেঞ্জ করতে চান? (Target Swap Model)
                      </label>
                      <input
                        type="text"
                        value={postSwapTarget}
                        onChange={(e) => setPostSwapTarget(e.target.value)}
                        placeholder="e.g. Exchange with iPhone 14 Pro Max or Galaxy S24 Ultra"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-amber-200 mb-1">
                        ক্যাশ দেওয়া বা নেওয়ার শর্ত (Cash Topup Details)
                      </label>
                      <input
                        type="text"
                        value={postCashTopup}
                        onChange={(e) => setPostCashTopup(e.target.value)}
                        placeholder="e.g. Will take ৳5,000 cash or pay ৳8,000 extra cash for upgrade"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Accessories Checklist & Reason */}
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-purple-300 tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>৩. গ্যাজেট ও অ্যাকসেসরিজ তথ্য</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {accessoryOptions.map(acc => {
                    const isSelected = postAccessories.includes(acc);
                    return (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => handleToggleAccessory(acc)}
                        className={`p-2 rounded-xl text-[10.5px] font-bold border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                            : 'bg-slate-950 text-slate-400 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="truncate mr-1">{acc}</span>
                        {isSelected && <Check className="h-3 w-3 text-purple-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-300 mb-1">বিক্রি বা এক্সচেঞ্জের কারণ / অতিরিক্ত বিবরণ</label>
                  <textarea
                    rows={2}
                    value={postReason}
                    onChange={(e) => setPostReason(e.target.value)}
                    placeholder="মোবাইলটির ব্যাটারি লাইফ, সিকিউরিটি, ইউজেস হিস্ট্রি সংক্ষেপে লিখুন..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Image Upload Link & Gallery Picker */}
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-pink-300 tracking-wider flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-pink-400" />
                  <span>৪. ফোনের ছবি যুক্ত করুন (গ্যালারি থেকে সিলেক্ট করুন বা লিংক দিন)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Gallery File Upload Button */}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 hover:to-rose-500/30 border border-pink-500/40 rounded-xl cursor-pointer text-pink-200 font-bold text-xs transition-all shadow-md group">
                    <Camera className="h-4 w-4 text-pink-400 group-hover:scale-110 transition-transform" />
                    <span>গ্যালারি থেকে ছবি আপলোড দিন</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* URL Input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={postImageUrl}
                      onChange={(e) => setPostImageUrl(e.target.value)}
                      placeholder="ওয়েব ইমেজ লিংক (URL)..."
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddImage}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-white/10 shrink-0 cursor-pointer"
                    >
                      + যোগ
                    </button>
                  </div>
                </div>

                {/* Uploaded Images Gallery Preview */}
                {postImageUrlsList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-bold block">সংযুক্ত ছবিসমূহ ({postImageUrlsList.length}):</span>
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {postImageUrlsList.map((url, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20 shrink-0 group shadow-md">
                          <img src={url} alt="Phone preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPostImageUrlsList(postImageUrlsList.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-full opacity-90 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact and Location */}
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <span>৫. বিক্রেতার যোগাযোগ ও লোকেশন</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">বিক্রেতার নাম</label>
                    <input
                      type="text"
                      value={postSellerName}
                      onChange={(e) => setPostSellerName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">ফোন / হোয়াটসঅ্যাপ নম্বর *</label>
                    <input
                      type="text"
                      required
                      value={postSellerPhone}
                      onChange={(e) => setPostSellerPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-300 mb-1">লোকেশন / এলাকা *</label>
                    <input
                      type="text"
                      required
                      value={postSellerLocation}
                      onChange={(e) => setPostSellerLocation(e.target.value)}
                      placeholder="e.g. Dhanmondi, Dhaka"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Ad Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-rose-600 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-pink-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>ফোন এক্সচেঞ্জ/সেল বিজ্ঞাপন প্রকাশ করুন</span>
              </button>

            </form>
          </div>
        )}

        {/* Tab 3: MY LISTINGS */}
        {activeTab === 'my_ads' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {myFilteredListings.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-900/40 rounded-2xl border border-dashed border-white/10 space-y-2">
                <Tag className="h-8 w-8 text-slate-500 mx-auto" />
                <h3 className="text-xs font-bold text-slate-300">
                  {lang === 'bn' ? 'আপনার পোস্ট করা কোনো বিজ্ঞাপন নেই!' : 'You have no posted ads yet!'}
                </h3>
                <button
                  onClick={() => setActiveTab('post')}
                  className="px-4 py-2 bg-pink-500 text-white font-bold text-xs rounded-xl mt-2 cursor-pointer"
                >
                  {lang === 'bn' ? 'নতুন বিজ্ঞাপন দিন' : 'Post New Ad'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myFilteredListings.map(item => (
                  <div key={item.id} className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={item.images[0]} alt={item.title} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <p className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">৳{item.expectedPrice.toLocaleString()}</p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">পোস্ট: {item.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onDeleteListing && (
                        <button
                          onClick={() => onDeleteListing(item.id)}
                          className="p-2 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-xl border border-rose-500/40 cursor-pointer"
                          title="Delete Ad"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: DIRECT INBOX & MESSAGES */}
        {activeTab === 'inbox' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto">
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">ইন-অ্যাপ মেসেজ ইনবক্স</h3>
                    <p className="text-[11px] text-slate-400">ক্রেতা ও বিক্রেতার সাথে সরাসরি ডিরেক্ট মেসেজ ও সোয়াপ প্রস্তাব</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-xs font-bold font-mono">
                  {directMessages.length} টি মেসেজ
                </span>
              </div>

              {directMessages.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <MessageSquare className="h-10 w-10 text-slate-600 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-300">এখনো কোনো সরাসরি ইন-অ্যাপ মেসেজ নেই</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    যেকোনো বিজ্ঞাপনে "ইন-অ্যাপ মেসেজ" বা "অফার" বাটনে ক্লিক করে বিক্রেতাকে মেসেজ দিন।
                  </p>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    বিজ্ঞাপন দেখুন
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {directMessages.map((msg) => {
                    const matchingListing = listings.find(l => l.id === msg.listingId) || {
                      id: msg.listingId,
                      title: msg.listingTitle,
                      images: [msg.listingImage || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80'],
                      expectedPrice: 0,
                      sellerName: msg.recipientName,
                      sellerPhone: msg.recipientPhone,
                      brand: 'Mobile',
                      model: msg.listingTitle,
                      ram: '4GB',
                      rom: '64GB',
                      batteryHealth: '100%',
                      camera: 'Standard',
                      processor: 'Octa-Core',
                      display: 'Amoled',
                      sim: 'Dual',
                      purchaseDate: 'Recently',
                      usageDuration: 'Used',
                      condition: 'Good (Minor Marks)' as const,
                      listingType: 'Both' as const,
                      swapTarget: '',
                      cashTopup: '',
                      reasonForSelling: '',
                      includedAccessories: [],
                      sellerWhatsapp: msg.recipientPhone,
                      sellerLocation: 'Dhaka',
                      sellerEmail: '',
                      createdAt: msg.timestamp
                    };

                    return (
                      <div
                        key={msg.id}
                        onClick={() => setActiveChatListing(matchingListing as PhoneListing)}
                        className="p-3.5 bg-slate-950/80 hover:bg-slate-800/80 border border-white/10 hover:border-blue-500/50 rounded-2xl transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                            <span className="text-xs font-black text-white font-display">
                              {msg.isMine ? `প্রাপক: ${msg.recipientName}` : `প্রেরক: ${msg.senderName}`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">({msg.senderPhone})</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                        </div>

                        <div className="flex items-start gap-3 bg-slate-900 p-2.5 rounded-xl border border-white/5">
                          {msg.listingImage && (
                            <img src={msg.listingImage} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="text-[11px] font-bold text-blue-300 line-clamp-1">{msg.listingTitle}</h5>
                            <p className="text-xs text-slate-200 mt-1 line-clamp-2 leading-relaxed">
                              {msg.text}
                            </p>
                          </div>
                        </div>

                        {msg.offerDetails && (
                          <div className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10.5px] text-purple-200 font-bold flex items-center justify-between">
                            <span>🔄 অফার করা মোবাইল: {msg.offerDetails.phoneModel}</span>
                            <span className="text-emerald-400 font-mono">{msg.offerDetails.cashTopup}</span>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <span className="text-[10.5px] font-bold text-blue-400 group-hover:underline flex items-center gap-1">
                            <span>চ্যাট থ্রেড খুলুন</span>
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: PRICE ESTIMATOR & SWAP CALCULATOR */}
        {activeTab === 'ai_advisor' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto">
            <div className="bg-gradient-to-tr from-amber-950/60 via-slate-900 to-purple-950/60 border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/40">
                  <Zap className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-200">
                    স্মার্ট মার্কেট প্রাইস ও সোয়াপ ভ্যালু ক্যালকুলেটর
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    যেকোনো ব্যবহৃত স্মার্টফোনের সঠিক রিসেল মার্কেট ভ্যালু এবং এক্সচেঞ্জ পার্থক্য জানুন।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">ফোনের মডেল নাম</label>
                  <input
                    type="text"
                    value={aiEstimateModel}
                    onChange={(e) => setAiEstimateModel(e.target.value)}
                    placeholder="e.g. iPhone 13 Pro 128GB"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">কন্ডিশন</label>
                  <select
                    value={aiEstimateCondition}
                    onChange={(e) => setAiEstimateCondition(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="Mint / Like New">Mint / Like New (একদম ফ্রেশ)</option>
                    <option value="Good (Minor Marks)">Good (হালকা স্ক্র্যাচ)</option>
                    <option value="Fair / Has Scratches">Fair (ব্যবহারের দাগ আছে)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">বর্তমান বাজার চাওয়া দাম (৳)</label>
                <input
                  type="number"
                  value={aiEstimatePrice}
                  onChange={(e) => setAiEstimatePrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold font-mono outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAiPriceEstimate}
                disabled={aiLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                    <span>মার্কেট এনালাইসিস হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>মার্কেট রেট ও এক্সচেঞ্জ রিপোর্ট দেখুন</span>
                  </>
                )}
              </button>

              {aiEstimateResult && (
                <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 space-y-3 mt-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-amber-300">{aiEstimateResult.aiRating}</span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      ন্যায্য মূল্য: ৳{aiEstimateResult.fairPrice?.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-200 leading-relaxed">
                    <p className="font-medium text-amber-100">{aiEstimateResult.reasoningBn}</p>
                  </div>

                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 font-medium">
                    💡 <strong>সোয়াপ পরামর্শ:</strong> {aiEstimateResult.swapAdviceBn}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SPEC SHEET SCREEN MODAL OVERLAY (When a listing is clicked) */}
        {selectedListing && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-2xl overflow-y-auto">
            <div className="relative w-full max-w-lg bg-[#14061e] border border-pink-500/40 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col">
              
              {/* Phone Spec Screen Header */}
              <div className="relative bg-slate-900 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-pink-500/20 rounded-xl border border-pink-500/30 text-pink-300">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white font-display line-clamp-1">
                      {selectedListing.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedListing.brand} • {selectedListing.sellerLocation}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedListing(null);
                    setSwapEvalResult(null);
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-slate-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Image Banner Carousel */}
                <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner group">
                  <img
                    src={selectedListing.images[0]}
                    alt={selectedListing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-300 block">আকাঙ্ক্ষিত রেট / বাজেট</span>
                      <span className="text-xl font-black text-emerald-400 font-mono drop-shadow-md">
                        ৳{selectedListing.expectedPrice.toLocaleString()}
                      </span>
                    </div>

                    <span className="px-2.5 py-1 bg-rose-500/30 backdrop-blur-md text-rose-200 border border-rose-500/50 rounded-xl text-xs font-black">
                      {selectedListing.condition}
                    </span>
                  </div>
                </div>

                {/* Smartphone Features Grid Card */}
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-black uppercase text-pink-300 tracking-wider flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>স্মার্টফোন ফুল স্পেসিফিকেশন ও ফিচার</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">RAM & ROM</span>
                      <span className="font-bold text-slate-200">{selectedListing.ram} / {selectedListing.rom}</span>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">ব্যাটারি ব্যাকআপ</span>
                      <span className="font-bold text-slate-200">{selectedListing.batteryHealth}</span>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">ডিসপ্লে সাইজ</span>
                      <span className="font-bold text-slate-200">{selectedListing.display}</span>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">প্রসেসর চিপসেট</span>
                      <span className="font-bold text-slate-200">{selectedListing.processor}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 text-xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">ক্যামেরা বিবরণ</span>
                    <span className="font-bold text-slate-200">{selectedListing.camera}</span>
                  </div>
                </div>

                {/* Exchange / Swap Target info */}
                {(selectedListing.listingType === 'Exchange' || selectedListing.listingType === 'Both') && selectedListing.swapTarget && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-1.5">
                    <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span>এক্সচেঞ্জ অফার ও পছন্দনীয় মডেল:</span>
                    </h5>
                    <p className="text-xs text-amber-100 leading-relaxed font-medium">
                      {selectedListing.swapTarget}
                    </p>
                    {selectedListing.cashTopup && (
                      <p className="text-[11px] text-emerald-300 font-bold">
                        ক্যাশ সমন্বয়: {selectedListing.cashTopup}
                      </p>
                    )}
                  </div>
                )}

                {/* Accessories Included */}
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <span className="text-xs font-bold text-purple-300 uppercase block">সাথে পাওয়া যাবে:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedListing.includedAccessories.map((acc, i) => (
                      <span key={i} className="px-2.5 py-1 bg-purple-500/15 text-purple-200 border border-purple-500/30 rounded-lg text-[10.5px] font-bold flex items-center gap-1">
                        <Check className="h-3 w-3 text-purple-400" />
                        <span>{acc}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Seller Note / Description */}
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 uppercase block">বিক্রেতার বিবরণ:</span>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedListing.reasonForSelling}
                  </p>
                </div>

                {/* Swap Evaluator tool for this item */}
                <div className="bg-gradient-to-r from-purple-950/90 to-slate-900 border border-purple-500/30 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-200 flex items-center gap-1.5">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-purple-400" />
                      <span>স্মার্ট সোয়াপ ম্যাচ এনালাইসিস</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={swapTargetInput}
                      onChange={(e) => setSwapTargetInput(e.target.value)}
                      placeholder="আপনার মোবাইল মডেল (e.g. Galaxy S22)"
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <button
                      onClick={() => handleAiSwapEvaluate(selectedListing.title)}
                      disabled={isEvaluatingSwap}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shrink-0 cursor-pointer"
                    >
                      {isEvaluatingSwap ? 'অ্যানালাইস...' : 'ম্যাচ মূল্যায়ন'}
                    </button>
                  </div>

                  {swapEvalResult && (
                    <div className="p-3 bg-slate-950/90 border border-purple-500/30 rounded-xl text-xs space-y-1.5 mt-2">
                      <p className="text-emerald-300 font-bold">{swapEvalResult.verdictBn}</p>
                      <p className="text-purple-200 text-[11px]">
                        ক্যাশ সমন্বয় টিপস: <strong>৳{swapEvalResult.cashDifferenceBdt?.toLocaleString()} ({swapEvalResult.whoShouldPay} pays)</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Seller Info Card */}
                <div className="bg-slate-950 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">বিক্রেতা</span>
                    <h5 className="text-xs font-bold text-white">{selectedListing.sellerName}</h5>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-rose-400" />
                      <span>{selectedListing.sellerLocation}</span>
                    </p>
                  </div>

                  {selectedListing.isVerifiedSeller && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-blue-400" />
                      <span>Verified Seller</span>
                    </span>
                  )}
                </div>

              </div>

              {/* Action Buttons: Call & WhatsApp Direct */}
              <div className="p-4 bg-slate-950 border-t border-white/10 grid grid-cols-2 gap-3 shrink-0">
                <a
                  href={`tel:${selectedListing.sellerPhone}`}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Phone className="h-4 w-4" />
                  <span>কল করুন ({selectedListing.sellerPhone})</span>
                </a>

                <a
                  href={`https://wa.me/88${selectedListing.sellerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('আসসালামু আলাইকুম, আমি আপনার ' + selectedListing.title + ' নিয়ে আগ্রহী। ফোন এক্সচেঞ্জ বা ক্রয়ের বিষয়ে কথা বলতে চাই।')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>হোয়াটসঅ্যাপ মেসেজ</span>
                </a>
              </div>

            </div>
          </div>
        )}

        {/* FLOATING COMPARE BAR */}
        {compareItems.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-pink-500/50 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-2xl shadow-pink-950 flex items-center gap-3 text-xs"
          >
            <div className="flex items-center gap-1.5 font-bold text-pink-300">
              <Scale className="h-4 w-4 text-rose-400" />
              <span>{compareItems.length} টি ফোন তুলনা তালিকায়</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCompareOpen(true)}
                disabled={compareItems.length < 2}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black rounded-full shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <span>তুলনা দেখুন ({compareItems.length}/২)</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setCompareItems([])}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* SIDE-BY-SIDE COMPARE MODAL */}
        <AnimatePresence>
          {isCompareOpen && compareItems.length >= 2 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-2xl overflow-y-auto">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-3xl bg-[#1a0826] border border-pink-500/40 rounded-3xl p-5 text-white shadow-2xl max-h-[90vh] flex flex-col my-auto"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-rose-400" />
                    <h3 className="text-sm sm:text-base font-black text-white font-display">
                      স্মার্টফোন পাশাপাশী তুলনা (Side-by-Side Comparison)
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsCompareOpen(false)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* Grid 2 Columns */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {compareItems.map((item, idx) => (
                      <div key={item.id} className="bg-slate-900/90 border border-white/10 rounded-2xl p-3 space-y-3">
                        <div className="h-32 rounded-xl overflow-hidden bg-slate-950 border border-white/10 relative">
                          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-rose-500/80 text-white rounded-full text-[9px] font-bold">
                            ফোন #{idx + 1}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-sm text-pink-300 font-display line-clamp-1">{item.title}</h4>
                          <span className="text-base font-black text-emerald-400 font-mono block mt-1">
                            ৳{item.expectedPrice.toLocaleString('bn-BD')}
                          </span>
                        </div>

                        <div className="space-y-2 border-t border-white/10 pt-2 text-[11px]">
                          <div className="p-2 bg-slate-950 rounded-xl">
                            <span className="text-[9.5px] text-slate-400 block font-bold">RAM & ROM</span>
                            <span className="font-bold text-slate-200">{item.ram} / {item.rom}</span>
                          </div>

                          <div className="p-2 bg-slate-950 rounded-xl">
                            <span className="text-[9.5px] text-slate-400 block font-bold">কন্ডিশন</span>
                            <span className="font-bold text-amber-300">{item.condition}</span>
                          </div>

                          <div className="p-2 bg-slate-950 rounded-xl">
                            <span className="text-[9.5px] text-slate-400 block font-bold">ব্যাটারি স্বাস্থ্য</span>
                            <span className="font-bold text-slate-200">{item.batteryHealth}</span>
                          </div>

                          <div className="p-2 bg-slate-950 rounded-xl">
                            <span className="text-[9.5px] text-slate-400 block font-bold">ক্যামেরা ও প্রসেসর</span>
                            <span className="font-bold text-slate-200">{item.camera}</span>
                            <span className="text-[10px] text-slate-400 block">{item.processor}</span>
                          </div>

                          <div className="p-2 bg-slate-950 rounded-xl">
                            <span className="text-[9.5px] text-slate-400 block font-bold">লোকেশন</span>
                            <span className="font-bold text-slate-300">{item.sellerLocation}</span>
                          </div>
                        </div>

                        <a
                          href={`tel:${item.sellerPhone}`}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center block"
                        >
                          কল করুন
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DIRECT SWAP OFFER MODAL */}
        <AnimatePresence>
          {swapOfferItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-2xl">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-[#1d092b] border border-purple-500/50 rounded-3xl p-5 text-white shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-purple-400" />
                    <h3 className="text-sm font-black text-white font-display">
                      সোয়াপ অফার পাঠান (Direct Deal)
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSwapOfferItem(null)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-3 bg-slate-900 rounded-2xl border border-white/10 flex items-center gap-3">
                  <img src={swapOfferItem.images[0]} alt={swapOfferItem.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  <div>
                    <span className="text-[10px] text-purple-300 uppercase font-bold block">টার্গেট ফোন</span>
                    <h4 className="text-xs font-black text-white">{swapOfferItem.title}</h4>
                    <span className="text-xs font-black text-emerald-400 font-mono">৳{swapOfferItem.expectedPrice.toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">আপনার হ্যান্ডসেটের নাম ও মডেল:</label>
                    <input
                      type="text"
                      value={offerPhoneModel}
                      onChange={(e) => setOfferPhoneModel(e.target.value)}
                      placeholder="e.g. iPhone 12 Pro 128GB Mint Condition"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">প্রস্তাবিত ক্যাশ সমন্বয়:</label>
                    <input
                      type="text"
                      value={offerCashTopup}
                      onChange={(e) => setOfferCashTopup(e.target.value)}
                      placeholder="e.g. +৳5,000 ক্যাশ দেব / অথবা কোনো ক্যাশ লাগবে না"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">অতিরিক্ত বার্তা:</label>
                    <textarea
                      value={offerMsg}
                      onChange={(e) => setOfferMsg(e.target.value)}
                      rows={2}
                      placeholder="ফোনের অবস্থা, বক্স-মেমো আছে কিনা লিখুন..."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleSendInAppDirectMessage(
                        swapOfferItem, 
                        offerMsg || 'আসসালামু আলাইকুম, আমি এই ফোন এক্সচেঞ্জ করতে আগ্রহী।',
                        { phoneModel: offerPhoneModel || 'আমার মোবাইল', cashTopup: offerCashTopup || 'আলোচনা সাপেক্ষে' }
                      );
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>ইন-অ্যাপ ডিরেক্ট মেসেজে অফার দিন</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSendDirectSMS(
                          swapOfferItem.sellerPhone,
                          `আসসালামু আলাইকুম! আপনার ${swapOfferItem.title} ফোনের সোয়াপ অফার: ফোন- ${offerPhoneModel || 'আমার ফোন'}, ক্যাশ- ${offerCashTopup || 'আলোচনা সাপেক্ষে'}`
                        );
                      }}
                      className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5 text-purple-200" />
                      <span>ডিরেক্ট SMS</span>
                    </button>

                    <a
                      href={`tel:${swapOfferItem.sellerPhone}`}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <Phone className="h-3.5 w-3.5 text-white" />
                      <span>সরাসরি কল দিন</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DIRECT IN-APP ACTIVE CHAT MODAL OVERLAY */}
        <AnimatePresence>
          {activeChatListing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-2xl">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg h-[85vh] bg-slate-900 border border-blue-500/40 rounded-3xl flex flex-col shadow-2xl overflow-hidden text-white"
              >
                {/* Chat Header */}
                <div className="p-3.5 bg-slate-950 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={activeChatListing.images[0]} 
                      alt="" 
                      className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0" 
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-white truncate font-display">
                          {activeChatListing.sellerName}
                        </h3>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="অনলাইন"></span>
                      </div>
                      <p className="text-[10.5px] text-blue-300 font-bold truncate">
                        {activeChatListing.title} • <span className="text-emerald-400 font-mono">৳{activeChatListing.expectedPrice.toLocaleString('bn-BD')}</span>
                      </p>
                      <span className="text-[9.5px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-2.5 w-2.5 text-emerald-400" />
                        <span>{activeChatListing.sellerPhone}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`tel:${activeChatListing.sellerPhone}`}
                      className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl border border-emerald-500/30 transition-colors cursor-pointer"
                      title="সরাসরি কল দিন"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setActiveChatListing(null)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
                  <div className="text-center py-2">
                    <span className="px-3 py-1 bg-slate-900 border border-white/10 rounded-full text-[10px] text-slate-400 font-bold">
                      🔒 নিরাপদ ইন-অ্যাপ এনক্রিপ্টেড চ্যাট শুরু হয়েছে
                    </span>
                  </div>

                  {directMessages.filter(m => m.listingId === activeChatListing.id).length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <MessageSquare className="h-8 w-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">
                        বিক্রেতা {activeChatListing.sellerName}-কে প্রথম বার্তা পাঠান!
                      </p>
                    </div>
                  ) : (
                    directMessages
                      .filter(m => m.listingId === activeChatListing.id)
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <span className="text-[9px] text-slate-400 px-1 font-mono">
                            {msg.senderName} • {msg.timestamp}
                          </span>
                          <div
                            className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                              msg.isMine
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-blue-500/10'
                                : 'bg-slate-800 text-slate-100 border border-white/10 rounded-bl-none'
                            }`}
                          >
                            {msg.offerDetails && (
                              <div className="mb-2 p-2 bg-slate-950/50 rounded-xl border border-white/20 text-[11px] font-bold space-y-0.5">
                                <div className="text-purple-300 flex items-center gap-1">
                                  <ArrowLeftRight className="h-3 w-3" />
                                  <span>সোয়াপ হ্যান্ডসেট: {msg.offerDetails.phoneModel}</span>
                                </div>
                                <div className="text-emerald-300 font-mono">
                                  ক্যাশ সমন্বয়: {msg.offerDetails.cashTopup}
                                </div>
                              </div>
                            )}
                            <p>{msg.text}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Quick Reply Chips */}
                <div className="px-3 py-2 bg-slate-950 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
                  {[
                    "ফোনটি কি এখনও পাওয়া যাবে?",
                    "লাস্ট প্রাইজ কত রাখা যাবে?",
                    "এক্সচেঞ্জ করতে আগ্রহী আছি",
                    "লোকেশন কোথায় এসে দেখতে পারব?"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => setChatMessageText(chip)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-blue-600/30 hover:border-blue-500/50 text-slate-300 hover:text-white border border-white/10 text-[10px] font-bold rounded-full whitespace-nowrap transition-all cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <div className="p-3 bg-slate-900 border-t border-white/10 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatMessageText}
                    onChange={(e) => setChatMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendInAppDirectMessage(activeChatListing);
                      }
                    }}
                    placeholder="বার্তার তথ্য টাইপ করুন..."
                    className="flex-1 bg-slate-950 border border-white/10 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />

                  <button
                    onClick={() => handleSendInAppDirectMessage(activeChatListing)}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">পাঠান</span>
                  </button>

                  <button
                    onClick={() => {
                      handleSendDirectSMS(
                        activeChatListing.sellerPhone,
                        chatMessageText.trim() || `আসসালামু আলাইকুম! আপনার ${activeChatListing.title} ফোনটির বিষয়ে কথা বলতে চাই।`
                      );
                    }}
                    className="px-3 py-2.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                    title="ফোন মেসেঞ্জারে সরাসরি SMS পাঠান"
                  >
                    <MessageSquare className="h-4 w-4 text-purple-300" />
                    <span>SMS</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* LIGHTBOX PHOTO VIEWER */}
        <AnimatePresence>
          {lightboxImage && (
            <div 
              onClick={() => setLightboxImage(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 cursor-zoom-out"
            >
              <motion.div 
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="relative max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl"
              >
                <img src={lightboxImage} alt="Phone Fullview" className="w-full h-full object-contain" />
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* COPY TOAST FEEDBACK */}
        <AnimatePresence>
          {copyToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-4 py-2 rounded-full font-black text-xs shadow-xl flex items-center gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              <span>বিজ্ঞাপন ও যোগাযোগের লিংক কপি করা হয়েছে!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MESSAGE TOAST FEEDBACK */}
        <AnimatePresence>
          {messageToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-blue-600 text-white px-5 py-2.5 rounded-full font-black text-xs shadow-2xl flex items-center gap-2 border border-blue-400"
            >
              <CheckCheck className="h-4 w-4 text-emerald-300" />
              <span>{messageToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
