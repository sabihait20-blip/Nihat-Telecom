import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ShieldCheck, Camera, CreditCard, User, Calendar, 
  Upload, CheckCircle2, AlertCircle, RefreshCw, FileText, Image as ImageIcon,
  Info, ArrowRight
} from 'lucide-react';
import { Language } from '../types';
import { db, auth } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

interface KYCModalProps {
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export default function KYCModal({ lang, onClose, onSuccess }: KYCModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    nidNumber: '',
    dob: '',
    nidFront: null as string | null,
    nidBack: null as string | null
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'nidFront' | 'nidBack') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [side]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToImgBB = async (base64String: string): Promise<string> => {
    const base64Data = base64String.split(',')[1] || base64String;
    const body = new FormData();
    body.append('image', base64Data);

    const response = await fetch('https://api.imgbb.com/1/upload?key=5a96450548a710e6f8cf39c709ed732a', {
      method: 'POST',
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Image upload failed');
    }

    const result = await response.json();
    return result.data.url;
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.nidNumber || !formData.dob || !formData.nidFront || !formData.nidBack) {
      setError(lang === 'bn' ? 'সবগুলো ঘর পূরণ করুন এবং ছবি আপলোড করুন!' : 'Please fill all fields and upload both images!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No user logged in");

      // Upload images to ImgBB first
      const frontUrl = await uploadToImgBB(formData.nidFront);
      const backUrl = await uploadToImgBB(formData.nidBack);

      const kycSubmission = {
        kycStatus: 'pending',
        kycData: {
          fullName: formData.fullName,
          nidNumber: formData.nidNumber,
          dob: formData.dob,
          nidFrontUrl: frontUrl,
          nidBackUrl: backUrl,
          submittedAt: new Date().toISOString()
        }
      };

      await updateDoc(doc(db, 'users', currentUser.uid), kycSubmission);
      
      onSuccess();
    } catch (err: any) {
      console.error("KYC Submission Error:", err);
      setError(lang === 'bn' ? 'সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Failed to submit KYC. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {lang === 'bn' ? 'ডিজিটাল কেওয়াইসি ভেরিফিকেশন' : 'Digital KYC Verification'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'bn' ? 'ধাপ' : 'Step'} {step} {lang === 'bn' ? 'এর' : 'of'} 2
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-shake">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {lang === 'bn' ? 'এনআইডি অনুযায়ী পূর্ণ নাম' : 'Full Name (As per NID)'}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder={lang === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your full name'}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {lang === 'bn' ? 'এনআইডি নম্বর' : 'NID Number'}
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    value={formData.nidNumber}
                    onChange={e => setFormData(prev => ({ ...prev, nidNumber: e.target.value }))}
                    placeholder={lang === 'bn' ? '১০ বা ১৭ ডিজিটের নম্বর' : '10 or 17 digit number'}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {lang === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="date"
                    value={formData.dob}
                    onChange={e => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 items-start">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-blue-600/80 leading-relaxed">
                  {lang === 'bn' 
                    ? 'আপনার তথ্যগুলো এনআইডি কার্ডের সাথে হুবহু মিল থাকতে হবে। ভুল তথ্য দিলে ভেরিফিকেশন বাতিল হতে পারে।' 
                    : 'Your information must exactly match your NID card. Providing incorrect information may lead to rejection.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {lang === 'bn' ? 'এনআইডি সামনের অংশ' : 'NID Front Side'}
                </label>
                <div 
                  onClick={() => document.getElementById('nidFrontInput')?.click()}
                  className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all overflow-hidden group"
                >
                  {formData.nidFront ? (
                    <img src={formData.nidFront} alt="Front" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="p-3 bg-white rounded-2xl shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        <Camera className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-500">
                        {lang === 'bn' ? 'ছবি তুলুন বা আপলোড করুন' : 'Take Photo or Upload'}
                      </p>
                    </>
                  )}
                  <input 
                    id="nidFrontInput" 
                    type="file" 
                    accept="image/*" 
                    hidden 
                    onChange={e => handleImageChange(e, 'nidFront')} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {lang === 'bn' ? 'এনআইডি পিছনের অংশ' : 'NID Back Side'}
                </label>
                <div 
                  onClick={() => document.getElementById('nidBackInput')?.click()}
                  className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all overflow-hidden group"
                >
                  {formData.nidBack ? (
                    <img src={formData.nidBack} alt="Back" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="p-3 bg-white rounded-2xl shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        <Camera className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-500">
                        {lang === 'bn' ? 'ছবি তুলুন বা আপলোড করুন' : 'Take Photo or Upload'}
                      </p>
                    </>
                  )}
                  <input 
                    id="nidBackInput" 
                    type="file" 
                    accept="image/*" 
                    hidden 
                    onChange={e => handleImageChange(e, 'nidBack')} 
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-[10px] font-bold text-emerald-600">
                  {lang === 'bn' ? 'পরিষ্কার এবং উজ্জ্বল ছবি আপলোড করুন' : 'Ensure photos are clear and readable'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer"
            >
              {lang === 'bn' ? 'পিছনে' : 'Back'}
            </button>
          )}
          <button
            onClick={step === 1 ? () => setStep(2) : handleSubmit}
            disabled={loading}
            className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-lg shadow-slate-950/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{lang === 'bn' ? 'প্রক্রিয়াধীন...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <span>{step === 1 ? (lang === 'bn' ? 'পরবর্তী' : 'Next Step') : (lang === 'bn' ? 'ভেরিফিকেশনের জন্য পাঠান' : 'Submit for Verification')}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
