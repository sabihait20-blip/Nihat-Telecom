import React, { useState } from 'react';
import { Search, Flame, ArrowUpRight, ArrowDownLeft, Landmark, FileText, Smartphone } from 'lucide-react';
import { Transaction, Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface HistoryListProps {
  transactions: Transaction[];
  lang: Language;
}

export default function HistoryList({ transactions, lang }: HistoryListProps) {
  const [filter, setFilter] = useState<'All' | 'Recharge' | 'Bill' | 'CashIn' | 'Transfer'>('All');
  const [query, setQuery] = useState('');
  
  const t = TRANSLATIONS[lang];

  // Apply filters
  const filteredTx = transactions.filter((tx) => {
    const matchesFilter = filter === 'All' || tx.type === filter;
    
    const matchesSearch =
      (tx.targetNumber && tx.targetNumber.includes(query)) ||
      (tx.billerName && tx.billerName.toLowerCase().includes(query.toLowerCase())) ||
      (tx.billerNameBn && tx.billerNameBn.includes(query)) ||
      (tx.transferMethod && tx.transferMethod.toLowerCase().includes(query.toLowerCase())) ||
      tx.txId.toLowerCase().includes(query.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getTxTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Recharge':
        return 'bg-blue-50 text-blue-600 border-blue-100/50';
      case 'Bill':
        return 'bg-amber-50 text-amber-600 border-amber-100/50';
      case 'CashIn':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100/50';
      case 'Transfer':
        return 'bg-violet-50 text-violet-600 border-violet-100/50';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100';
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
      default:
        return <FileText className="h-4.5 w-4.5" />;
    }
  };

  return (
    <div className="space-y-4 px-4 py-2 pb-24">
      {/* Header index with metadata search */}
      <div className="space-y-3">
        <div>
          <h2 className="text-slate-900 font-extrabold text-base tracking-tight font-display">
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
            className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-blue-500 transition-colors shadow-xs text-slate-800"
          />
        </div>
      </div>

      {/* Category horizontal tabs */}
      <div className="flex gap-2.5 border-b border-slate-100 pb-1 overflow-x-auto scrollbar-none">
        {(['All', 'Recharge', 'Bill', 'CashIn', 'Transfer'] as const).map((type) => {
          const isActive = filter === type;
          let label: string = type;
          if (lang === 'bn') {
            if (type === 'All') label = t.all;
            else if (type === 'Recharge') label = t.filterRecharge;
            else if (type === 'Bill') label = t.filterBill;
            else if (type === 'CashIn') label = t.filterCashin;
            else if (type === 'Transfer') label = 'ব্যালেন্স ট্রান্সফার';
          } else {
            if (type === 'Transfer') label = 'Balance Transfer';
          }
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              id={`history-filter-${type}`}
              className={`pb-2 px-1 text-xs font-bold transition-all relative border-b-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
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
          filteredTx.map((tx) => (
            <div
              key={tx.id}
              className="bg-white border border-slate-100/80 rounded-[28px] p-5 flex items-center justify-between shadow-sm hover:border-blue-100/60 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Visual Category symbol */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-center ${getTxTypeBadgeColor(tx.type)}`}>
                  {getTxTypeIcon(tx.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-slate-900 font-extrabold text-xs tracking-tight">
                      {tx.type === 'Recharge'
                        ? `${lang === 'bn' ? 'মোবাইল রিচার্জ' : 'Mobile Recharge'}`
                        : tx.type === 'Bill'
                        ? `${lang === 'bn' ? tx.billerNameBn : tx.billerName}`
                        : tx.type === 'Transfer'
                        ? `${tx.transferMethod} ${lang === 'bn' ? 'ট্রান্সফার' : 'Transfer'}`
                        : `${lang === 'bn' ? 'এড ফান্ড (ওয়ালেট রিচার্জ)' : 'Add Fund (Wallet Deposit)'}`}
                    </h4>
                  </div>
                  
                  {/* Detailed Target Number/ID Stamps */}
                  {tx.targetNumber && (
                    <span className="text-[10px] text-slate-500 font-bold block">
                      {tx.type === 'CashIn' 
                        ? (lang === 'bn' ? `জমাকৃত মাধ্যম: ${tx.targetNumber}` : `Received via ${tx.targetNumber}`)
                        : tx.type === 'Transfer'
                        ? (lang === 'bn' ? `প্রাপক নম্বর: ${tx.targetNumber}` : `Recipient Number: ${tx.targetNumber}`)
                        : `${tx.targetNumber} (${tx.operator})`}
                    </span>
                  )}
                  {tx.billerName && (
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      TxId: <span className="font-mono text-slate-600 font-bold">{tx.txId}</span>
                    </span>
                  )}
                  {!tx.billerName && (
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      TxId: <span className="font-mono text-slate-600 font-bold">{tx.txId}</span>
                    </span>
                  )}
                  
                  <span className="text-[9px] text-slate-400 font-semibold font-mono block">
                    {tx.date}
                  </span>
                </div>
              </div>

              {/* Status block & financial pricing alignment */}
              <div className="text-right space-y-1">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTxTypeBadgeColor(tx.type)}`}>
                  {tx.status}
                </span>
                <p className={`font-display font-bold text-sm ${tx.type === 'CashIn' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {tx.type === 'CashIn' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl">
            <p className="text-slate-500 text-xs font-bold">
              {t.noTransactions}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
