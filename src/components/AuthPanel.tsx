import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithCredential, // not used, but good to import
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { 
  Mail, Lock, User, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';

interface AuthPanelProps {
  lang: Language;
  onSuccess: () => void;
}

export default function AuthPanel({ lang, onSuccess }: AuthPanelProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
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
    signUpTitle: lang === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create Free Account',
    loginSubtitle: lang === 'bn' ? 'আপনার ফ্লেক্সিলোড প্রো অ্যাকাউন্টে প্রবেশ করুন' : 'Access your Flexiload Pro wallet',
    signUpSubtitle: lang === 'bn' ? 'রিয়েল-টাইম ক্লাউড স্টোরেজ সুবিধা উপভোগ করুন' : 'Enjoy real-time persistent secure cloud sync',
    emailPlaceholder: lang === 'bn' ? 'ইমেইল এড্রেস লিখুন' : 'Enter email address',
    passwordPlaceholder: lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Enter password',
    namePlaceholder: lang === 'bn' ? 'আপনার সম্পূর্ণ নাম লিখুন' : 'Enter display name',
    submitLogin: lang === 'bn' ? 'লগইন করুন' : 'Sign In Now',
    submitSignUp: lang === 'bn' ? 'রেজিস্ট্রেশন সম্পূর্ণ করুন' : 'Complete Registration',
    switchSignUp: lang === 'bn' ? 'নূতন অ্যাকাউন্ট খুলুন' : 'Create an Account',
    switchLogin: lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign In',
    demoHint: lang === 'bn' ? 'ডেমো অ্যাকাউন্ট: demo@test.com (পিন/পাসওয়ার্ড: 123456)' : 'Demo Email: demo@test.com (Pass: 123456)',
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Enforce validations
        if (!displayName.trim()) {
          throw new Error(lang === 'bn' ? 'দয়া করে আপনার নাম দিন!' : 'Please enter your beautiful name!');
        }
        if (password.length < 6) {
          throw new Error(lang === 'bn' ? 'পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে!' : 'Password must be at least 6 characters!');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set display name in profile
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });
        
        setSuccessMessage(lang === 'bn' ? 'রেজিস্ট্রেশন সফল হয়েছে!' : 'Account registered successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMessage(lang === 'bn' ? 'লগইন সফল হয়েছে!' : 'Successfully signed in!');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      let localizedErr = err.message;
      if (err.code === 'auth/email-already-in-use') {
        localizedErr = lang === 'bn' ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে!' : 'This email address is already in use!';
      } else if (err.code === 'auth/invalid-email') {
        localizedErr = lang === 'bn' ? 'সঠিক ইমেইল ঠিকানা প্রদান করুন!' : 'Invalid email address syntax!';
      } else if (err.code === 'auth/weak-password') {
        localizedErr = lang === 'bn' ? 'পাসওয়ার্ডটি বেশ শক্তিশালী নয়!' : 'Password is too weak!';
      } else if (err.code === 'auth/invalid-credential') {
        localizedErr = lang === 'bn' ? 'ভুল ইমেইল বা পাসওয়ার্ড! সঠিক তথ্য দিন।' : 'Incorrect email or password! Please verify.';
      }
      setErrorMessage(localizedErr);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@test.com');
    setPassword('123456');
    setDisplayName('Demo User');
    setErrorMessage('');
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between overflow-y-auto select-none font-sans">
      
      {/* Visual glowing points */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Logo Banner */}
      <div className="px-6 pt-10 pb-4 text-center relative z-10">
        <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 border border-white/10">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-xl font-black tracking-tight text-white mb-1">
          {t.appName}
        </h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] font-mono">
          {lang === 'bn' ? 'রিয়েল-টাইম ক্লাউড ওয়ালেট' : 'REAL-TIME CLOUD WALLET'}
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
                  className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
              {lang === 'bn' ? 'ইমেইল' : 'Email Address'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                placeholder={labels.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
              {lang === 'bn' ? 'পাসওয়ার্ড (৬ অক্ষরের)' : 'Secure Password (6+ chars)'}
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
                className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-11 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-800 disabled:to-indigo-800 text-white rounded-2xl py-3 px-4 text-xs font-bold shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                <span>{lang === 'bn' ? 'প্রক্রিয়াধীন...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? labels.submitSignUp : labels.submitLogin}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Helper */}
        <div className="mt-5 border border-dashed border-white/10 rounded-2xl p-3 bg-white/5 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] text-slate-400 font-mono mb-2">
            🚀 {labels.demoHint}
          </p>
          <button
            onClick={handleFillDemo}
            className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            {lang === 'bn' ? 'আইডি পাসওয়ার্ড অটো ফিল করুন' : 'Auto-Fill Demo Credentials'}
          </button>
        </div>
      </div>

      {/* Switch auth mode bottom drawer */}
      <div className="px-6 pb-10 pt-4 text-center border-t border-white/5 bg-slate-950/40 relative z-10">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setErrorMessage('');
            setSuccessMessage('');
          }}
          className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer"
        >
          {isSignUp ? labels.switchLogin : labels.switchSignUp}
        </button>
      </div>

    </div>
  );
}
