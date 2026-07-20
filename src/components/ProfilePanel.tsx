import React, { useState } from 'react';
import {
  User, Shield, Phone, BellRing, Info, LogOut, ChevronRight,
  Sparkles, ExternalLink, Globe, HelpCircle, Fingerprint, Key, ShieldCheck, Check, X, Wallet, RefreshCw, Camera, Gift
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

interface ProfilePanelProps {
  lang: Language;
  onLanguageToggle: () => void;
  onNotificationClick: () => void;
  onLogout: () => void;
  onAdminClick?: () => void;
  helplineNumber?: string;
  whatsappUrl?: string;
  onAddFundClick?: () => void;
  userData?: any;
  onKYCClick?: () => void;
  onReferralClick?: () => void;
}

export default function ProfilePanel({
  lang,
  onLanguageToggle,
  onNotificationClick,
  onLogout,
  onAdminClick,
  helplineNumber = '01970250988',
  whatsappUrl = 'https://wa.me/8801970250988',
  onAddFundClick,
  userData,
  onKYCClick,
  onReferralClick,
}: ProfilePanelProps) {
  const t = TRANSLATIONS[lang];

  const currentUser = auth.currentUser;
  const kycStatus = userData?.kycStatus || 'not_verified';
  const userInitials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : currentUser?.email
    ? currentUser.email.slice(0, 2).toUpperCase()
    : 'NBP';
  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'NIHAD BUSINESS POINT User';
  const userEmail = currentUser?.email || 'user@test.com';

  // Security States
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [pinSuccess, setPinSuccess] = useState<string>('');

  // Profile Upload State
  const [uploadingProfile, setUploadingProfile] = useState(false);

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingProfile(true);
    try {
      // Read to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64String = await base64Promise;

      // Upload to ImgBB
      const base64Data = base64String.split(',')[1] || base64String;
      const body = new FormData();
      body.append('image', base64Data);

      const response = await fetch('https://api.imgbb.com/1/upload?key=5a96450548a710e6f8cf39c709ed732a', {
        method: 'POST',
        body: body,
      });

      if (!response.ok) {
        throw new Error('Image upload failed');
      }

      const result = await response.json();
      const imageUrl = result.data.url;

      // Update Auth profile
      await updateProfile(currentUser, { photoURL: imageUrl });

      // Update Firestore users collection
      await updateDoc(doc(db, 'users', currentUser.uid), {
        photoURL: imageUrl
      });

      // Update registered_users collection (if exists)
      await updateDoc(doc(db, 'registered_users', currentUser.uid), {
        photoURL: imageUrl
      }).catch(err => console.log("Non-fatal registered_users sync error:", err));

    } catch (err) {
      console.error("Profile picture upload error:", err);
      alert(lang === 'bn' ? 'ছবি আপলোড করতে ব্যর্থ হয়েছে।' : 'Failed to upload profile picture.');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    const savedPin = localStorage.getItem('secure_wallet_pin') || '1234';

    if (currentPinInput !== savedPin) {
      setPinError(lang === 'bn' ? 'বর্তমান পিন নম্বরটি সঠিক নয়!' : 'Current PIN is incorrect!');
      return;
    }

    if (newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
      setPinError(lang === 'bn' ? 'নতুন পিন অবশ্যই ৪-ডিজিটের সংখ্যা হতে হবে!' : 'New PIN must be exactly 4 digits!');
      return;
    }

    // Success update
    localStorage.setItem('secure_wallet_pin', newPinInput);
    setPinSuccess(lang === 'bn' ? 'সফলভাবে পিন পরিবর্তন করা হয়েছে!' : 'PIN successfully updated!');
    setCurrentPinInput('');
    setNewPinInput('');
    setTimeout(() => {
      setShowPinModal(false);
      setPinSuccess('');
    }, 1500);
  };

  return (
    <div className="space-y-4 px-4 py-2 pb-24">
      {/* Profile summary card */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-6 rounded-[28px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div 
            onClick={() => document.getElementById('profilePicInput')?.click()}
            className="relative w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg font-display text-white text-xl font-bold overflow-hidden cursor-pointer group hover:bg-white/30 transition-all shrink-0"
          >
            {uploadingProfile ? (
              <RefreshCw className="h-5 w-5 animate-spin text-white" />
            ) : (userData?.photoURL || currentUser?.photoURL) ? (
              <img 
                src={userData?.photoURL || currentUser?.photoURL} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-2xl" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{userInitials}</span>
            )}
            
            {/* Hover Camera Icon overlay */}
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </div>
          <input 
            id="profilePicInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePicChange}
            disabled={uploadingProfile}
          />
          <div>
            <h3 className="text-white font-extrabold text-sm tracking-tight font-display">
              {userName}
            </h3>
            <span className="text-blue-200 font-mono text-[10px] font-bold tracking-widest block">
              {userEmail}
            </span>
            <div className="inline-flex items-center gap-1.5 text-yellow-300 text-[9px] bg-white/10 backdrop-blur-sm border border-white/10 uppercase tracking-wide font-extrabold px-2.0 py-0.5 rounded-full mt-1">
              <Sparkles className="h-2.5 w-2.5 fill-yellow-500 text-yellow-300" />
              <span>{t.userStatus}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-white/50 relative z-10 font-semibold">
          <span>{t.joinedDate}</span>
          <span className="bg-white/10 text-white hover:bg-white/20 transition-all font-bold px-2 py-0.5 rounded-sm select-none">
            ID: {currentUser?.uid ? `FLX-${currentUser.uid.slice(0, 6).toUpperCase()}` : 'FLX-88290'}
          </span>
        </div>
      </div>

      {/* KYC Status Banner */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              kycStatus === 'verified' ? 'bg-emerald-50 text-emerald-600' :
              kycStatus === 'pending' ? 'bg-amber-50 text-amber-600' :
              kycStatus === 'rejected' ? 'bg-rose-50 text-rose-600' :
              'bg-slate-50 text-slate-400'
            }`}>
              {kycStatus === 'verified' ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                {lang === 'bn' ? 'ডিজিটাল কেওয়াইসি' : 'Digital KYC Status'}
              </h4>
              <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                kycStatus === 'verified' ? 'text-emerald-500' :
                kycStatus === 'pending' ? 'text-amber-500' :
                kycStatus === 'rejected' ? 'text-rose-500' :
                'text-slate-400'
              }`}>
                {kycStatus === 'verified' ? (lang === 'bn' ? 'ভেরিফাইড' : 'Verified') :
                 kycStatus === 'pending' ? (lang === 'bn' ? 'অপেক্ষমান' : 'Pending Verification') :
                 kycStatus === 'rejected' ? (lang === 'bn' ? 'বাতিল করা হয়েছে' : 'Rejected') :
                 (lang === 'bn' ? 'ভেরিফাইড নয়' : 'Not Verified')}
              </p>
            </div>
          </div>
          
          {(kycStatus === 'not_verified' || kycStatus === 'rejected') && (
            <button
              onClick={onKYCClick}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-md"
            >
              {lang === 'bn' ? 'ভেরিফাই করুন' : 'Verify Now'}
            </button>
          )}

          {kycStatus === 'pending' && (
            <div className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black border border-amber-100 flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে' : 'Under Review'}</span>
            </div>
          )}

          {kycStatus === 'verified' && (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black border border-emerald-100 flex items-center gap-1.5">
              <Check className="h-3 w-3" />
              <span>{lang === 'bn' ? 'সুরক্ষিত' : 'Secured'}</span>
            </div>
          )}
        </div>
        
        {kycStatus === 'rejected' && userData?.kycData?.rejectionReason && (
          <div className="mt-3 p-2 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-[9px] font-bold text-rose-600">
              {lang === 'bn' ? 'বাতিলের কারণ:' : 'Reason:'} {userData.kycData.rejectionReason}
            </p>
          </div>
        )}

        {userData?.kycData?.nidFrontUrl && userData?.kycData?.nidBackUrl && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              {lang === 'bn' ? 'সাবমিট করা এনআইডি কার্ডসমূহ' : 'Submitted NID Cards'}
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                <img 
                  src={userData.kycData.nidFrontUrl} 
                  alt="NID Front" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                  {lang === 'bn' ? 'সামনের অংশ' : 'Front'}
                </span>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                <img 
                  src={userData.kycData.nidBackUrl} 
                  alt="NID Back" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                  {lang === 'bn' ? 'পিছনের অংশ' : 'Back'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Grid list */}
      <div className="space-y-2.5 pt-1">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider px-1">
          {t.accountConfig}
        </h3>

        <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-sm divide-y divide-slate-100 font-medium">
          {/* Add Fund / টাকা যোগ করুন button */}
          {onAddFundClick && (
            <button
              onClick={onAddFundClick}
              id="profile-add-fund-btn"
              className="w-full text-left p-3.5 flex items-center justify-between bg-indigo-50/20 hover:bg-indigo-50/50 transition-colors cursor-pointer group animate-pulse-subtle"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-slate-800 font-bold text-xs">
                    {lang === 'bn' ? 'অ্যাড ফান্ড (টাকা যোগ করুন)' : 'Add Fund (Deposit)'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {lang === 'bn' ? 'বিকাশ, রকেট বা নগদ দিয়ে ওয়ালেটে টাকা যোগ করুন' : 'Add balance instantly using bKash, Nagad or Rocket'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Toggle language switch item */}
          <button
            onClick={onLanguageToggle}
            id="profile-lang-btn"
            className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold text-xs">
                  {lang === 'bn' ? 'ভাষা পরিবর্তন (Language)' : 'Change Language'}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {lang === 'bn' ? 'Switch to English' : 'বাংলা ভাষায় পরিবর্তন করুন'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold">
              <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
              <ChevronRight className="h-4 w-4 text-slate-350 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Administrative Portal button */}
          {onAdminClick && (
            <button
              onClick={onAdminClick}
              id="profile-admin-btn"
              className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-[12px] flex items-center justify-center">
                  <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-slate-800 font-bold text-xs">
                    {lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল পোর্টাল' : 'Admin Portal Command'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {lang === 'bn' ? 'অফার স্লাইড, প্যাক ও পেন্ডিং পেমেন্ট এপ্রুভাল' : 'Edit slider promos, celular packs & approve payments'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-350 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Notifications config */}
          <button
            onClick={onNotificationClick}
            id="profile-notify-btn"
            className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <BellRing className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold text-xs">
                  {t.notifications}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {lang === 'bn' ? 'আপনার ইনবক্স বার্তা' : 'Check push promotions and offers'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-350 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Toggle Push Notifications Switch */}
          <div className="p-3.5 flex items-center justify-between bg-slate-50/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <BellRing className="h-4.5 w-4.5 text-purple-600" />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold text-xs">
                  {lang === 'bn' ? 'পুশ নোটিফিকেশন' : 'Push Notifications'}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {lang === 'bn' ? 'রিয়েল-টাইম পুশ নোটিফিকেশন অন/অফ' : 'Enable real-time push messages'}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!currentUser) return;
                const currentVal = userData?.pushNotificationsEnabled !== false;
                await updateDoc(doc(db, 'users', currentUser.uid), {
                  pushNotificationsEnabled: !currentVal
                });
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer outline-none ${
                (userData?.pushNotificationsEnabled !== false) ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  (userData?.pushNotificationsEnabled !== false) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle SMS Alerts Switch */}
          <div className="p-3.5 flex items-center justify-between bg-slate-50/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Phone className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold text-xs">
                  {lang === 'bn' ? 'এসএমএস অ্যালার্ট' : 'SMS Alerts & Chimes'}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {lang === 'bn' ? 'লেনদেনের সয়ংক্রিয় এসএমএস ও নোটিফিকেশন টিউন' : 'Simulated incoming SMS text and sound'}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!currentUser) return;
                const currentVal = userData?.smsAlertsEnabled === true;
                await updateDoc(doc(db, 'users', currentUser.uid), {
                  smsAlertsEnabled: !currentVal
                });
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer outline-none ${
                (userData?.smsAlertsEnabled === true) ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  (userData?.smsAlertsEnabled === true) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Referral Program Action */}
          {onReferralClick && (
            <button
              onClick={onReferralClick}
              id="profile-referral-btn"
              className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Gift className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-slate-800 font-bold text-xs">
                    {lang === 'bn' ? 'রেফার করুন ও আয় করুন' : 'Refer & Earn'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {lang === 'bn' ? 'বন্ধুদের ইনভাইট করে আনলিমিটেড বোনাস পান!' : 'Invite friends and receive unlimited bonus rewards!'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-350 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}



          {/* Change PIN Action */}
          <button
            onClick={() => {
              setPinError('');
              setPinSuccess('');
              setShowPinModal(true);
            }}
            id="profile-change-pin-btn"
            className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Key className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold text-xs">
                  {lang === 'bn' ? '৪-ডিজিটের ওয়ালেট পিন পরিবর্তন' : 'Change Secure PIN'}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {lang === 'bn' ? 'আপনার গোপন পিন কোড পরিবর্তন করুন' : 'Configure current/new 4-digit PIN'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-350 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Secure Logout Action */}
          <button
            onClick={onLogout}
            id="profile-logout-btn"
            className="w-full text-left p-3.5 flex items-center justify-between hover:bg-rose-50/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <LogOut className="h-4.5 w-4.5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold text-xs">
                  {lang === 'bn' ? 'অ্যাকাউন্ট থেকে লগআউট' : 'Secure Sign Out'}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {lang === 'bn' ? 'নিরাপদভাবে সেশন বন্ধ করুন' : 'Log out of this security profile'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-rose-350 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Support details */}
      <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-[24px] flex items-start gap-3">
        <div className="p-2 bg-sky-500 text-white rounded-xl shadow-xs flex-shrink-0">
          <Phone className="h-4.5 w-4.5 fill-white/10" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-slate-900 text-xs font-bold font-display">
            {t.support}
          </h4>
          <p className="text-slate-600 text-[10px] leading-relaxed font-semibold">
            {lang === 'bn' ? 'আমাদের কাস্টমার কেয়ার এর সাথে ২৪/৭ যোগাযোগ করতে পারেন।' : 'You can connect with our dedicated helpdesk for 24/7 priority response.'}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            <a
              href={`tel:${helplineNumber}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline"
            >
              <span>📞 {helplineNumber}</span>
              <ExternalLink className="h-3 w-3 inline" />
            </a>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
              >
                <span>💬 WhatsApp Support</span>
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* App Version Info */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-slate-400 font-bold tracking-wider font-mono">
          {t.appVersion}
        </p>
      </div>

      {/* SECURE PIN CHANGE MODAL COMPONENT */}
      {showPinModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setShowPinModal(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
          />
          
          <div className="relative bg-white w-full max-w-sm rounded-[28px] shadow-2xl p-6 border border-slate-100 flex flex-col space-y-4 relative z-10 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-slate-900 font-extrabold text-sm tracking-tight flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
                <span>{lang === 'bn' ? 'পিন কোড পরিবর্তন' : 'Update Security PIN'}</span>
              </h3>
              <button
                onClick={() => setShowPinModal(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleChangePinSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'বর্তমান পিন দিন' : 'Current 4-Digit PIN'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[1em] text-lg font-bold p-2.5 rounded-2xl bg-slate-50 border border-slate-150 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'bn' ? 'নতুন ৪-ডিজিট পিন দিন' : 'New 4-Digit PIN'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[1em] text-lg font-bold p-2.5 rounded-2xl bg-slate-50 border border-slate-150 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {pinError && (
                <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10.5px] font-semibold text-center flex items-center justify-center gap-1.5">
                  <X className="h-3.5 w-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccess && (
                <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10.5px] font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>{lang === 'bn' ? 'পিন আপডেট করুন' : 'Update Pin Code'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
