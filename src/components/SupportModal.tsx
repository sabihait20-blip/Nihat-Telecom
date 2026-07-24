import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MessageSquare, Send, ArrowLeft, AlertCircle, CheckCircle2, 
  HelpCircle, ShieldCheck, RefreshCw, Layers, Plus, Clock,
  Phone, PhoneCall, PhoneOff, MessageCircle, Mic, MicOff, Volume2, VolumeX, Image, Zap
} from 'lucide-react';
import { Language } from '../types';
import { collection, doc, onSnapshot, setDoc, query, where, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface SupportModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  helplineNumber?: string;
  whatsappUrl?: string;
}

interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: number;
  imageUrl?: string;
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

export default function SupportModal({ 
  lang, 
  isOpen, 
  onClose,
  helplineNumber = '01970250988',
  whatsappUrl = 'https://wa.me/8801970250988'
}: SupportModalProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);
  
  // In-app Live Voice Call States
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<'Ringing' | 'Connected' | 'Ended'>('Ringing');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaker, setIsSpeaker] = useState<boolean>(true);

  // Audio Context Ref for ringtone sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // Create ticket form states
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Recharge');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live chat state
  const [replyText, setReplyText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = auth.currentUser;

  // Sound generator for Web Audio ringtone
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 tone
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscRef.current = osc;
    } catch (e) {
      console.warn("Audio context not supported", e);
    }
  };

  const stopRingtone = () => {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {
      console.warn("Audio context close error", e);
    }
  };

  // Start in-app voice call
  const handleStartInAppCall = async () => {
    setIsCalling(true);
    setCallStatus('Ringing');
    setCallDuration(0);
    startRingtone();

    // Log call attempt in Firestore for admin alert
    try {
      if (currentUser) {
        await addDoc(collection(db, 'admin_calls'), {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email || 'Customer',
          phone: currentUser.email?.split('@')[0] || 'Unknown',
          status: 'Ringing',
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error("Error logging call: ", e);
    }

    // Connect after 2.5 seconds
    setTimeout(() => {
      stopRingtone();
      setCallStatus('Connected');
    }, 2500);
  };

  // Call timer effect
  useEffect(() => {
    let interval: any = null;
    if (isCalling && callStatus === 'Connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isCalling, callStatus]);

  const handleEndCall = () => {
    stopRingtone();
    setCallStatus('Ended');
    setTimeout(() => {
      setIsCalling(false);
      setCallDuration(0);
    }, 500);
  };

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicketId, tickets, replyText]);

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
      list.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
      setTickets(list);
    }, (error) => {
      console.error("Error loading user support tickets: ", error);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      time: Date.now(),
      imageUrl: attachedImage || undefined
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
      setAttachedImage(null);
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
    if (!currentUser || (!replyText.trim() && !attachedImage) || !selectedTicketId) return;

    const activeTicket = tickets.find(t => t.id === selectedTicketId);
    if (!activeTicket) return;

    const newMessage: SupportMessage = {
      id: 'msg-' + Date.now(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
      text: replyText.trim() || '📷 [ছবি পাঠানো হয়েছে]',
      time: Date.now(),
      imageUrl: attachedImage || undefined
    };

    const updatedMessages = [...(activeTicket.messages || []), newMessage];

    try {
      await setDoc(doc(db, 'support_tickets', selectedTicketId), {
        messages: updatedMessages,
        lastMessageText: newMessage.text,
        lastMessageSender: 'user',
        lastMessageTime: newMessage.time,
        status: 'Open'
      }, { merge: true });

      setReplyText('');
      setAttachedImage(null);
    } catch (err) {
      console.error("Error sending user reply: ", err);
    }
  };

  const handleQuickChipClick = (quickText: string) => {
    if (selectedTicketId) {
      setReplyText(quickText);
    } else {
      setIsCreatingTicket(true);
      setSubject(quickText);
      setMessage(quickText);
    }
  };

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        className="relative bg-white w-full max-w-md h-[600px] rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden text-slate-800"
      >
        {/* Support Card Header Banner */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
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
                  : (lang === 'bn' ? 'আনলিমিটেড এডমিন কল ও সাপোর্ট' : 'Unlimited Admin Call & Support')
                }
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5 tracking-tight flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                {lang === 'bn' ? '২৪/৭ সরাসরি এডমিন লাইনে কানেক্টেড' : '24/7 Directly Connected to Admin'}
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
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between h-full bg-slate-50/20">
          
          {/* STATE 1: VIEW TICKETS LIST AND UNLIMITED CALL HUB */}
          {!selectedTicketId && !isCreatingTicket && (
            <div className="flex flex-col h-full justify-between space-y-4">
              <div className="space-y-3.5">
                
                {/* 📞 UNLIMITED DIRECT CALLING & WHATSAPP HUB */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-[24px] p-4 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                        <PhoneCall className="h-4 w-4 text-emerald-400 animate-pulse" />
                        <span>{lang === 'bn' ? 'আনলিমিটেড এডমিন কল সেন্টার' : 'Unlimited Admin Voice Line'}</span>
                      </h4>
                      <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                        {lang === 'bn' ? 'সরাসরি হেল্পলাইনে ফোন দিন বা ইন-অ্যাপ কল করুন' : 'Directly dial helpline or initiate in-app Web call'}
                      </p>
                    </div>
                  </div>

                  {/* 3 Quick Direct Call Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* Direct Helpline Voice Call */}
                    <a
                      href={`tel:${helplineNumber}`}
                      className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10.5px] font-extrabold flex flex-col items-center justify-center text-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Phone className="h-4 w-4 stroke-[2.5]" />
                      <span>{lang === 'bn' ? 'মোবাইল কল' : 'Phone Call'}</span>
                    </a>

                    {/* WhatsApp Call / Chat */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-[10.5px] font-extrabold flex flex-col items-center justify-center text-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="h-4 w-4 stroke-[2.5]" />
                      <span>WhatsApp</span>
                    </a>

                    {/* In-App Live Voice Call */}
                    <button
                      type="button"
                      onClick={handleStartInAppCall}
                      className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10.5px] font-extrabold flex flex-col items-center justify-center text-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <PhoneCall className="h-4 w-4 stroke-[2.5]" />
                      <span>{lang === 'bn' ? 'অ্যাপ ভয়েস কল' : 'In-App Call'}</span>
                    </button>
                  </div>
                </div>

                {/* QUICK 1-CLICK TEMPLATE CHIPS */}
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block px-1">
                    {lang === 'bn' ? '⚡ দ্রুত মেসেজ দিন (১-ক্লিক)' : '⚡ Quick Instant Messages'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      lang === 'bn' ? '⚡ এডমিন ভাই, জরুরী সাহায্য প্রয়োজন' : 'Need urgent help admin',
                      lang === 'bn' ? '📞 আমাকে একটু কল ব্যাক দিন' : 'Please call me back',
                      lang === 'bn' ? '💳 রিচার্জ পেন্ডিং কেন?' : 'Recharge pending issue',
                      lang === 'bn' ? '🔄 ব্যালেন্স অ্যাড হয়নি' : 'Balance not added'
                    ].map((chip, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleQuickChipClick(chip)}
                        className="text-[10px] font-bold bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tickets list scroller block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {lang === 'bn' ? 'আপনার ওপেনকৃত লাইভ সাপোর্ট চ্যাট' : 'Your Live Support Messages'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {tickets.length} Tickets
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[170px] overflow-y-auto scroller-hidden">
                    {tickets.length === 0 ? (
                      <div className="py-6 bg-white border border-slate-100 rounded-2xl text-center text-slate-400 space-y-1.5">
                        <MessageSquare className="h-5 w-5 text-slate-350 mx-auto" />
                        <p className="text-[10.5px] font-bold">
                          {lang === 'bn' ? 'কোনো মেসেজ থ্রেড পাওয়া যায়নি' : 'No message thread generated yet'}
                        </p>
                      </div>
                    ) : (
                      tickets.map((ticket, idx) => {
                        const hasUnread = ticket.lastMessageSender === 'admin' && ticket.status === 'Open';
                        return (
                          <button
                            key={`${ticket.id || 'ticket'}-${idx}`}
                            type="button"
                            onClick={() => setSelectedTicketId(ticket.id)}
                            className="w-full text-left bg-white border border-slate-100 hover:border-slate-200/80 p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-2xs active:scale-99 relative"
                          >
                            {hasUnread && (
                              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                            <div className="flex items-center gap-2.5">
                              <div className={`h-8 w-8 rounded-xl ${
                                ticket.status === 'Closed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'
                              } flex items-center justify-center shrink-0`}>
                                <Clock className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs text-slate-800 font-extrabold tracking-tight truncate max-w-[190px]">
                                  {ticket.subject}
                                </h4>
                                <p className="text-[9.5px] text-slate-400 font-bold truncate max-w-[190px]">
                                  {ticket.lastMessageText || ticket.category}
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
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>{lang === 'bn' ? 'এডমিন কে মেসেজ পাঠান (আনলিমিটেড)' : 'Send Message to Admin'}</span>
              </button>
            </div>
          )}

          {/* STATE 2: NEW TICKET CREATION FORM */}
          {isCreatingTicket && (
            <form onSubmit={handleCreateTicket} className="flex flex-col h-full justify-between">
              <div className="space-y-3">
                {/* Category block */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'ক্যাটাগরি নির্বাচন' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold outline-none focus:border-indigo-600 text-slate-800"
                  >
                    <option value="Recharge">{lang === 'bn' ? 'মোবাইল রিচার্জ' : 'Mobile Recharge'}</option>
                    <option value="Voucher">{lang === 'bn' ? 'ভাউচার স্টোর' : 'Voucher Request'}</option>
                    <option value="Transfer">{lang === 'bn' ? 'ব্যালেন্স ট্রান্সফার' : 'Balance Transfer'}</option>
                    <option value="Bill">{lang === 'bn' ? 'ইউটিলিটি বিল পে' : 'Bill Payment'}</option>
                    <option value="Other">{lang === 'bn' ? 'অন্যান্য সমস্যা' : 'Other Inquiries'}</option>
                  </select>
                </div>

                {/* Subject block */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'মেসেজের বিষয়' : 'Subject'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'bn' ? 'যেমন: রিচার্জ পেন্ডিং বা ব্যালেন্স সমস্যা...' : 'e.g. Recharge pending or balance problem'}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-bold outline-none focus:border-indigo-600 text-slate-800"
                  />
                </div>

                {/* Description input block */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'বিস্তারিত মেসেজ' : 'Detailed Message'}
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder={lang === 'bn' ? 'আপনার সমস্যার বিস্তারিত লিখুন, ট্রানজেকশন আইডি থাকলে সেটিও দিন...' : 'Write complete details here...'}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-bold outline-none focus:border-indigo-600 text-slate-800 resize-none"
                  />
                </div>

                {/* Photo attachment optional button */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'ছবি / স্ক্রিনশট যুক্ত করুন (ঐচ্ছিক)' : 'Attach Screenshot (Optional)'}
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleImagePick} 
                    className="hidden" 
                  />
                  {attachedImage ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-indigo-200">
                      <img src={attachedImage} alt="Attached" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setAttachedImage(null)}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Image className="h-4 w-4 text-indigo-600" />
                      <span>{lang === 'bn' ? 'ছবি বা প্রমাণ নির্বাচন করুন' : 'Select Screenshot/Receipt'}</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:from-violet-400 disabled:to-indigo-400 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-3"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{lang === 'bn' ? 'মেসেজ পাঠানো হচ্ছে...' : 'Sending Message...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    <span>{lang === 'bn' ? 'এডমিন কে মেসেজ পাঠান' : 'Submit Message to Admin'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STATE 3: LIVE SUPPORT CHAT WINDOW */}
          {selectedTicketId && activeTicket && (
            <div className="flex flex-col h-full justify-between flex-1">
              {/* Message scroll logs */}
              <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 space-y-3 scroller-hidden">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-[9px] font-mono font-black text-indigo-600 uppercase tracking-wider">
                    {lang === 'bn' ? 'সিস্টেম টিকিট ওপেন করা হয়েছে' : 'System Ticket Initiated'}
                  </span>
                  <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                    Subject: {activeTicket.subject}
                  </p>
                </div>

                {/* Actual messages log */}
                {activeTicket.messages && activeTicket.messages.map((msg, idx) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  return (
                    <div 
                      key={`${msg.id || 'msg'}-${idx}`} 
                      className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs font-bold leading-normal ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs shadow-indigo-500/5' 
                          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        {msg.text}
                        {msg.imageUrl && (
                          <img 
                            src={msg.imageUrl} 
                            alt="Attachment" 
                            className="mt-2 rounded-xl max-h-40 w-full object-cover border border-white/20" 
                          />
                        )}
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
              <form onSubmit={handleSendReply} className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                {attachedImage && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-indigo-200">
                    <img src={attachedImage} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setAttachedImage(null)}
                      className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleImagePick} 
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl cursor-pointer transition-colors"
                  >
                    <Image className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={lang === 'bn' ? 'এডমিন কে সরাসরি বার্তা লিখুন...' : 'Write message to admin...'}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </motion.div>

      {/* 🎙️ IN-APP LIVE AUDIO CALL OVERLAY MODAL */}
      <AnimatePresence>
        {isCalling && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-8 text-white select-none"
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>IN-APP LIVE AUDIO CALL</span>
              </span>
              <span>NIHAD BUSINESS POINT ADMIN</span>
            </div>

            {/* Calling Avatar & Waves */}
            <div className="flex flex-col items-center justify-center my-auto space-y-6 text-center">
              <div className="relative">
                {callStatus === 'Ringing' && (
                  <>
                    <span className="absolute -inset-4 rounded-full bg-indigo-500/30 animate-ping" />
                    <span className="absolute -inset-8 rounded-full bg-indigo-500/20 animate-pulse" />
                  </>
                )}
                {callStatus === 'Connected' && (
                  <span className="absolute -inset-4 rounded-full bg-emerald-500/30 animate-pulse" />
                )}
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 border-4 border-white/20 flex items-center justify-center text-3xl font-black shadow-2xl relative z-10">
                  <ShieldCheck className="h-14 w-14 text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-extrabold tracking-tight">
                  {lang === 'bn' ? 'এডমিন সাপোর্ট প্যানেল' : 'Admin Support Agent'}
                </h3>
                <p className="text-xs font-mono font-bold text-slate-400">
                  {callStatus === 'Ringing' && (lang === 'bn' ? 'এডমিন ডেস্কে কল করা হচ্ছে...' : 'Ringing Admin Desk...')}
                  {callStatus === 'Connected' && (
                    <span className="text-emerald-400 font-bold text-sm">
                      {lang === 'bn' ? 'কল কানেক্টেড' : 'Call Connected'} • {formatTimer(callDuration)}
                    </span>
                  )}
                  {callStatus === 'Ended' && (lang === 'bn' ? 'কল সমাপ্ত' : 'Call Ended')}
                </p>
              </div>
            </div>

            {/* Bottom Call Action Controls */}
            <div className="flex items-center gap-6 mb-8">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full border transition-all cursor-pointer ${
                  isMuted ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="p-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl transition-all cursor-pointer active:scale-95"
              >
                <PhoneOff className="h-7 w-7" />
              </button>

              <button
                type="button"
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`p-4 rounded-full border transition-all cursor-pointer ${
                  isSpeaker ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                {isSpeaker ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
