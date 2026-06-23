import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { 
  Lock, User, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Phone,
  Settings, Database
} from 'lucide-react';

interface AuthPanelProps {
  lang: Language;
  onSuccess: () => void;
}

export default function AuthPanel({ lang, onSuccess }: AuthPanelProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [phoneOrEmail, setPhoneOrEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Loading & error statuses
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const t = TRANSLATIONS[lang];

  // Localized wording override
  const labels = {
    loginTitle: lang === 'bn' ? 'অ্যাকাউন্টে লগইন করুন' : 'Login to Account',
    signUpTitle: lang === 'bn' ? 'মোবাইল নম্বর দিয়ে সাইন আপ' : 'Sign Up with Phone',
    loginSubtitle: lang === 'bn' ? 'আপনার নিহাদ টেলিকম অ্যাকাউন্টে প্রবেশ করুন' : 'Access your Nihad Telecom wallet',
    signUpSubtitle: lang === 'bn' ? 'আপনার ব্যক্তিগত নিহাদ টেলিকম অ্যাকাউন্ট এবং ওয়ালেট খুলুন' : 'Create your secure personal Nihad Telecom wallet',
    phoneOrEmailPlaceholder: lang === 'bn' ? 'মোবাইল নম্বর অথবা ইমেইল লিখুন' : 'Enter mobile number or email',
    phonePlaceholder: lang === 'bn' ? 'মোবাইল নম্বর লিখুন (১১ ডিজিট)' : 'Enter 11-digit mobile number',
    passwordPlaceholder: lang === 'bn' ? 'পিন বা পাসওয়ার্ড দিন' : 'Enter PIN or password',
    namePlaceholder: lang === 'bn' ? 'আপনার সম্পূর্ণ নাম লিখুন' : 'Enter your full name',
    submitLogin: lang === 'bn' ? 'লগইন করুন' : 'Sign In Now',
    submitSignUp: lang === 'bn' ? 'রেজিস্ট্রেশন সম্পূর্ণ করুন' : 'Complete Registration',
    switchSignUp: lang === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন (মোবাইল দিয়ে)' : 'Create an Account (with Phone)',
    switchLogin: lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign In',
    googleLoginBtn: lang === 'bn' ? 'গুগল একাউন্ট দিয়ে লগইন করুন' : 'Sign In with Google',
  };

  // Setup Secret (Firebase Config) interface
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [pastedConfigText, setPastedConfigText] = useState<string>('');
  const [configError, setConfigError] = useState<string>('');
  const [configSuccess, setConfigSuccess] = useState<string>('');

  const handleSaveConfig = () => {
    setConfigError('');
    setConfigSuccess('');
    try {
      let cleaned = pastedConfigText.trim();
      if (!cleaned) {
        setConfigError(lang === 'bn' ? 'অনুগ্রহ করে কনফিগারেশন কোড বা টেক্সট লিখুন!' : 'Please enter configuration code or text!');
        return;
      }
      
      // Extract properties between curly braces { } if pasted as a code block
      if (cleaned.includes('{') && cleaned.includes('}')) {
        const startIdx = cleaned.indexOf('{');
        const endIdx = cleaned.lastIndexOf('}');
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      }
      
      const extractField = (fieldName: string) => {
        // Match keys with optional quotes, optional spaces, optional quotes, and extracted value
        const regex = new RegExp(`['"]?${fieldName}['"]?\\s*:\\s*['"]([^'"]+)['"]`);
        const match = cleaned.match(regex);
        return match ? match[1].trim() : '';
      };

      const apiKey = extractField('apiKey');
      const authDomain = extractField('authDomain');
      const projectId = extractField('projectId');
      const storageBucket = extractField('storageBucket');
      const messagingSenderId = extractField('messagingSenderId');
      const appId = extractField('appId');
      const measurementId = extractField('measurementId');

      if (!apiKey || !projectId) {
        // Attempt strict JSON parse fallback
        try {
          // Replace single quotes with double quotes and sanitize
          let jsonCompatible = cleaned
            .replace(/'/g, '"')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          const parsed = JSON.parse(jsonCompatible);
          if (parsed.apiKey && parsed.projectId) {
            localStorage.setItem('custom_firebase_config', JSON.stringify(parsed));
            setConfigSuccess(lang === 'bn' ? 'কনফিগারেশন সফলভাবে সেভ হয়েছে! অ্যাপলিকেশন রিলোড হচ্ছে...' : 'Firebase configuration saved successfully! Application is reloading...');
            setTimeout(() => {
              window.location.reload();
            }, 1200);
            return;
          }
        } catch (jsonErr) {
          // Fall through
        }
        
        setConfigError(
          lang === 'bn' 
            ? 'ভুল ফরম্যাট! কোডে অবশ্যই "apiKey" এবং "projectId" প্রপার্টি থাকতে হবে।' 
            : 'Invalid format! Copied code must contain at least "apiKey" and "projectId".'
        );
        return;
      }

      const configObject = {
        apiKey,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
        messagingSenderId: messagingSenderId || '',
        appId: appId || '',
        measurementId: measurementId || ''
      };

      localStorage.setItem('custom_firebase_config', JSON.stringify(configObject));
      setConfigSuccess(lang === 'bn' ? 'ফায়ারবেস কনফিগারেশন সেভ হয়েছে! অ্যাপলিকেশন রিলোড হচ্ছে...' : 'Firebase config saved successfully! Application is reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error(err);
      setConfigError(lang === 'bn' ? 'কনফিগারেশন প্রসেস করতে ব্যর্থ হয়েছে!' : 'Failed to process the configuration format!');
    }
  };

  const handleResetConfig = () => {
    localStorage.removeItem('custom_firebase_config');
    setConfigSuccess(lang === 'bn' ? 'ডিফল্ট ফায়ারবেস কনফিগারেশনে ফেরত যাওয়া হয়েছে! রিলোড হচ্ছে...' : 'Reverted to default configuration! Application is reloading...');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setSuccessMessage(lang === 'bn' ? 'গুগল দিয়ে লগইন সফল হয়েছে!' : 'Successfully signed in with Google!');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      let localizedErr = err.message;
      if (err.code === 'auth/popup-closed-by-user') {
        localizedErr = lang === 'bn' ? 'গুগল সাইন-ইন উইন্ডো বন্ধ করা হয়েছে।' : 'Google Sign-In popup closed before completion.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        localizedErr = lang === 'bn' ? 'সাইন-ইন অনুরোধ বাতিল করা হয়েছে।' : 'Sign-In request was cancelled.';
      }
      setErrorMessage(localizedErr);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const inputVal = phoneOrEmail.trim();

    if (!inputVal) {
      setErrorMessage(lang === 'bn' ? 'মোবাইল নম্বর বা ইমেইল প্রদান করুন!' : 'Please enter your phone number or email!');
      setLoading(false);
      return;
    }

    let resolvedEmail = inputVal;

    // Is it a phone number signup/login?
    const isOnlyDigits = /^[0-9]+$/.test(inputVal);
    if (isOnlyDigits) {
      if (inputVal.length !== 11) {
        setErrorMessage(lang === 'bn' ? 'দয়া করে একটি সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন!' : 'Please enter a valid 11-digit Bangladeshi mobile number!');
        setLoading(false);
        return;
      }
      // Map it securely under the hood to a stable virtual email
      resolvedEmail = `${inputVal}@nihat-telecom.com`;
    }

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error(lang === 'bn' ? 'দয়া করে আপনার নাম দিন!' : 'Please enter your full name!');
        }
        if (password.length < 6) {
          throw new Error(lang === 'bn' ? 'পাসওয়ার্ড বা পিন অন্তত ৬ অক্ষরের হতে হবে!' : 'Password/PIN must be at least 6 characters!');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, resolvedEmail, password);
        // Set display name in profile
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });
        
        setSuccessMessage(lang === 'bn' ? 'মোবাইল দিয়ে অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' : 'Mobile account created successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        await signInWithEmailAndPassword(auth, resolvedEmail, password);
        setSuccessMessage(lang === 'bn' ? 'লগইন সফল হয়েছে!' : 'Successfully signed in!');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      let localizedErr = err.message;
      if (err.code === 'auth/email-already-in-use') {
        localizedErr = lang === 'bn' ? 'এই নম্বরটি ইতিমধ্যে ব্যবহিত হচ্ছে! অনুগ্রহ করে লগইন করুন।' : 'This phone number is already registered. Please sign in instead!';
      } else if (err.code === 'auth/invalid-email') {
        localizedErr = lang === 'bn' ? 'সঠিক মোবাইল নম্বর বা ইমেইল দিন!' : 'Invalid phone number or email syntax!';
      } else if (err.code === 'auth/weak-password') {
        localizedErr = lang === 'bn' ? 'পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে!' : 'Password or PIN is too weak!';
      } else if (err.code === 'auth/invalid-credential') {
        localizedErr = lang === 'bn' ? 'ভুল নম্বর/ইমেইল অথবা পাসওয়ার্ড! সঠিক তথ্য দিন।' : 'Incorrect mobile number, email, or PIN/password! Please verify.';
      } else if (err.code === 'auth/operation-not-allowed') {
        localizedErr = lang === 'bn' 
          ? 'আপনার ফায়ারবেস কনসোলে Email/Password সাইন-ইন মেথডটি চালু (Enabled) করা নেই। অনুগ্রহ করে Firebase Console > Authentication > Sign-in method-এ গিয়ে Email/Password ইনেবল করুন।' 
          : 'Email/Password sign-in provider is currently disabled in your Firebase console. Please go to your Firebase Console > Authentication > Sign-in method page and enable Email/Password provider.';
      }
      setErrorMessage(localizedErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between overflow-y-auto select-none font-sans">
      
      {/* Visual glowing points */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500/15 rounded-full blur-[120px] pointer-events-none" />



      {/* Top Header Logo Banner */}
      <div className="px-6 pt-10 pb-4 text-center relative z-10">
        <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 border border-white/10">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-xl font-black tracking-tight text-white mb-1">
          {t.appName}
        </h1>
        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em] font-mono">
          {lang === 'bn' ? 'সর্বোত্তম ও নিরাপদ টেলিকম ওয়ালেট' : 'SECURE & RELIABLE TELECOM WALLET'}
        </p>
      </div>

      {/* Main Input Form Column */}
      <div className="px-6 py-2 flex-1 flex flex-col justify-center relative z-10 max-w-sm mx-auto w-full">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold text-slate-100">
            {isSignUp ? labels.signUpTitle : labels.loginTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp ? labels.signUpSubtitle : labels.loginSubtitle}
          </p>
        </div>

        {/* Action Error message bar */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-rose-300 text-xs font-semibold animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Success message bar */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-xs font-semibold animate-pulse">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-3.5">
          {/* Custom Name field (Only for sign up) */}
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                {lang === 'bn' ? 'আপনার নাম' : 'Full Name'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder={labels.namePlaceholder}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Identifier Input (Phone or Email) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
              {isSignUp 
                ? (lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number')
                : (lang === 'bn' ? 'মোবাইল নম্বর বা ইমেইল' : 'Mobile Number or Email')
              }
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                {isSignUp ? <Phone className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </span>
              <input
                type="text"
                required
                placeholder={isSignUp ? labels.phonePlaceholder : labels.phoneOrEmailPlaceholder}
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
              {lang === 'bn' ? 'সিকিউর পিন / পাসওয়ার্ড (৬ ডিজিটের)' : 'Secure PIN / Password (6+ characters)'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={labels.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-11 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer border-0 bg-transparent"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Normal Register/Login Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-800 text-white rounded-2xl py-3 px-4 text-xs font-bold shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                <span>{lang === 'bn' ? 'প্রক্রিয়াধীন...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? labels.submitSignUp : labels.submitLogin}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* separator line */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5"></span>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-bold font-mono">
              {lang === 'bn' ? 'অথবা' : 'Or Continue With'}
            </span>
          </div>
        </div>

        {/* GOOGLE SIGN IN POPUP BUTTON */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-700 transition-all text-white border border-white/10 rounded-2xl py-3 px-4 flex items-center justify-center gap-3 text-xs font-bold active:scale-[0.98] cursor-pointer"
        >
          {/* Custom Google Color Icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.84 14.9 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.6 2.8C6.01 7.07 8.78 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.6 2.8c2.1-1.94 3.33-4.8 3.33-8.62z"
            />
            <path
              fill="#FBBC05"
              d="M5.1 14.7c-.24-.73-.38-1.5-.38-2.3s.14-1.57.38-2.3L1.5 7.3C.54 9.2 0 11.3 0 13.5s.54 4.3 1.5 6.2l3.6-2.8c-.24.2-.24-.2-.24-.2z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.6-2.8c-1.1.74-2.5 1.18-4.36 1.18-3.22 0-5.99-2.03-6.96-5.26l-3.6 2.8C3.39 20.35 7.35 23 12 23z"
            />
          </svg>
          <span>{labels.googleLoginBtn}</span>
        </button>
      </div>

      {/* Switch auth mode bottom drawer */}
      <div className="px-6 pb-10 pt-4 text-center border-t border-white/5 bg-slate-950/40 relative z-10">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setErrorMessage('');
            setSuccessMessage('');
          }}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer border-0 bg-transparent"
        >
          {isSignUp ? labels.switchLogin : labels.switchSignUp}
        </button>
      </div>



    </div>
  );
}
