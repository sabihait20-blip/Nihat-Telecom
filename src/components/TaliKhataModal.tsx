import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, BookOpen, Plus, Search, Phone, ArrowUpRight, ArrowDownLeft, 
  Trash2, Send, Download, Printer, UserPlus, FileText, Check, 
  Sparkles, Calendar, DollarSign, Wallet, AlertCircle, RefreshCw,
  MessageSquare, Share2, CheckCircle2, ChevronRight, User, Filter
} from 'lucide-react';
import { Language } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';

export interface TaliCustomer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  type: 'customer' | 'supplier' | 'personal';
  netBalance: number; // Positive = পাবেন (Receivable), Negative = দেবেন (Payable)
  lastUpdated: string;
  userId?: string;
}

export interface TaliEntry {
  id: string;
  customerId: string;
  customerName: string;
  type: 'received' | 'given'; // received = টাকা পেলাম (+), given = টাকা দিলাম (-)
  amount: number;
  note: string;
  date: string;
  createdAt: string;
  paymentMethod?: string;
  userId?: string;
}

interface TaliKhataModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  userId: string;
  userName: string;
  userPhone?: string;
}

export default function TaliKhataModal({
  isOpen,
  onClose,
  lang,
  userId,
  userName,
  userPhone,
}: TaliKhataModalProps) {
  // Navigation tab inside TaliKhata
  const [activeTab, setActiveTab] = useState<'customers' | 'cashbox'>('customers');
  
  // Customers list & state
  const [customers, setCustomers] = useState<TaliCustomer[]>([]);
  const [entries, setEntries] = useState<TaliEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'receivable' | 'payable' | 'zero'>('all');

  // Customer sheet details modal
  const [selectedCustomer, setSelectedCustomer] = useState<TaliCustomer | null>(null);

  // New Customer Modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustType, setNewCustType] = useState<'customer' | 'supplier' | 'personal'>('customer');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceType, setOpeningBalanceType] = useState<'receivable' | 'payable'>('receivable');

  // New Transaction Entry Modal
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryType, setEntryType] = useState<'received' | 'given'>('received'); // received = পেলাম (+), given = দিলাম (-)
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryMethod, setEntryMethod] = useState('Cash');

  // Cash Box daily state
  const [cashEntries, setCashEntries] = useState<{ id: string; type: 'in' | 'out'; amount: number; note: string; date: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tali_cashbox') || '[]');
    } catch { return []; }
  });
  const [showCashEntryModal, setShowCashEntryModal] = useState(false);
  const [cashType, setCashType] = useState<'in' | 'out'>('in');
  const [cashAmount, setCashAmount] = useState('');
  const [cashNote, setCashNote] = useState('');

  // Notification / Feedback
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Sync with Firestore & localStorage
  useEffect(() => {
    if (!isOpen) return;

    // Load from Firestore
    setLoading(true);
    let unsubCustomers = () => {};
    let unsubEntries = () => {};

    try {
      unsubCustomers = onSnapshot(collection(db, 'tali_customers'), (snap) => {
        const custList: TaliCustomer[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.userId || data.userId === userId) {
            custList.push({ id: docSnap.id, ...data } as TaliCustomer);
          }
        });
        setCustomers(custList);
        setLoading(false);
      }, (err) => {
        console.warn('Firestore fallback to localStorage:', err);
        // Fallback to local storage
        const savedCust = localStorage.getItem('tali_customers_cache');
        if (savedCust) setCustomers(JSON.parse(savedCust));
        setLoading(false);
      });

      unsubEntries = onSnapshot(collection(db, 'tali_entries'), (snap) => {
        const entryList: TaliEntry[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.userId || data.userId === userId) {
            entryList.push({ id: docSnap.id, ...data } as TaliEntry);
          }
        });
        // Sort descending by date
        entryList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEntries(entryList);
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }

    return () => {
      unsubCustomers();
      unsubEntries();
    };
  }, [isOpen, userId]);

  // Persist local cache
  useEffect(() => {
    if (customers.length > 0) {
      localStorage.setItem('tali_customers_cache', JSON.stringify(customers));
    }
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('tali_cashbox', JSON.stringify(cashEntries));
  }, [cashEntries]);

  // Calculations for Summary
  const { totalReceivable, totalPayable, netLedgerBalance } = useMemo(() => {
    let rec = 0;
    let pay = 0;
    customers.forEach(c => {
      if (c.netBalance > 0) {
        rec += c.netBalance;
      } else if (c.netBalance < 0) {
        pay += Math.abs(c.netBalance);
      }
    });
    return {
      totalReceivable: rec,
      totalPayable: pay,
      netLedgerBalance: rec - pay,
    };
  }, [customers]);

  // Filtered Customer List
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
      
      if (!matchesSearch) return false;

      if (filterType === 'receivable') return c.netBalance > 0;
      if (filterType === 'payable') return c.netBalance < 0;
      if (filterType === 'zero') return c.netBalance === 0;
      return true;
    });
  }, [customers, searchQuery, filterType]);

  // Selected customer entries
  const currentCustomerEntries = useMemo(() => {
    if (!selectedCustomer) return [];
    return entries.filter(e => e.customerId === selectedCustomer.id);
  }, [selectedCustomer, entries]);

  // Handle Add Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const openingVal = Number(openingBalance) || 0;
    const initialNetBalance = openingBalanceType === 'receivable' ? openingVal : -openingVal;

    const newId = 'cust_' + Date.now();
    const newCust: TaliCustomer = {
      id: newId,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '০১৭০০০০০০০',
      address: newCustAddress.trim(),
      type: newCustType,
      netBalance: initialNetBalance,
      lastUpdated: new Date().toISOString(),
      userId: userId || 'guest',
    };

    try {
      await setDoc(doc(db, 'tali_customers', newId), newCust);
      
      // If opening balance > 0, create an initial entry
      if (openingVal > 0) {
        const initialEntry: TaliEntry = {
          id: 'entry_' + Date.now(),
          customerId: newId,
          customerName: newCustName.trim(),
          type: openingBalanceType === 'receivable' ? 'given' : 'received', // given = বাকীতে পণ্য বা সার্ভিস দেওয়া (পাবেন)
          amount: openingVal,
          note: lang === 'bn' ? 'প্রারম্ভিক জের (Opening Balance)' : 'Opening Balance',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          paymentMethod: 'Initial',
          userId: userId || 'guest',
        };
        await setDoc(doc(db, 'tali_entries', initialEntry.id), initialEntry);
      }

      showToast(lang === 'bn' ? 'নতুন খাতাদার সফলভাবে যোগ করা হয়েছে!' : 'Customer added successfully!');
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setOpeningBalance('');
      setShowAddCustomer(false);
    } catch (err) {
      console.error('Error adding customer:', err);
      // Local fallback
      setCustomers(prev => [...prev, newCust]);
      showToast(lang === 'bn' ? 'খাতাদার সংরক্ষণ করা হয়েছে!' : 'Customer saved locally!');
      setShowAddCustomer(false);
    }
  };

  // Handle Add Transaction Entry (পেলাম / দিলাম)
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !entryAmount || Number(entryAmount) <= 0) return;

    const amt = Number(entryAmount);
    const entryId = 'entry_' + Date.now();

    const newEntry: TaliEntry = {
      id: entryId,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      type: entryType,
      amount: amt,
      note: entryNote.trim() || (entryType === 'received' ? (lang === 'bn' ? 'টাকা আদায়' : 'Payment Received') : (lang === 'bn' ? 'বাকীতে পেমেন্ট/পণ্য' : 'Credit Given')),
      date: entryDate,
      createdAt: new Date().toISOString(),
      paymentMethod: entryMethod,
      userId: userId || 'guest',
    };

    // Calculate updated net balance for customer
    // received = টাকা পেলাম (Customer paid back -> reduce receivable)
    // given = টাকা দিলাম/বাকী দিলাম (Gave money/goods -> increase receivable)
    const balanceDelta = entryType === 'received' ? -amt : amt;
    const updatedBalance = selectedCustomer.netBalance + balanceDelta;

    try {
      await setDoc(doc(db, 'tali_entries', entryId), newEntry);
      await setDoc(doc(db, 'tali_customers', selectedCustomer.id), {
        ...selectedCustomer,
        netBalance: updatedBalance,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });

      setSelectedCustomer(prev => prev ? { ...prev, netBalance: updatedBalance, lastUpdated: new Date().toISOString() } : null);
      showToast(entryType === 'received' ? (lang === 'bn' ? 'টাকা পাওয়া গেছে (পেলেন) এন্ট্রি হয়েছে!' : 'Received entry saved!') : (lang === 'bn' ? 'টাকা দেওয়া হয়েছে (দিলেন) এন্ট্রি হয়েছে!' : 'Given entry saved!'));
      
      setEntryAmount('');
      setEntryNote('');
      setShowAddEntry(false);
    } catch (err) {
      console.error('Error adding entry:', err);
      setEntries(prev => [newEntry, ...prev]);
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, netBalance: updatedBalance } : c));
      setSelectedCustomer(prev => prev ? { ...prev, netBalance: updatedBalance } : null);
      showToast(lang === 'bn' ? 'হিসাব এন্ট্রি সফল হয়েছে!' : 'Entry saved successfully!');
      setShowAddEntry(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (cust: TaliCustomer) => {
    if (!confirm(lang === 'bn' ? `আপনি কি নিশ্চিত যে "${cust.name}" এর হিসাব মুছে ফেলতে চান?` : `Delete ledger account for "${cust.name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'tali_customers', cust.id));
      showToast(lang === 'bn' ? 'খাতাদারের অ্যাকাউন্ট মুছে ফেলা হয়েছে' : 'Customer account deleted');
      if (selectedCustomer?.id === cust.id) setSelectedCustomer(null);
    } catch (err) {
      setCustomers(prev => prev.filter(c => c.id !== cust.id));
      if (selectedCustomer?.id === cust.id) setSelectedCustomer(null);
    }
  };

  // Delete Individual Entry
  const handleDeleteEntry = async (entry: TaliEntry) => {
    if (!confirm(lang === 'bn' ? 'আপনি কি এই এন্ট্রিটি মুছে ফেলতে চান?' : 'Delete this entry?')) return;

    const reverseDelta = entry.type === 'received' ? entry.amount : -entry.amount;
    const updatedBal = (selectedCustomer?.netBalance || 0) + reverseDelta;

    try {
      await deleteDoc(doc(db, 'tali_entries', entry.id));
      if (selectedCustomer) {
        await setDoc(doc(db, 'tali_customers', selectedCustomer.id), {
          ...selectedCustomer,
          netBalance: updatedBal,
        }, { merge: true });
        setSelectedCustomer({ ...selectedCustomer, netBalance: updatedBal });
      }
      showToast(lang === 'bn' ? 'এন্ট্রি মুছে ফেলা হয়েছে' : 'Entry deleted');
    } catch (err) {
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    }
  };

  // Cash Box Entry
  const handleAddCashEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAmount || Number(cashAmount) <= 0) return;

    const newCash = {
      id: 'cash_' + Date.now(),
      type: cashType,
      amount: Number(cashAmount),
      note: cashNote.trim() || (cashType === 'in' ? 'ক্যাশ ইন (Cash In)' : 'ক্যাশ খরচ (Cash Out)'),
      date: new Date().toISOString().split('T')[0],
    };

    setCashEntries(prev => [newCash, ...prev]);
    setCashAmount('');
    setCashNote('');
    setShowCashEntryModal(false);
    showToast(lang === 'bn' ? 'ক্যাশ এন্ট্রি সফল হয়েছে!' : 'Cash entry saved!');
  };

  // Cashbox Today summary
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayCashIn = cashEntries.filter(c => c.date === todayDateStr && c.type === 'in').reduce((s, c) => s + c.amount, 0);
  const todayCashOut = cashEntries.filter(c => c.date === todayDateStr && c.type === 'out').reduce((s, c) => s + c.amount, 0);
  const todayNetCash = todayCashIn - todayCashOut;

  // SMS Reminder Generator
  const generateSmsText = (cust: TaliCustomer) => {
    const isReceivable = cust.netBalance > 0;
    const absBal = Math.abs(cust.netBalance);
    if (isReceivable) {
      return `প্রিয় ${cust.name}, আপনার কাছে মোট ৳${absBal.toLocaleString()} বকেয়া পাওনা রয়েছে। অনুগ্রহ করে দ্রুত বকেয়া পরিশোধ করার অনুরোধ করা হচ্ছে। ধন্যবাদ - ${userName || 'টালি খাতা'}`;
    } else {
      return `প্রিয় ${cust.name}, আপনার মোট ৳${absBal.toLocaleString()} জমা রয়েছে। ধন্যবাদ - ${userName || 'টালি খাতা'}`;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-4xl shadow-2xl text-slate-100 my-4 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* HEADER BAR */}
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 p-5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
                <BookOpen className="h-6 w-6 stroke-[2.5px]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {lang === 'bn' ? 'টালি খাতা (ডিজিটাল হিসাব)' : 'Tali Khata Ledger'}
                  </h2>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                    {lang === 'bn' ? 'ডিজিটাল খাতা' : 'Digital Ledger'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {lang === 'bn' ? 'কাস্টমার, বাকী-নগদ এবং দৈনিক ক্যাশ হিসাব সহজ উপায়ে রাখুন' : 'Easily manage customer credits, debits & daily cash log'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* TOAST MESSAGE */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-500 text-slate-950 px-4 py-2 text-xs font-black text-center flex items-center justify-center gap-2 shadow-md shrink-0"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN TAB SWITCHER: CUSTOMERS / CASHBOX */}
          <div className="bg-slate-950/60 px-5 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveTab('customers'); setSelectedCustomer(null); }}
                className={`px-4 py-2 rounded-2xl text-xs font-black cursor-pointer transition-all flex items-center gap-2 ${
                  activeTab === 'customers' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                <User className="h-4 w-4" />
                <span>{lang === 'bn' ? 'খাতাদার তালিকা (Accounts)' : 'Customer Accounts'}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  {customers.length}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('cashbox'); setSelectedCustomer(null); }}
                className={`px-4 py-2 rounded-2xl text-xs font-black cursor-pointer transition-all flex items-center gap-2 ${
                  activeTab === 'cashbox' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                <Wallet className="h-4 w-4" />
                <span>{lang === 'bn' ? 'ক্যাশ বাক্স (Daily Cash)' : 'Cash Box'}</span>
              </button>
            </div>

            {activeTab === 'customers' && !selectedCustomer && (
              <button
                onClick={() => setShowAddCustomer(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-xs cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <UserPlus className="h-4 w-4 stroke-[2.5px]" />
                <span>{lang === 'bn' ? '+ নতুন খাতাদার যোগ করুন' : '+ Add New Customer'}</span>
              </button>
            )}

            {activeTab === 'cashbox' && (
              <button
                onClick={() => setShowCashEntryModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black rounded-2xl text-xs cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[2.5px]" />
                <span>{lang === 'bn' ? '+ ক্যাশ এন্ট্রি' : '+ Add Cash Entry'}</span>
              </button>
            )}
          </div>

          {/* MAIN BODY AREA */}
          <div className="p-5 overflow-y-auto flex-1 space-y-6">
            
            {/* VIEW 1: CUSTOMERS TAB */}
            {activeTab === 'customers' && (
              <>
                {/* SUMMARY STATS CARDS */}
                {!selectedCustomer && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* TOTAL RECEIVABLE */}
                    <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 p-4 rounded-3xl shadow-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                          {lang === 'bn' ? 'মোট পাবো (পাওনা)' : 'Total Receivable'}
                        </span>
                        <h3 className="text-2xl font-black text-emerald-300 tracking-tight">
                          ৳{totalReceivable.toLocaleString()}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                          {lang === 'bn' ? 'কাস্টমারদের থেকে বাকি আদায় বাকি' : 'Outstanding from customers'}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                        <ArrowDownLeft className="h-6 w-6" />
                      </div>
                    </div>

                    {/* TOTAL PAYABLE */}
                    <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/30 p-4 rounded-3xl shadow-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block mb-1">
                          {lang === 'bn' ? 'মোট দেবো (দেনা)' : 'Total Payable'}
                        </span>
                        <h3 className="text-2xl font-black text-rose-300 tracking-tight">
                          ৳{totalPayable.toLocaleString()}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                          {lang === 'bn' ? 'সাপ্লায়ার বা অন্যদের দেওয়ার বকেয়া' : 'Payable to suppliers'}
                        </p>
                      </div>
                      <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                        <ArrowUpRight className="h-6 w-6" />
                      </div>
                    </div>

                    {/* NET BALANCE */}
                    <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 p-4 rounded-3xl shadow-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                          {lang === 'bn' ? 'নিট হিসাব জের' : 'Net Ledger Position'}
                        </span>
                        <h3 className={`text-2xl font-black tracking-tight ${netLedgerBalance >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                          ৳{netLedgerBalance.toLocaleString()}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                          {netLedgerBalance >= 0 ? (lang === 'bn' ? 'উদ্বৃত্ত পাওনা' : 'Net positive') : (lang === 'bn' ? 'উদ্বৃত্ত দেনা' : 'Net negative')}
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                        <Sparkles className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                )}

                {/* IF A CUSTOMER IS SELECTED: SHOW CUSTOMER LEDGER SHEET */}
                {selectedCustomer ? (
                  <div className="space-y-6">
                    {/* BACK BUTTON & CUSTOMER HEADER */}
                    <div className="bg-slate-950/80 border border-white/10 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedCustomer(null)}
                          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl cursor-pointer transition-colors"
                        >
                          <ChevronRight className="h-5 w-5 rotate-180" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-white">{selectedCustomer.name}</h3>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-white/5">
                              {selectedCustomer.type === 'customer' ? (lang === 'bn' ? 'কাস্টমার' : 'Customer') : selectedCustomer.type === 'supplier' ? (lang === 'bn' ? 'সাপ্লায়ার' : 'Supplier') : (lang === 'bn' ? 'ব্যক্তিগত' : 'Personal')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <Phone className="h-3 w-3 text-indigo-400" />
                            <span>{selectedCustomer.phone}</span>
                            {selectedCustomer.address && <span>• {selectedCustomer.address}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-black text-slate-400 block">
                            {selectedCustomer.netBalance > 0 
                              ? (lang === 'bn' ? 'পাবেন (পাওয়া যাবে)' : 'Will Get') 
                              : selectedCustomer.netBalance < 0 
                              ? (lang === 'bn' ? 'দেবেন (দিতে হবে)' : 'Will Give') 
                              : (lang === 'bn' ? 'হিসাব সমতা (জিরো)' : 'Balanced')}
                          </span>
                          <span className={`text-xl font-black ${
                            selectedCustomer.netBalance > 0 ? 'text-emerald-400' : selectedCustomer.netBalance < 0 ? 'text-rose-400' : 'text-slate-300'
                          }`}>
                            ৳{Math.abs(selectedCustomer.netBalance).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* SEND SMS / REMINDER BUTTON */}
                          <a
                            href={`sms:${selectedCustomer.phone}?body=${encodeURIComponent(generateSmsText(selectedCustomer))}`}
                            className="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-2xl text-xs font-black cursor-pointer flex items-center gap-1.5"
                            title={lang === 'bn' ? 'রিমাইন্ডার মেসেজ পাঠান' : 'Send SMS Reminder'}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">{lang === 'bn' ? 'রিমাইন্ডার' : 'SMS'}</span>
                          </a>

                          {/* DELETE CUSTOMER ACCOUNT */}
                          <button
                            onClick={() => handleDeleteCustomer(selectedCustomer)}
                            className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl text-xs font-black cursor-pointer"
                            title={lang === 'bn' ? 'খাতা মুছে ফেলুন' : 'Delete Account'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS: টাকা পেলাম (+) / টাকা দিলাম (-) */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => { setEntryType('received'); setShowAddEntry(true); }}
                        className="py-4 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-3xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95 transition-all"
                      >
                        <ArrowDownLeft className="h-5 w-5 stroke-[2.5px]" />
                        <span>{lang === 'bn' ? '+ টাকা পেলাম (পেলেন)' : '+ Money Received'}</span>
                      </button>

                      <button
                        onClick={() => { setEntryType('given'); setShowAddEntry(true); }}
                        className="py-4 px-5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black rounded-3xl shadow-xl shadow-rose-600/20 flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95 transition-all"
                      >
                        <ArrowUpRight className="h-5 w-5 stroke-[2.5px]" />
                        <span>{lang === 'bn' ? '- টাকা দিলাম (দিলেন)' : '- Money Given'}</span>
                      </button>
                    </div>

                    {/* TRANSACTION HISTORY TABLE FOR THIS CUSTOMER */}
                    <div className="bg-slate-950/60 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center pb-3 border-b border-white/5">
                        <h4 className="text-sm font-black text-slate-200 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-400" />
                          <span>{lang === 'bn' ? 'লেনদেনের বিস্তারিত ইতিহাস' : 'Transaction History'}</span>
                        </h4>
                        <span className="text-xs text-slate-400 font-bold">
                          {currentCustomerEntries.length} {lang === 'bn' ? 'টি এন্ট্রি' : 'entries'}
                        </span>
                      </div>

                      {currentCustomerEntries.length === 0 ? (
                        <div className="text-center py-12 space-y-2">
                          <FileText className="h-10 w-10 text-slate-700 mx-auto" />
                          <p className="text-xs font-bold text-slate-500">
                            {lang === 'bn' ? 'এখনো কোনো লেনদেন যোগ করা হয়নি' : 'No transactions recorded yet'}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {lang === 'bn' ? 'উপরের "টাকা পেলাম" বা "টাকা দিলাম" বোতামে চাপুন' : 'Click above buttons to record payments'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {currentCustomerEntries.map((entry, idx) => (
                            <div 
                              key={`${entry.id || 'entry'}-${idx}`}
                              className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-2xl ${
                                  entry.type === 'received' 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {entry.type === 'received' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-200">
                                    {entry.note || (entry.type === 'received' ? 'টাকা পাওয়া গেছে' : 'টাকা দেওয়া হয়েছে')}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                                    <span>{entry.date}</span>
                                    {entry.paymentMethod && <span>• {entry.paymentMethod}</span>}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-right">
                                <div>
                                  <span className={`text-base font-black block ${
                                    entry.type === 'received' ? 'text-emerald-400' : 'text-rose-400'
                                  }`}>
                                    {entry.type === 'received' ? '+' : '-'}৳{entry.amount.toLocaleString()}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                                    {entry.type === 'received' ? (lang === 'bn' ? 'পেলেন' : 'Received') : (lang === 'bn' ? 'দিলেন' : 'Given')}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleDeleteEntry(entry)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                                  title="Delete Entry"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* CUSTOMERS LIST VIEW */
                  <div className="space-y-4">
                    {/* SEARCH & FILTERS BAR */}
                    <div className="bg-slate-950/60 border border-white/10 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xl">
                      {/* Search Box */}
                      <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder={lang === 'bn' ? 'খাতাদারের নাম বা মোবাইল সার্চ...' : 'Search customer or phone...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-white/10 rounded-2xl text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
                        <button
                          onClick={() => setFilterType('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                            filterType === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lang === 'bn' ? 'সবাই' : 'All'}
                        </button>
                        <button
                          onClick={() => setFilterType('receivable')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                            filterType === 'receivable' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lang === 'bn' ? 'পাবো' : 'Receivable'}
                        </button>
                        <button
                          onClick={() => setFilterType('payable')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                            filterType === 'payable' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lang === 'bn' ? 'দেবো' : 'Payable'}
                        </button>
                      </div>
                    </div>

                    {/* CUSTOMER LIST GRID / LIST */}
                    {loading ? (
                      <div className="text-center py-16">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
                        <p className="text-xs text-slate-400 font-bold mt-2">লোড হচ্ছে...</p>
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-12 text-center space-y-3">
                        <BookOpen className="h-12 w-12 text-slate-700 mx-auto" />
                        <p className="text-sm font-bold text-slate-400">
                          {lang === 'bn' ? 'কোনো খাতাদার পাওয়া যায়নি' : 'No customers found'}
                        </p>
                        <button
                          onClick={() => setShowAddCustomer(true)}
                          className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-xs font-black cursor-pointer"
                        >
                          {lang === 'bn' ? '+ প্রথম খাতাদার যোগ করুন' : '+ Add First Customer'}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredCustomers.map((cust, idx) => {
                          const isReceivable = cust.netBalance > 0;
                          const isPayable = cust.netBalance < 0;
                          return (
                            <motion.div
                              key={`${cust.id || 'cust'}-${idx}`}
                              whileHover={{ scale: 1.01 }}
                              onClick={() => setSelectedCustomer(cust)}
                              className="bg-slate-950/70 hover:bg-slate-900 border border-white/10 hover:border-emerald-500/40 p-4 rounded-3xl transition-all cursor-pointer shadow-lg flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shadow-inner ${
                                  isReceivable 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : isPayable 
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {cust.name.slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-slate-100 group-hover:text-emerald-300 transition-colors">
                                    {cust.name}
                                  </h4>
                                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                    <Phone className="h-3 w-3 text-slate-500" />
                                    <span>{cust.phone}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <span className={`text-base font-black block ${
                                    isReceivable ? 'text-emerald-400' : isPayable ? 'text-rose-400' : 'text-slate-400'
                                  }`}>
                                    ৳{Math.abs(cust.netBalance).toLocaleString()}
                                  </span>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                    isReceivable 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                      : isPayable 
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                      : 'bg-slate-800 text-slate-400 border-white/5'
                                  }`}>
                                    {isReceivable ? (lang === 'bn' ? 'পাবো' : 'Will Get') : isPayable ? (lang === 'bn' ? 'দেবো' : 'Will Give') : (lang === 'bn' ? 'জিরো' : 'Balanced')}
                                  </span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: CASHBOX TAB */}
            {activeTab === 'cashbox' && (
              <div className="space-y-6">
                {/* CASH BOX TODAY SUMMARY */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950/80 border border-emerald-500/30 p-4 rounded-3xl shadow-xl">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-1">
                      {lang === 'bn' ? 'আজকের ক্যাশ ইন (জমা)' : 'Today Cash In'}
                    </span>
                    <h3 className="text-2xl font-black text-emerald-300">৳{todayCashIn.toLocaleString()}</h3>
                  </div>

                  <div className="bg-slate-950/80 border border-rose-500/30 p-4 rounded-3xl shadow-xl">
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block mb-1">
                      {lang === 'bn' ? 'আজকের ক্যাশ আউট (খরচ)' : 'Today Cash Out'}
                    </span>
                    <h3 className="text-2xl font-black text-rose-300">৳{todayCashOut.toLocaleString()}</h3>
                  </div>

                  <div className="bg-slate-950/80 border border-indigo-500/30 p-4 rounded-3xl shadow-xl">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block mb-1">
                      {lang === 'bn' ? 'আজকের অবশিষ্টাংশ ক্যাশ' : 'Today Net Cash'}
                    </span>
                    <h3 className="text-2xl font-black text-indigo-300">৳{todayNetCash.toLocaleString()}</h3>
                  </div>
                </div>

                {/* CASH LOG TABLE */}
                <div className="bg-slate-950/60 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <h4 className="text-sm font-black text-slate-200 flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-indigo-400" />
                      <span>{lang === 'bn' ? 'দৈনিক ক্যাশ খরচের হিসাব' : 'Cash Log Entries'}</span>
                    </h4>
                  </div>

                  {cashEntries.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs font-bold">
                      {lang === 'bn' ? 'আজকের ক্যাশ খাতা খালি' : 'No cash entries recorded'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cashEntries.map((entry, idx) => (
                        <div key={`${entry.id || 'cash'}-${idx}`} className="bg-slate-900 p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black text-slate-200">{entry.note}</p>
                            <span className="text-[10px] text-slate-500 font-medium">{entry.date}</span>
                          </div>
                          <span className={`text-sm font-black ${entry.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {entry.type === 'in' ? '+' : '-'}৳{entry.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* MODAL: ADD NEW CUSTOMER */}
      <AnimatePresence>
        {showAddCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-white/10 p-6 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-5 text-white">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  <span>{lang === 'bn' ? 'নতুন খাতাদার একাউন্ট তৈরি' : 'Add New Customer Account'}</span>
                </h3>
                <button onClick={() => setShowAddCustomer(false)} className="p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                    {lang === 'bn' ? 'খাতাদারের নাম *' : 'Customer Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'bn' ? 'যেমন: আবদুর রহিম' : 'e.g. Rahim Store'}
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                    {lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    placeholder="01700000000"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                      {lang === 'bn' ? 'টাইপ' : 'Type'}
                    </label>
                    <select
                      value={newCustType}
                      onChange={(e) => setNewCustType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-3 text-xs font-semibold text-slate-100 outline-none cursor-pointer"
                    >
                      <option value="customer" className="bg-slate-900">কাস্টমার (Customer)</option>
                      <option value="supplier" className="bg-slate-900">সাপ্লায়ার (Supplier)</option>
                      <option value="personal" className="bg-slate-900">ব্যক্তিগত (Personal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                      {lang === 'bn' ? 'প্রারম্ভিক ব্যালেন্স (যদি থাকে)' : 'Opening Balance'}
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {Number(openingBalance) > 0 && (
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                      {lang === 'bn' ? 'প্রারম্ভিক জেরের ধরন' : 'Opening Status'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOpeningBalanceType('receivable')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer border ${
                          openingBalanceType === 'receivable' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-950 text-slate-400 border-white/5'
                        }`}
                      >
                        পাবো (Receivable)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpeningBalanceType('payable')}
                        className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer border ${
                          openingBalanceType === 'payable' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-950 text-slate-400 border-white/5'
                        }`}
                      >
                        দেবো (Payable)
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                    {lang === 'bn' ? 'ঠিকানা/নোট (ঐচ্ছিক)' : 'Address/Notes (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'যেমন: লোকাল দোকান, বাড্ডা' : 'e.g. Local store'}
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button type="button" onClick={() => setShowAddCustomer(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs cursor-pointer">
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs cursor-pointer shadow-lg shadow-emerald-600/20">
                    {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Customer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD TRANSACTION ENTRY (টাকা পেলাম / টাকা দিলাম) */}
      <AnimatePresence>
        {showAddEntry && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-white/10 p-6 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-5 text-white">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <h3 className={`text-base font-black flex items-center gap-2 ${entryType === 'received' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {entryType === 'received' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                  <span>{entryType === 'received' ? (lang === 'bn' ? 'টাকা পেলাম (পেলেন)' : 'Money Received') : (lang === 'bn' ? 'টাকা দিলাম (দিলেন)' : 'Money Given')}</span>
                </h3>
                <button onClick={() => setShowAddEntry(false)} className="p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-4">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-black block">খাতাদারের নাম</span>
                  <p className="text-sm font-black text-slate-200">{selectedCustomer.name}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                    {lang === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Amount (৳) *'}
                  </label>
                  <input
                    type="number"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 text-base font-black text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                    {lang === 'bn' ? 'বিবরণ / নোট' : 'Note / Description'}
                  </label>
                  <input
                    type="text"
                    placeholder={entryType === 'received' ? (lang === 'bn' ? 'যেমন: বাকী পণ্য বিক্রির জমা' : 'e.g. Bill paid') : (lang === 'bn' ? 'যেমন: বাকীতে চাল ও তেল ক্রয়' : 'e.g. Credit sale')}
                    value={entryNote}
                    onChange={(e) => setEntryNote(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                      {lang === 'bn' ? 'তারিখ' : 'Date'}
                    </label>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2 px-3 text-xs font-semibold text-slate-100 outline-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                      {lang === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Method'}
                    </label>
                    <select
                      value={entryMethod}
                      onChange={(e) => setEntryMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-3 text-xs font-semibold text-slate-100 outline-none cursor-pointer"
                    >
                      <option value="Cash" className="bg-slate-900">নগদ (Cash)</option>
                      <option value="bKash" className="bg-slate-900">বিকাশ (bKash)</option>
                      <option value="Nagad" className="bg-slate-900">নগদ (Nagad)</option>
                      <option value="Bank" className="bg-slate-900">ব্যাংক ট্রান্সফার</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button type="button" onClick={() => setShowAddEntry(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs cursor-pointer">
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button 
                    type="submit" 
                    className={`flex-1 py-3 text-white font-black rounded-2xl text-xs cursor-pointer shadow-lg ${
                      entryType === 'received' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    }`}
                  >
                    {lang === 'bn' ? 'এন্ট্রি সেভ করুন' : 'Save Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD CASHBOX ENTRY */}
      <AnimatePresence>
        {showCashEntryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-white/10 p-6 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-5 text-white">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <h3 className="text-base font-black text-indigo-400 flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  <span>{lang === 'bn' ? 'দৈনিক ক্যাশ এন্ট্রি' : 'Add Cash Box Entry'}</span>
                </h3>
                <button onClick={() => setShowCashEntryModal(false)} className="p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={handleAddCashEntry} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                    {lang === 'bn' ? 'এন্ট্রি টাইপ' : 'Entry Type'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCashType('in')}
                      className={`flex-1 py-2.5 rounded-2xl text-xs font-black cursor-pointer border ${
                        cashType === 'in' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-950 text-slate-400 border-white/5'
                      }`}
                    >
                      + ক্যাশ ইন (In)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashType('out')}
                      className={`flex-1 py-2.5 rounded-2xl text-xs font-black cursor-pointer border ${
                        cashType === 'out' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-950 text-slate-400 border-white/5'
                      }`}
                    >
                      - ক্যাশ আউট (Out)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                    {lang === 'bn' ? 'পরিমাণ (৳) *' : 'Amount (৳) *'}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-4 text-sm font-black text-emerald-400 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">
                    {lang === 'bn' ? 'বিবরণ' : 'Note'}
                  </label>
                  <input
                    type="text"
                    placeholder={cashType === 'in' ? 'যেমন: সকালের ক্যাশ বিক্রয়' : 'যেমন: চা ও স্ন্যাক্স খরচ'}
                    value={cashNote}
                    onChange={(e) => setCashNote(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-2.5 px-4 text-xs font-semibold text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button type="button" onClick={() => setShowCashEntryModal(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-black rounded-2xl text-xs cursor-pointer">
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-xs cursor-pointer shadow-lg shadow-indigo-600/20">
                    {lang === 'bn' ? 'সংরক্ষণ' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
