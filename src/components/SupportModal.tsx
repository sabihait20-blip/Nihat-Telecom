import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MessageSquare, Send, ArrowLeft, AlertCircle, CheckCircle2, 
  HelpCircle, ShieldCheck, RefreshCw, Layers, Plus, Clock
} from 'lucide-react';
import { Language } from '../types';
import { collection, doc, onSnapshot, setDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface SupportModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: number;
}

interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  category: string;
  status: 'Open' | 'Closed';
  createdAt: number;
  lastMessageText: string;
  lastMessageSender: 'user' | 'admin';
  lastMessageTime: number;
  messages: SupportMessage[];
}

export default function SupportModal({ lang, isOpen, onClose }: SupportModalProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);
  
  // Create ticket form states
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Recharge');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live chat state
  const [replyText, setReplyText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentUser = auth.currentUser;

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicketId, tickets]);

  // Load user's support tickets
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as SupportTicket);
      });
      // Sort client-side by lastMessageTime descending
      list.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
      setTickets(list);
    }, (error) => {
      console.error("Error loading user support tickets: ", error);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    const ticketId = 'ticket-' + Date.now();
    const initialMessage: SupportMessage = {
      id: 'msg-' + Date.now(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
      text: message.trim(),
      time: Date.now()
    };

    const newTicket: SupportTicket = {
      id: ticketId,
      userId: currentUser.uid,
      userEmail: currentUser.email || 'no-email@firebase.com',
      userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
      subject: subject.trim(),
      category: category,
      status: 'Open',
      createdAt: Date.now(),
      lastMessageText: initialMessage.text,
      lastMessageSender: 'user',
      lastMessageTime: initialMessage.time,
      messages: [initialMessage]
    };

    try {
      await setDoc(doc(db, 'support_tickets', ticketId), newTicket);
      setSubject('');
      setMessage('');
      setIsCreatingTicket(false);
      setSelectedTicketId(ticketId);
    } catch (err) {
      console.error("Error creating ticket: ", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !replyText.trim() || !selectedTicketId) return;

    const activeTicket = tickets.find(t => t.id === selectedTicketId);
    if (!activeTicket || activeTicket.status === 'Closed') return;

    const newMessage: SupportMessage = {
      id: 'msg-' + Date.now(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
      text: replyText.trim(),
      time: Date.now()
    };

    const updatedMessages = [...(activeTicket.messages || []), newMessage];

    try {
      await setDoc(doc(db, 'support_tickets', selectedTicketId), {
        messages: updatedMessages,
        lastMessageText: newMessage.text,
        lastMessageSender: 'user',
        lastMessageTime: newMessage.time,
        status: 'Open' // auto re-open or stay open
      }, { merge: true });

      setReplyText('');
    } catch (err) {
      console.error("Error sending user reply: ", err);
    }
  };

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dynamic Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Dynamic Main Support container card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 28, stiffness: 290 }}
        className="relative bg-white w-full max-w-md h-[550px] rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden text-slate-800"
      >
        
        {/* Support Card Header Banner */}
        <div className="px-5 py-4.5 bg-slate-50 border-b border-slate-100/85 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {selectedTicketId || isCreatingTicket ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(null);
                  setIsCreatingTicket(false);
                }}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
              </button>
            ) : (
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
            )}
            <div>
              <h3 className="text-slate-900 font-extrabold text-sm tracking-tight leading-tight">
                {selectedTicketId 
                  ? (lang === 'bn' ? 'লাইভ সাপোর্ট চ্যাট' : 'Live Support Chat')
                  : isCreatingTicket 
                  ? (lang === 'bn' ? 'নতুন টিকিট ওপেন করুন' : 'Open New Ticket')
                  : (lang === 'bn' ? 'গ্রাহক সাপোর্ট সেন্টার' : 'Help & Support Center')
                }
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-tight">
                {selectedTicketId ? activeTicket?.subject : (lang === 'bn' ? '২৪/৭ এডমিন প্যানেল সাপোর্ট' : '24/7 Dedicated Support Agent')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* View states router */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between h-full bg-slate-50/20">
          
          {/* STATE 1: VIEW TICKETS LIST AND HOME DASHBOARD */}
          {!selectedTicketId && !isCreatingTicket && (
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-4">
                {/* Introduction guidelines banner */}
                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-[24px] p-4 shadow-sm flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black tracking-tight">
                      {lang === 'bn' ? 'যেকোনো সমস্যায় সাহায্য নিন' : 'Need instant assistance?'}
                    </h4>
                    <p className="text-[10px] text-blue-100 font-semibold leading-relaxed max-w-[220px]">
                      {lang === 'bn' 
                        ? 'আপনার যেকোনো ব্যর্থ লেনদেন বা রিচার্জ সংক্রান্ত সমস্যার জন্য সরাসরি এডমিনের সাথে যোগাযোগ করুন।' 
                        : 'Contact support instantly for any failed recharge, voucher, or balance issues.'}
                    </p>
                  </div>
                  <HelpCircle className="h-10 w-10 text-white/20 shrink-0 stroke-[1.5]" />
                </div>

                {/* Tickets list scroller block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {lang === 'bn' ? 'আপনার ওপেনকৃত টিকিট সমূহ' : 'Your Support Tickets'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {tickets.length} Tickets
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto scroller-hidden">
                    {tickets.length === 0 ? (
                      <div className="py-8 bg-white border border-slate-100/70 rounded-2xl text-center text-slate-400 space-y-2">
                        <MessageSquare className="h-6 w-6 text-slate-350 mx-auto" />
                        <p className="text-[10.5px] font-bold">
                          {lang === 'bn' ? 'কোনো সাপোর্ট টিকিট পাওয়া যায়নি' : 'No support tickets generated yet'}
                        </p>
                      </div>
                    ) : (
                      tickets.map((ticket) => {
                        const hasUnread = ticket.lastMessageSender === 'admin' && ticket.status === 'Open';
                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => setSelectedTicketId(ticket.id)}
                            className="w-full text-left bg-white border border-slate-100 hover:border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-xs active:scale-99 relative"
                          >
                            {hasUnread && (
                              <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-xl ${
                                ticket.status === 'Closed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'
                              } flex items-center justify-center`}>
                                <Clock className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-xs text-slate-800 font-extrabold tracking-tight truncate max-w-[200px]">
                                  {ticket.subject}
                                </h4>
                                <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                                  Category: {ticket.category}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md ${
                              ticket.status === 'Closed' 
                                ? 'bg-slate-100 text-slate-500' 
                                : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {ticket.status}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Action: Open New Ticket Trigger */}
              <button
                type="button"
                onClick={() => setIsCreatingTicket(true)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>{lang === 'bn' ? 'নতুন টিকিট তৈরি করুন' : 'Create Support Ticket'}</span>
              </button>
            </div>
          )}

          {/* STATE 2: NEW TICKET CREATION FORM */}
          {isCreatingTicket && (
            <form onSubmit={handleCreateTicket} className="flex flex-col h-full justify-between">
              <div className="space-y-3.5">
                {/* Category block */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'ক্যাটাগরি নির্বাচন' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-3.5 text-xs font-bold outline-none focus:border-indigo-600 text-slate-800"
                  >
                    <option value="Recharge">{lang === 'bn' ? 'মোবাইল রিচার্জ' : 'Mobile Recharge'}</option>
                    <option value="Voucher">{lang === 'bn' ? 'ভাউচার স্টোর' : 'Voucher Request'}</option>
                    <option value="Transfer">{lang === 'bn' ? 'ব্যালেন্স ট্রান্সফার' : 'Balance Transfer'}</option>
                    <option value="Bill">{lang === 'bn' ? 'ইউটিলিটি বিল পে' : 'Bill Payment'}</option>
                    <option value="Other">{lang === 'bn' ? 'অন্যান্য সাহায্য' : 'Other Inquiries'}</option>
                  </select>
                </div>

                {/* Subject block */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'টিকিটের বিষয়' : 'Subject / Issue Title'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'bn' ? 'যেমন: রিচার্জ পেন্ডিং বা ব্যালেন্স সমস্যা...' : 'e.g. Recharge showing pending or Balance missing'}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-indigo-600 text-slate-800"
                  />
                </div>

                {/* Description input block */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'বিস্তারিত বিবরণ' : 'Detailed Message'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={lang === 'bn' ? 'আপনার সমস্যার বিস্তারিত লিখুন, ট্রানজেকশন আইডি থাকলে সেটিও যুক্ত করুন...' : 'Provide complete details of your transaction/issue here...'}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-indigo-600 text-slate-800 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:from-violet-400 disabled:to-indigo-400 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-4"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{lang === 'bn' ? 'টিকিট তৈরি হচ্ছে...' : 'Creating Ticket...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    <span>{lang === 'bn' ? 'টিকিট সাবমিট করুন' : 'Submit Support Ticket'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STATE 3: LIVE SUPPORT CHAT WINDOW */}
          {selectedTicketId && activeTicket && (
            <div className="flex flex-col h-full justify-between flex-1">
              {/* Message scroll logs */}
              <div className="flex-1 overflow-y-auto max-h-[340px] pr-1 space-y-3 scroller-hidden">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-[9px] font-mono font-black text-indigo-600 uppercase tracking-wider">
                    {lang === 'bn' ? 'সিস্টেম টিকিট ওপেন করা হয়েছে' : 'System Ticket Initiated'}
                  </span>
                  <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                    Subject: {activeTicket.subject}
                  </p>
                </div>

                {/* Actual messages log */}
                {activeTicket.messages && activeTicket.messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs font-bold leading-normal ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs shadow-indigo-500/5' 
                          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] font-mono text-slate-400 mt-1 font-bold">
                        {isMe ? (lang === 'bn' ? 'আপনি' : 'You') : (lang === 'bn' ? 'এডমিন এজেন্ট' : 'Support Agent')} • {new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat reply entry form */}
              <form onSubmit={handleSendReply} className="border-t border-slate-100 pt-3.5 flex gap-2">
                <input
                  type="text"
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    activeTicket.status === 'Closed'
                      ? (lang === 'bn' ? 'এই টিকিটটি বন্ধ করা হয়েছে...' : 'This support ticket is closed...')
                      : (lang === 'bn' ? 'বার্তা লিখুন...' : 'Write your response here...')
                  }
                  disabled={activeTicket.status === 'Closed'}
                  className="flex-1 bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-50 font-sans"
                />
                <button
                  type="submit"
                  disabled={activeTicket.status === 'Closed'}
                  className="px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black rounded-2xl text-xs transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-95 disabled:scale-100 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
