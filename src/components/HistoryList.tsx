import React, { useState } from 'react';
import { Search, Flame, ArrowUpRight, ArrowDownLeft, Landmark, FileText, Smartphone, Gift, Printer, Download, CheckCircle2, X } from 'lucide-react';
import { Transaction, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface HistoryListProps {
  transactions: Transaction[];
  lang: Language;
}

export default function HistoryList({ transactions, lang }: HistoryListProps) {
  const [filter, setFilter] = useState<'All' | 'Recharge' | 'Bill' | 'CashIn' | 'Transfer' | 'Voucher' | 'ScratchCard'>('All');
  const [query, setQuery] = useState('');
  const [selectedTxForMemo, setSelectedTxForMemo] = useState<Transaction | null>(null);

  const t = TRANSLATIONS[lang];

  // Apply filters
  const filteredTx = transactions.filter((tx) => {
    const matchesFilter = filter === 'All' || tx.type === filter;
    
    const matchesSearch =
      (tx.targetNumber && tx.targetNumber.includes(query)) ||
      (tx.billerName && tx.billerName.toLowerCase().includes(query.toLowerCase())) ||
      (tx.billerNameBn && tx.billerNameBn.includes(query)) ||
      (tx.transferMethod && tx.transferMethod.toLowerCase().includes(query.toLowerCase())) ||
      (tx.voucherItem && tx.voucherItem.toLowerCase().includes(query.toLowerCase())) ||
      (tx.voucherCode && tx.voucherCode.toLowerCase().includes(query.toLowerCase())) ||
      (tx.txId || '').toLowerCase().includes(query.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handlePrintMemo = () => {
    window.print();
  };

  const getTxTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Recharge':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Bill':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CashIn':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Transfer':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Voucher':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'ScratchCard':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Success':
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Failed':
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Pending':
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  };

  const getTxTypeIcon = (type: string) => {
    switch (type) {
      case 'Recharge':
        return <Smartphone className="h-4.5 w-4.5" />;
      case 'Bill':
        return <Landmark className="h-4.5 w-4.5" />;
      case 'CashIn':
        return <ArrowDownLeft className="h-4.5 w-4.5" />;
      case 'Transfer':
        return <ArrowUpRight className="h-4.5 w-4.5" />;
      case 'Voucher':
        return <Gift className="h-4.5 w-4.5" />;
      case 'ScratchCard':
        return <FileText className="h-4.5 w-4.5" />;
      default:
        return <FileText className="h-4.5 w-4.5" />;
    }
  };

  return (
    <div className="space-y-4 px-4 py-2 pb-24 text-white">
      {/* Header index with metadata search */}
      <div className="space-y-3">
        <div>
          <h2 className="text-white font-bold text-base tracking-tight font-display">
            {t.transactionHistory}
          </h2>
          <p className="text-xs text-slate-400 font-medium font-sans">
            {lang === 'bn' ? 'আপনার সকল মোবাইল রিচার্জ ও লেনদেনের লাইভ লোগ' : 'Real-time ledger audit logs of your mobile financial services'}
          </p>
        </div>

        {/* Input box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'bn' ? 'নম্বর, TxID বা বিলার নাম দিয়ে খুঁজুন...' : 'Search mobile numbers, biller name or TxID...'}
            className="w-full bg-[#131B2E] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-indigo-500 transition-colors shadow-sm text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Category horizontal tabs */}
      <div className="flex gap-2.5 border-b border-slate-800 pb-1 overflow-x-auto scrollbar-none">
        {(['All', 'Recharge', 'Bill', 'CashIn', 'Transfer', 'Voucher', 'ScratchCard'] as const).map((type) => {
          const isActive = filter === type;
          let label: string = type;
          if (lang === 'bn') {
            if (type === 'All') label = t.all;
            else if (type === 'Recharge') label = t.filterRecharge;
            else if (type === 'Bill') label = t.filterBill;
            else if (type === 'CashIn') label = t.filterCashin;
            else if (type === 'Transfer') label = 'ব্যালেন্স ট্রান্সফার';
            else if (type === 'Voucher') label = 'গেমিং ও ওটিটি';
            else if (type === 'ScratchCard') label = 'স্ক্র্যাচ কার্ড';
          } else {
            if (type === 'Transfer') label = 'Balance Transfer';
            else if (type === 'Voucher') label = 'Gaming & OTT';
            else if (type === 'ScratchCard') label = 'Scratch Card';
          }
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              id={`history-filter-${type}`}
              className={`pb-2 px-1 text-xs font-bold transition-all relative border-b-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Transaction list render block */}
      <div className="space-y-3">
        {filteredTx.length > 0 ? (
          filteredTx.map((tx, index) => (
            <div
              key={`${tx.id || index}-${index}`}
              className="bg-[#240d35]/80 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-pink-950/30 hover:border-rose-500/40 hover:shadow-2xl hover:shadow-pink-950/50 transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Visual Category symbol */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-center ${getTxTypeBadgeColor(tx.type)}`}>
                  {getTxTypeIcon(tx.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-white font-bold text-xs tracking-tight">
                      {tx.type === 'Recharge'
                        ? `${lang === 'bn' ? 'মোবাইল রিচার্জ' : 'Mobile Recharge'}`
                        : tx.type === 'Bill'
                        ? `${lang === 'bn' ? tx.billerNameBn : tx.billerName}`
                        : tx.type === 'Transfer'
                        ? (tx.transferMethod === 'NIHAD BUSINESS POINT Wallet (User)'
                            ? `${lang === 'bn' ? 'ইউজার টু ইউজার সেন্ড মানি' : 'P2P Send Money'}`
                            : `${tx.transferMethod} ${lang === 'bn' ? 'ট্রান্সফার' : 'Transfer'}`)
                        : tx.type === 'Voucher'
                        ? `${tx.voucherItem} ${lang === 'bn' ? 'ভাউচার' : 'Voucher'}`
                        : tx.type === 'ScratchCard'
                        ? `${tx.operator} ${lang === 'bn' ? 'স্ক্র্যাচ কার্ড' : 'Scratch Card'}`
                        : (tx.transferMethod === 'Received from User'
                            ? `${lang === 'bn' ? 'সেন্ড মানি গ্রহণ' : 'Money Received (P2P)'}`
                            : `${lang === 'bn' ? 'এড ফান্ড (ওয়ালেট রিচার্জ)' : 'Add Fund (Wallet Deposit)'}`)}
                    </h4>
                  </div>
                  
                  {/* Detailed Target Number/ID Stamps */}
                  {tx.targetNumber && (
                    <span className="text-[10px] text-slate-300 font-semibold block">
                      {tx.type === 'CashIn' 
                        ? (tx.transferMethod === 'Received from User'
                            ? (lang === 'bn' ? `প্রেরক: ${tx.operator || ''} (${tx.targetNumber})` : `Sender: ${tx.operator || ''} (${tx.targetNumber})`)
                            : (lang === 'bn' ? `জমাকৃত মাধ্যম: ${tx.targetNumber}` : `Received via ${tx.targetNumber}`))
                        : tx.type === 'Transfer'
                        ? (tx.transferMethod === 'NIHAD BUSINESS POINT Wallet (User)'
                            ? (lang === 'bn' ? `প্রাপক: ${tx.operator || ''} (${tx.targetNumber})` : `Recipient: ${tx.operator || ''} (${tx.targetNumber})`)
                            : (lang === 'bn' ? `প্রাপক নম্বর: ${tx.targetNumber}` : `Recipient Number: ${tx.targetNumber}`))
                        : tx.type === 'Voucher'
                        ? (lang === 'bn' ? `একাউন্ট/আইডি: ${tx.targetNumber} (${tx.voucherCode})` : `Account/ID: ${tx.targetNumber} (${tx.voucherCode})`)
                        : tx.type === 'ScratchCard'
                        ? (lang === 'bn' ? `প্যাকেজ: ${tx.details} | পিন: ${tx.voucherCode}` : `Package: ${tx.details} | PIN: ${tx.voucherCode}`)
                        : `${tx.targetNumber} (${tx.operator})`}
                    </span>
                  )}
                  {tx.billerName && (
                    <span className="text-[10px] text-slate-400 font-medium block">
                      TxId: <span className="font-mono text-slate-300 font-bold">{tx.txId}</span>
                    </span>
                  )}
                  {!tx.billerName && (
                    <span className="text-[10px] text-slate-400 font-medium block">
                      TxId: <span className="font-mono text-slate-300 font-bold">{tx.txId}</span>
                    </span>
                  )}
                  {tx.note && (
                    <span className="text-[10px] text-indigo-300 font-semibold block bg-indigo-500/20 px-2 py-0.5 rounded-md w-fit mt-0.5">
                      💬 {tx.note}
                    </span>
                  )}
                  
                  <span className="text-[9px] text-slate-400 font-semibold font-mono block">
                    {tx.date}
                  </span>
                </div>
              </div>

              {/* Status block & financial pricing alignment */}
              <div className="text-right space-y-1">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadgeColor(tx.status)}`}>
                  {tx.status === 'Success' || tx.status === 'Approved'
                    ? (lang === 'bn' ? 'সফল' : 'Success')
                    : tx.status === 'Failed' || tx.status === 'Rejected'
                    ? (lang === 'bn' ? 'ব্যর্থ' : 'Failed')
                    : (lang === 'bn' ? 'অপেক্ষমান' : 'Pending')}
                </span>
                <p className={`font-display font-bold text-sm ${tx.type === 'CashIn' ? 'text-emerald-400' : 'text-white'}`}>
                  {tx.type === 'CashIn' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                </p>

                {/* Cash Memo Button */}
                <button
                  type="button"
                  onClick={() => setSelectedTxForMemo(tx)}
                  className="mt-1 px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1 ml-auto cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-3 h-3 text-indigo-400" />
                  <span>{lang === 'bn' ? 'ক্যাশ মেমো' : 'Memo'}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-[#131B2E] border border-slate-800 rounded-2xl">
            <p className="text-slate-400 text-xs font-bold">
              {t.noTransactions}
            </p>
          </div>
        )}
      </div>

      {/* Printable Digital Cash Memo Modal (System 1) */}
      {selectedTxForMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 max-w-sm w-full text-white space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedTxForMemo(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cash Memo Header */}
            <div className="text-center space-y-1 border-b border-slate-800 pb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-1">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black tracking-tight text-white uppercase font-display">
                NIHAD BUSINESS POINT
              </h3>
              <p className="text-[11px] text-amber-400 font-bold">
                {lang === 'bn' ? 'ডিজিটাল অফিশিয়াল ক্যাশ মেমো' : 'Official Digital Cash Memo / Receipt'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {selectedTxForMemo.date} | TxID: <span className="text-slate-200 font-bold">{selectedTxForMemo.txId}</span>
              </p>
            </div>

            {/* Memo Details */}
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>{lang === 'bn' ? 'সেবার ধরন:' : 'Service Type:'}</span>
                <span className="font-bold text-white">
                  {selectedTxForMemo.type === 'Recharge'
                    ? (lang === 'bn' ? 'মোবাইল রিচার্জ' : 'Mobile Recharge')
                    : selectedTxForMemo.type === 'Bill'
                    ? (lang === 'bn' ? selectedTxForMemo.billerNameBn || selectedTxForMemo.billerName : selectedTxForMemo.billerName)
                    : selectedTxForMemo.type}
                </span>
              </div>

              {selectedTxForMemo.targetNumber && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>{lang === 'bn' ? 'গ্রাহক / অ্যাকাউন্ট নম্বর:' : 'Customer Number:'}</span>
                  <span className="font-mono font-extrabold text-amber-300">{selectedTxForMemo.targetNumber}</span>
                </div>
              )}

              {selectedTxForMemo.operator && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>{lang === 'bn' ? 'অপারেটর / সার্ভিস:' : 'Operator:'}</span>
                  <span className="font-bold text-indigo-300">{selectedTxForMemo.operator}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                <span className="font-bold text-slate-200">{lang === 'bn' ? 'মোট পরিশোধিত টাকা:' : 'Total Paid:'}</span>
                <span className="font-black text-emerald-400 text-lg">৳{selectedTxForMemo.amount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">{lang === 'bn' ? 'স্ট্যাটাস:' : 'Status:'}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {selectedTxForMemo.status === 'Success' || selectedTxForMemo.status === 'Approved' ? (lang === 'bn' ? 'অনুমোদিত ও সফল' : 'Verified & Successful') : selectedTxForMemo.status}
                </span>
              </div>
            </div>

            {/* Official Seal Badge */}
            <div className="flex items-center justify-between px-3 py-2 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[10px]">
              <span className="text-slate-400 font-medium">
                {lang === 'bn' ? 'অনলাইন কম্পিউটার জেনারেটেড রসিদ' : 'Computer Generated Official Receipt'}
              </span>
              <span className="text-emerald-400 font-bold tracking-widest uppercase border border-emerald-500/40 px-2 py-0.5 rounded bg-emerald-950/40">
                PAID & SEALED
              </span>
            </div>

            {/* Print & Close Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handlePrintMemo}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'bn' ? 'মেমো প্রিন্ট করুন' : 'Print Memo'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTxForMemo(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
