import React, { useState } from 'react';
import {
  User, Shield, Phone, BellRing, Info, LogOut, ChevronRight,
  Sparkles, ExternalLink, Globe, HelpCircle, Fingerprint, Key, ShieldCheck, Check, X
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { auth } from '../firebase';

interface ProfilePanelProps {
  lang: Language;
  onLanguageToggle: () => void;
  onNotificationClick: () => void;
  onLogout: () => void;
  onAdminClick?: () => void;
}

export default function ProfilePanel({
  lang,
  onLanguageToggle,
  onNotificationClick,
  onLogout,
  onAdminClick,
}: ProfilePanelProps) {
  const t = TRANSLATIONS[lang];

  const currentUser = auth.currentUser;
  const userInitials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : currentUser?.email
    ? currentUser.email.slice(0, 2).toUpperCase()
    : 'NT';
  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Nihad Telecom User';
  const userEmail = currentUser?.email || 'user@test.com';

  // Security States
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(() => {
    return localStorage.getItem('biometric_enabled') !== 'false';
  });
  
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [pinSuccess, setPinSuccess] = useState<string>('');

  const handleToggleBiometric = () => {
    const newVal = !biometricEnabled;
    setBiometricEnabled(newVal);
    localStorage.setItem('biometric_enabled', newVal.toString());
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
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg font-display text-white text-xl font-bold">
            {userInitials}
          </div>
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

      {/* Settings Grid list */}
      <div className="space-y-2.5 pt-1">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider px-1">
          {t.accountConfig}
        </h3>

        <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-sm divide-y divide-slate-100 font-medium">
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

          {/* Biometric Toggle Switch */}
          <div
            id="profile-biometric-toggle"
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Fingerprint className="h-4.5 w-4.5 text-purple-600" />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold text-xs">
                  {lang === 'bn' ? 'বায়োমেট্রিক লগইন' : 'Biometric Sensor Login'}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {lang === 'bn' ? 'ফেস আইডি / ফিঙ্গারপ্রিন্ট সেন্সর টগল করুন' : 'Enable Face / Touch ID quick-unlock'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleBiometric}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer focus:outline-none ${
                biometricEnabled ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

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
            {t.supportDesc}
          </p>
          <a
            href="tel:16247"
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 pt-1"
          >
            <span>১৬২৪৭ (16247)</span>
            <ExternalLink className="h-3 w-3" />
          </a>
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
