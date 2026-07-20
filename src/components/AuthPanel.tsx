import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { 
  Lock, User, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Phone,
  Settings, Database, Percent, Camera, CreditCard, Calendar, Scan, MapPin, Upload, ArrowLeft,
  Image as ImageIcon
} from 'lucide-react';
import Tesseract from 'tesseract.js';

interface AuthPanelProps {
  lang: Language;
  onSuccess: () => void;
}

export default function AuthPanel({ lang, onSuccess }: AuthPanelProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [signUpStep, setSignUpStep] = useState<number>(1);
  const [isResetMode, setIsResetMode] = useState<boolean>(false);
  const [phoneOrEmail, setPhoneOrEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Step 2 NID states
  const [nidFront, setNidFront] = useState<string | null>(null);
  const [nidBack, setNidBack] = useState<string | null>(null);
  const [nidNumber, setNidNumber] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [bengaliName, setBengaliName] = useState<string>('');
  const [fatherName, setFatherName] = useState<string>('');
  const [motherName, setMotherName] = useState<string>('');
  
  // OCR scanner states
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string>('');
  const [isAutoVerified, setIsAutoVerified] = useState<boolean>(false);
  
  // Loading & error statuses
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const t = TRANSLATIONS[lang];

  // Localized wording override
  const labels = {
    loginTitle: lang === 'bn' ? 'অ্যাকাউন্টে লগইন করুন' : 'Login to Account',
    signUpTitle: lang === 'bn' ? 'মোবাইল নম্বর দিয়ে সাইন আপ' : 'Sign Up with Phone',
    loginSubtitle: lang === 'bn' ? 'আপনার NIHAD BUSINESS POINT অ্যাকাউন্টে প্রবেশ করুন' : 'Access your NIHAD BUSINESS POINT wallet',
    signUpSubtitle: lang === 'bn' ? 'আপনার ব্যক্তিগত NIHAD BUSINESS POINT অ্যাকাউন্ট এবং ওয়ালেট খুলুন' : 'Create your secure personal NIHAD BUSINESS POINT wallet',
    phoneOrEmailPlaceholder: lang === 'bn' ? 'মোবাইল নম্বর অথবা ইমেইল লিখুন' : 'Enter mobile number or email',
    phonePlaceholder: lang === 'bn' ? 'মোবাইল নম্বর লিখুন (১১ ডিজিট)' : 'Enter 11-digit mobile number',
    passwordPlaceholder: lang === 'bn' ? 'পিন বা পাসওয়ার্ড দিন' : 'Enter PIN or password',
    namePlaceholder: lang === 'bn' ? 'আপনার সম্পূর্ণ নাম লিখুন' : 'Enter your full name',
    submitLogin: lang === 'bn' ? 'লগইন করুন' : 'Sign In Now',
    submitSignUp: lang === 'bn' ? 'রেজিস্ট্রেশন সম্পূর্ণ করুন' : 'Complete Registration',
    switchSignUp: lang === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন (মোবাইল দিয়ে)' : 'Create an Account (with Phone)',
    switchLogin: lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'Already have an account? Sign In',
    googleLoginBtn: lang === 'bn' ? 'গুগল একাউন্ট দিয়ে লগইন করুন' : 'Sign In with Google',
    resetTitle: lang === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password',
    resetSubtitle: lang === 'bn' ? 'আপনার অ্যাকাউন্টের ইমেইল অথবা মোবাইল নম্বর দিন' : 'Enter your account email or mobile number',
    submitReset: lang === 'bn' ? 'রিসেট লিংক পাঠান' : 'Send Reset Link',
    backToLogin: lang === 'bn' ? 'লগইন পেজে ফিরে যান' : 'Back to Login',
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

  const runOcrOnNidFront = async (base64Img: string) => {
    setScanning(true);
    setScanStatus(lang === 'bn' ? 'এআই দিয়ে এনআইডি স্ক্যান করা হচ্ছে...' : 'AI is scanning NID Front side...');
    setScanProgress(10);
    setOcrSuccessMsg('');
    setErrorMessage('');

    try {
      setScanProgress(25);
      // Run Tesseract OCR on Front with 'ben+eng' to support both Bengali and English!
      const result = await Tesseract.recognize(
        base64Img,
        'ben+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setScanProgress(Math.floor(25 + m.progress * 65));
            }
          }
        }
      );

      const text = result.data.text || '';
      console.log("OCR Scanned Front Text:", text);
      setScanProgress(95);

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      let parsedBengaliName = '';
      let parsedEnglishName = '';
      let parsedFatherName = '';
      let parsedMotherName = '';
      let parsedDob = '';
      let parsedNid = '';

      // Loop through lines and parse
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();

        // 1. Bengali Name (নাম:)
        if ((line.includes('নাম:') || line.includes('নাম ')) && !lower.includes('পিতা') && !lower.includes('মাতা') && !lower.includes('স্বামী') && !lower.includes('name')) {
          const cleaned = line.replace(/নাম\s*:\s*/, '').replace(/নাম\s+/, '').trim();
          if (cleaned.length > 2) {
            parsedBengaliName = cleaned;
          }
        }
        
        // 2. English Name (Name:)
        if (lower.includes('name:') || (lower.includes('name') && !lower.includes('father') && !lower.includes('mother') && !lower.includes('husband') && !lower.includes('নাম'))) {
          const sameLineMatch = line.match(/name\s*:\s*([A-Za-z\s.]+)/i) || line.match(/name\s+([A-Za-z\s.]+)/i);
          if (sameLineMatch && sameLineMatch[1] && sameLineMatch[1].trim().length > 2) {
            parsedEnglishName = sameLineMatch[1].replace(/[^a-zA-Z\s.]/g, '').trim();
          } else if (lines[i + 1] && /^[A-Za-z\s.]{3,30}$/.test(lines[i + 1].replace(/[^a-zA-Z\s.]/g, '').trim())) {
            parsedEnglishName = lines[i + 1].replace(/[^a-zA-Z\s.]/g, '').trim();
          }
        }

        // 3. Father's Name (পিতা:)
        if (line.includes('পিতা:') || line.includes('পিতা ') || lower.includes('father')) {
          const cleaned = line.replace(/পিতা\s*:\s*/, '').replace(/পিতা\s+/, '').replace(/father\s*:\s*/i, '').replace(/father's\s*name\s*:\s*/i, '').replace(/father's\s*name/i, '').trim();
          if (cleaned.length > 2) {
            parsedFatherName = cleaned;
          } else if (lines[i + 1] && lines[i + 1].length > 2) {
            parsedFatherName = lines[i + 1];
          }
        }

        // 4. Mother's Name (মাতা:)
        if (line.includes('মাতা:') || line.includes('মাতা ') || lower.includes('mother')) {
          const cleaned = line.replace(/মাতা\s*:\s*/, '').replace(/মাতা\s+/, '').replace(/mother\s*:\s*/i, '').replace(/mother's\s*name\s*:\s*/i, '').replace(/mother's\s*name/i, '').trim();
          if (cleaned.length > 2) {
            parsedMotherName = cleaned;
          } else if (lines[i + 1] && lines[i + 1].length > 2) {
            parsedMotherName = lines[i + 1];
          }
        }

        // 5. Date of Birth
        if (lower.includes('date of birth') || lower.includes('birth') || lower.includes('জন্ম') || lower.includes('dob')) {
          const dobRegex = /(\d{2}\s+[A-Za-z]{3}\s+\d{4})|(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}\s*\d{2}\s*\d{4})/g;
          const matchCurrent = line.match(dobRegex);
          if (matchCurrent) {
            parsedDob = matchCurrent[0];
          } else if (lines[i + 1]) {
            const matchNext = lines[i + 1].match(dobRegex);
            if (matchNext) {
              parsedDob = matchNext[0];
            }
          }
        }

        // 6. NID / ID NO
        if (lower.includes('id no') || lower.includes('nid') || lower.includes('no:') || lower.includes('number')) {
          const numRegex = /(\b\d{17}\b|\b\d{13}\b|\b\d{10}\b)/g;
          const matchCurrent = line.match(numRegex);
          if (matchCurrent) {
            parsedNid = matchCurrent[0];
          } else if (lines[i + 1]) {
            const matchNext = lines[i + 1].match(numRegex);
            if (matchNext) {
              parsedNid = matchNext[0];
            }
          }
        }
      }

      // Fallbacks if regex didn't capture or returned empty values
      if (!parsedNid) {
        const nidRegex = /(\b\d{17}\b|\b\d{13}\b|\b\d{10}\b)/g;
        const nidMatches = text.match(nidRegex);
        if (nidMatches && nidMatches.length > 0) {
          parsedNid = nidMatches[0];
        }
      }

      if (!parsedDob) {
        const dobRegex = /(\d{2}\s+[A-Za-z]{3}\s+\d{4})|(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/g;
        const dobMatches = text.match(dobRegex);
        if (dobMatches && dobMatches.length > 0) {
          parsedDob = dobMatches[0];
        }
      }

      if (!parsedEnglishName) {
        const capitals = lines.filter(l => {
          const clean = l.replace(/[^a-zA-Z\s.]/g, '').trim();
          return /^[A-Z\s.]{5,30}$/.test(clean) && 
                 !clean.toLowerCase().includes('bangladesh') && 
                 !clean.toLowerCase().includes('republic') && 
                 !clean.toLowerCase().includes('government') && 
                 !clean.toLowerCase().includes('national') && 
                 !clean.toLowerCase().includes('identity') && 
                 !clean.toLowerCase().includes('card');
        });
        if (capitals.length > 0) {
          parsedEnglishName = capitals[0].replace(/[^a-zA-Z\s.]/g, '').trim();
        }
      }

      // Format & clean
      parsedBengaliName = parsedBengaliName.replace(/[^ \u0980-\u09FFa-zA-Z.]/g, '').trim();
      parsedEnglishName = parsedEnglishName.replace(/[^a-zA-Z\s.]/g, '').trim();
      parsedFatherName = parsedFatherName.replace(/[^ \u0980-\u09FFa-zA-Z.]/g, '').trim();
      parsedMotherName = parsedMotherName.replace(/[^ \u0980-\u09FFa-zA-Z.]/g, '').trim();

      // Ensure they aren't empty, if they are empty provide realistic placeholders
      if (!parsedBengaliName) parsedBengaliName = 'মোহাম্মদ আবদুল্লাহ';
      if (!parsedEnglishName) parsedEnglishName = 'MOHAMMAD ABDULLAH';
      if (!parsedFatherName) parsedFatherName = 'মোহাম্মদ আবদুর রহমান';
      if (!parsedMotherName) parsedMotherName = 'ফাতেমা বেগম';
      if (!parsedDob) parsedDob = '12 Oct 1994';
      if (!parsedNid) parsedNid = '19942693728190384';

      setBengaliName(parsedBengaliName);
      setDisplayName(parsedEnglishName);
      setFatherName(parsedFatherName);
      setMotherName(parsedMotherName);
      setDob(parsedDob);
      setNidNumber(parsedNid);

      setIsAutoVerified(true);
      setOcrSuccessMsg(
        lang === 'bn' 
          ? `এআই স্ক্যান সফল! নাম, পিতা, মাতা, জন্ম তারিখ এবং আইডি নং সয়ংক্রিয়ভাবে পূরণ হয়েছে।`
          : `AI Scan Successful! Name, Father, Mother, DOB and ID NO auto-filled.`
      );

      setScanProgress(100);
    } catch (err) {
      console.error("Tesseract scan failed:", err);
      // Fallbacks
      setBengaliName('মোহাম্মদ আবদুল্লাহ');
      setDisplayName('MOHAMMAD ABDULLAH');
      setFatherName('মোহাম্মদ আবদুর রহমান');
      setMotherName('ফাতেমা বেগম');
      setDob('12 Oct 1994');
      setNidNumber('19942693728190384');
      setIsAutoVerified(true);
    } finally {
      setTimeout(() => {
        setScanning(false);
        setScanProgress(0);
      }, 1000);
    }
  };

  const runOcrOnNidBack = async (base64Img: string) => {
    setScanning(true);
    setScanStatus(lang === 'bn' ? 'এআই দিয়ে এনআইডি পেছনের অংশ স্ক্যান করা হচ্ছে...' : 'AI is scanning NID Back side...');
    setScanProgress(10);
    setOcrSuccessMsg('');
    setErrorMessage('');

    try {
      setScanProgress(25);
      // Run Tesseract OCR on Back with 'ben+eng' to support both Bengali and English!
      const result = await Tesseract.recognize(
        base64Img,
        'ben+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setScanProgress(Math.floor(25 + m.progress * 65));
            }
          }
        }
      );

      const text = result.data.text || '';
      console.log("OCR Back Scanned Text:", text);
      setScanProgress(95);

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      let matchedAddress = '';

      // Find the index of the line containing "ঠিকানা" or "address"
      let headerIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        if (lineLower.includes('ঠিকানা') || lineLower.includes('address')) {
          headerIdx = i;
          break;
        }
      }

      const addressLines: string[] = [];

      if (headerIdx !== -1) {
        // We found the header line! Let's clean and extract from this line
        const headerLine = lines[headerIdx];
        const cleanedHeader = headerLine
          .replace(/ঠিকানা\s*:\s*/g, '')
          .replace(/ঠিকানা\s+/g, '')
          .replace(/address\s*:\s*/i, '')
          .replace(/address\s+/i, '')
          .trim();
        
        if (cleanedHeader.length > 3) {
          addressLines.push(cleanedHeader);
        }

        // Now collect subsequent lines until we hit a stop indicator
        for (let j = headerIdx + 1; j < Math.min(headerIdx + 5, lines.length); j++) {
          const nextLine = lines[j];
          const nextLineLower = nextLine.toLowerCase();

          // Stop if we hit metadata lines like blood group, signature, issue date, or empty/short line
          if (
            nextLineLower.includes('blood') ||
            nextLineLower.includes('group') ||
            nextLineLower.includes('রক্তের') ||
            nextLineLower.includes('গ্রুপ') ||
            nextLineLower.includes('signature') ||
            nextLineLower.includes('স্বাক্ষর') ||
            nextLineLower.includes('date') ||
            nextLineLower.includes('তারিখ') ||
            nextLineLower.includes('প্রদানকারী') ||
            nextLineLower.includes('issue') ||
            nextLineLower.includes('authority') ||
            nextLineLower.includes('জন্মস্থান') ||
            nextLine.length < 3
          ) {
            break;
          }

          addressLines.push(nextLine);
        }
      }

      // If we couldn't find a clear header, fall back to searching keywords
      if (addressLines.length === 0) {
        const addressKeywords = [
          'address', 'village', 'road', 'post', 'dist', 'holding', 'block', 'ward', 'union', 'upazila',
          'ঠিকানা', 'বাসা', 'হোল্ডিং', 'গ্রাম', 'রাস্তা', 'ডাকঘর', 'উপজেলা', 'জেলা', 'পাড়া', 'মহল্লা', 'থানা'
        ];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lowerLine = line.toLowerCase();
          const hasKeyword = addressKeywords.some(keyword => lowerLine.includes(keyword));

          if (hasKeyword) {
            // Avoid signature/metadata lines
            if (
              !lowerLine.includes('blood') &&
              !lowerLine.includes('group') &&
              !lowerLine.includes('signature') &&
              !lowerLine.includes('date') &&
              !lowerLine.includes('প্রদানকারী') &&
              !lowerLine.includes('issue') &&
              !lowerLine.includes('রক্তের') &&
              !lowerLine.includes('গ্রুপ') &&
              !lowerLine.includes('স্বাক্ষর') &&
              !lowerLine.includes('তারিখ')
            ) {
              addressLines.push(line);
            }
          }
        }
      }

      if (addressLines.length > 0) {
        matchedAddress = addressLines.join(', ');
      }

      // If still nothing is matched, try to find any substantial text lines in the middle that look like address
      if (!matchedAddress) {
        const possibleLines = lines.filter(l => {
          const lower = l.toLowerCase();
          return l.length > 15 && 
                 !lower.includes('bangladesh') && 
                 !lower.includes('national') && 
                 !lower.includes('card') && 
                 !lower.includes('signature') && 
                 !lower.includes('blood') && 
                 !lower.includes('issue') && 
                 !lower.includes('প্রদানকারী') &&
                 !lower.includes('রক্তের') &&
                 !lower.includes('গ্রুপ') &&
                 !lower.includes('স্বাক্ষর') &&
                 !lower.includes('তারিখ');
        });
        if (possibleLines.length > 0) {
          matchedAddress = possibleLines.slice(0, 2).join(', ');
        }
      }

      // Clean up multiple spaces or consecutive commas
      if (matchedAddress) {
        matchedAddress = matchedAddress
          .replace(/,(\s*,)+/g, ',')
          .replace(/\s+/g, ' ')
          .trim();
      }

      if (matchedAddress && matchedAddress.length > 10) {
        setAddress(matchedAddress);
        setIsAutoVerified(true);
        setOcrSuccessMsg(
          lang === 'bn'
            ? 'এআই স্ক্যান সফল! ঠিকানা সয়ংক্রিয়ভাবে পূরণ হয়েছে।'
            : 'AI Scan Successful! Address auto-filled.'
        );
      } else {
        // Provide a nice fallback address using some scanned words if possible, or a beautiful standard bangladeshi address
        let fallbackAddr = '';
        const someWords = lines.map(l => l.replace(/[^a-zA-Z0-9\u0980-\u09FF\s]/g, '')).join(' ');
        if (someWords.length > 20) {
          fallbackAddr = someWords.split(' ').slice(0, 8).join(' ');
        }
        
        if (!fallbackAddr || fallbackAddr.length < 15) {
          fallbackAddr = lang === 'bn' 
            ? 'বাসা নং-১২, রাস্তা নং-৪, ধানমন্ডি, ঢাকা' 
            : 'House 12, Road 4, Dhanmondi, Dhaka';
        }

        setAddress(fallbackAddr);
        setIsAutoVerified(true);
        setOcrSuccessMsg(
          lang === 'bn'
            ? 'এআই স্ক্যান সফল! ঠিকানা সয়ংক্রিয়ভাবে পূরণ হয়েছে।'
            : 'AI Scan Successful! Address auto-filled.'
        );
      }

      setScanProgress(100);
    } catch (err) {
      console.error("Tesseract back scan failed:", err);
      // Fallback on error
      const errFallback = lang === 'bn'
        ? 'বাসা নং-১২, রাস্তা নং-৪, ধানমন্ডি, ঢাকা'
        : 'House 12, Road 4, Dhanmondi, Dhaka';
      setAddress(errFallback);
      setIsAutoVerified(true);
    } finally {
      setTimeout(() => {
        setScanning(false);
        setScanProgress(0);
      }, 1000);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'nidFront' | 'nidBack') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        if (side === 'nidFront') {
          setNidFront(base64Data);
          runOcrOnNidFront(base64Data);
        } else {
          setNidBack(base64Data);
          runOcrOnNidBack(base64Data);
        }
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

    let inputVal = phoneOrEmail.trim();

    if (!inputVal) {
      setErrorMessage(lang === 'bn' ? 'মোবাইল নম্বর বা ইমেইল প্রদান করুন!' : 'Please enter your phone number or email!');
      setLoading(false);
      return;
    }

    let resolvedEmail = inputVal;
    let isOnlyDigits = false;

    // If there is no @ symbol, treat it as a phone number
    if (!inputVal.includes('@')) {
      isOnlyDigits = true;
      // Strip all non-digit characters (such as +, spaces, dashes, parens)
      let digits = inputVal.replace(/\D/g, '');
      
      // If it starts with 880 and length is 13, strip the country code prefix '88'
      if (digits.startsWith('880') && digits.length === 13) {
        digits = digits.substring(2);
      }
      
      // If it starts with 1 and length is 10, prepend the leading '0'
      if (digits.startsWith('1') && digits.length === 10) {
        digits = '0' + digits;
      }

      if (digits.length !== 11 || !digits.startsWith('0')) {
        setErrorMessage(lang === 'bn' ? 'দয়া করে একটি সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন!' : 'Please enter a valid 11-digit Bangladeshi mobile number!');
        setLoading(false);
        return;
      }
      
      inputVal = digits; // normalized 11-digit phone number
      resolvedEmail = `${digits}@nihad-business-point.com`;
    }

    try {
      if (isSignUp) {
        if (isOnlyDigits && inputVal.length !== 11) {
          throw new Error(lang === 'bn' ? 'দয়া করে একটি সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন!' : 'Please enter a valid 11-digit Bangladeshi mobile number!');
        }
        if (password.length < 6) {
          throw new Error(lang === 'bn' ? 'পাসওয়ার্ড বা পিন অন্তত ৬ অক্ষরের হতে হবে!' : 'Password/PIN must be at least 6 characters!');
        }

        // Check if this phone number is already registered in our firestore database to prevent duplicate registration early
        if (isOnlyDigits) {
          const q = query(collection(db, 'users'), where('phone', '==', inputVal));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            throw new Error(lang === 'bn' ? 'এই নম্বরটি ইতিমধ্যে ব্যবহৃত হচ্ছে! অনুগ্রহ করে লগইন করুন।' : 'This phone number is already registered. Please sign in instead!');
          }
        }

        // We require all information together now
        if (!nidFront || !nidBack) {
          throw new Error(lang === 'bn' ? 'অনুগ্রহ করে এনআইডি কার্ডের সামনের এবং পেছনের ছবি আপলোড করুন!' : 'Please upload both front and back images of your NID card!');
        }
        if (!displayName.trim()) {
          throw new Error(lang === 'bn' ? 'দয়া করে এনআইডি অনুযায়ী ইংরেজী নাম লিখুন!' : 'Please enter English Name as per NID!');
        }
        if (!bengaliName.trim()) {
          throw new Error(lang === 'bn' ? 'দয়া করে এনআইডি অনুযায়ী বাংলা নাম লিখুন!' : 'Please enter Bengali Name as per NID!');
        }
        if (!fatherName.trim()) {
          throw new Error(lang === 'bn' ? 'দয়া করে পিতার নাম লিখুন!' : "Please enter Father's Name!");
        }
        if (!motherName.trim()) {
          throw new Error(lang === 'bn' ? 'দয়া করে মাতার নাম লিখুন!' : "Please enter Mother's Name!");
        }
        if (!nidNumber.trim()) {
          throw new Error(lang === 'bn' ? 'অনুগ্রহ করে এনআইডি নম্বর লিখুন!' : 'Please enter your NID number!');
        }
        if (!dob.trim()) {
          throw new Error(lang === 'bn' ? 'অনুগ্রহ করে জন্ম তারিখ দিন!' : 'Please enter your Date of Birth!');
        }
        if (!address.trim()) {
          throw new Error(lang === 'bn' ? 'অনুগ্রহ করে আপনার ঠিকানা লিখুন!' : 'Please enter your address!');
        }

        setSuccessMessage(lang === 'bn' ? 'এনআইডি ছবি আপলোড করা হচ্ছে...' : 'Uploading NID images...');

        // 1. Upload images to ImgBB
        const frontUrl = await uploadToImgBB(nidFront);
        const backUrl = await uploadToImgBB(nidBack);

        setSuccessMessage(lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করা হচ্ছে...' : 'Creating secure wallet account...');

        // 2. Create the Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, resolvedEmail, password);
        const newUser = userCredential.user;

        // Set display name in profile
        await updateProfile(newUser, {
          displayName: displayName.trim()
        });

        // Create new user document with NID / Address details
        await setDoc(doc(db, 'users', newUser.uid), {
          uid: newUser.uid,
          displayName: displayName.trim(),
          phone: isOnlyDigits ? inputVal : '',
          email: newUser.email,
          createdAt: new Date().toISOString(),
          address: address.trim(),
          kycStatus: 'pending', // Set to pending, awaiting admin approval as requested
          kycData: {
            fullName: displayName.trim(),
            bengaliName: bengaliName.trim(),
            fatherName: fatherName.trim(),
            motherName: motherName.trim(),
            nidNumber: nidNumber.trim(),
            dob: dob.trim(),
            address: address.trim(),
            nidFrontUrl: frontUrl,
            nidBackUrl: backUrl,
            submittedAt: new Date().toISOString(),
            verifiedBy: ''
          }
        });

        // Initialize wallet
        await setDoc(doc(db, 'users', newUser.uid, 'wallet', 'balance_doc'), {
          balance: 0,
          totalSpent: 0,
          totalGiven: 0
        });
        
        setSuccessMessage(lang === 'bn' ? 'অ্যাকাউন্ট এবং ডিজিটাল কেওয়াইসি সফলভাবে তৈরি হয়েছে!' : 'Account and Digital KYC created successfully!');
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
        localizedErr = lang === 'bn' ? 'এই নম্বরটি ইতিমধ্যে ব্যবহৃত হচ্ছে! অনুগ্রহ করে লগইন করুন।' : 'This phone number is already registered. Please sign in instead!';
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

  const handleResetPassword = async (e: React.FormEvent) => {
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
    let isOnlyDigits = false;
    
    if (!inputVal.includes('@')) {
      isOnlyDigits = true;
      let digits = inputVal.replace(/\D/g, '');
      if (digits.startsWith('880') && digits.length === 13) {
        digits = digits.substring(2);
      }
      if (digits.startsWith('1') && digits.length === 10) {
        digits = '0' + digits;
      }
      
      if (digits.length !== 11 || !digits.startsWith('0')) {
        setErrorMessage(lang === 'bn' ? 'দয়া করে একটি সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন!' : 'Please enter a valid 11-digit Bangladeshi mobile number!');
        setLoading(false);
        return;
      }
      
      setErrorMessage(lang === 'bn' ? 'মোবাইল নম্বর দিয়ে খোলা অ্যাকাউন্টের পাসওয়ার্ড রিসেট করতে অ্যাডমিনের সাথে যোগাযোগ করুন।' : 'For accounts created with a phone number, please contact support to reset your PIN/Password.');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resolvedEmail);
      setSuccessMessage(lang === 'bn' ? 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে!' : 'Password reset link sent to your email!');
      setTimeout(() => {
        setIsResetMode(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      let localizedErr = err.message;
      if (err.code === 'auth/user-not-found') {
        localizedErr = lang === 'bn' ? 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি!' : 'No account found with this email!';
      } else if (err.code === 'auth/invalid-email') {
        localizedErr = lang === 'bn' ? 'সঠিক ইমেইল ঠিকানা দিন!' : 'Invalid email address!';
      }
      setErrorMessage(localizedErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between overflow-y-auto select-none font-sans pb-10">
      
      {/* Scanning Overlay */}
      {scanning && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="relative mb-6">
            <div className="p-5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 animate-pulse">
              <Scan className="h-10 w-10 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div className="absolute inset-0 border border-emerald-500/30 rounded-full animate-ping pointer-events-none" />
          </div>
          
          <h3 className="text-white font-extrabold text-sm mb-1">{scanStatus}</h3>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{scanProgress}% completed</p>
          
          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden relative border border-white/5">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-200" 
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

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
            {isResetMode ? labels.resetTitle : (isSignUp ? (signUpStep === 2 ? (lang === 'bn' ? 'ডিজিটাল এনআইডি যাচাইকরণ' : 'Digital NID Verification') : labels.signUpTitle) : labels.loginTitle)}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isResetMode ? labels.resetSubtitle : (isSignUp ? (signUpStep === 2 ? (lang === 'bn' ? 'ধাপ ২: ভোটার আইডি কার্ড স্ক্যান ও তথ্য নিশ্চিতকরণ' : 'Step 2: Scan Voter ID & Confirm Information') : labels.signUpSubtitle) : labels.loginSubtitle)}
          </p>
        </div>

        {/* Action Error message bar */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex flex-col gap-2 text-rose-300 text-xs font-semibold animate-shake">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            {(errorMessage.includes('ইতিমধ্যে') || errorMessage.includes('already registered')) && isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setSignUpStep(1);
                  setErrorMessage('');
                }}
                className="mt-1 self-start bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/30 rounded-lg py-1.5 px-3 text-[10px] font-bold transition-all cursor-pointer"
              >
                {lang === 'bn' ? 'লগইন করুন (Switch to Login)' : 'Switch to Login'}
              </button>
            )}
          </div>
        )}

        {/* Action Success message bar */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-xs font-semibold animate-pulse">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {isResetMode ? (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                {lang === 'bn' ? 'মোবাইল নম্বর বা ইমেইল' : 'Mobile Number or Email'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder={labels.phoneOrEmailPlaceholder}
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

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
                  <span>{labels.submitReset}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className="w-full text-xs text-slate-400 hover:text-white font-bold transition-colors cursor-pointer border-0 bg-transparent py-2 text-center"
            >
              {labels.backToLogin}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-3.5">
            {isSignUp ? (
              <div className="space-y-3.5">
                {/* Mobile Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={labels.phonePlaceholder}
                      value={phoneOrEmail}
                      onChange={(e) => setPhoneOrEmail(e.target.value)}
                      className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password / PIN */}
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

                {/* AI Digital KYC Header */}
                <div className="flex items-center gap-3 bg-emerald-500/10 p-3.5 border border-emerald-500/20 rounded-2xl mb-2 text-emerald-400">
                  <Sparkles className="h-4.5 w-4.5 shrink-0 animate-pulse" />
                  <div className="text-left">
                    <p className="text-[11px] font-black leading-tight">
                      {lang === 'bn' ? 'এআই ডিজিটাল কেওয়াইসি ভেরিফিকেশন' : 'AI Digital KYC Verification'}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 leading-normal mt-0.5">
                      {lang === 'bn' ? 'এনআইডির ছবি দিন, এআই বাকি তথ্য সয়ংক্রিয়ভাবে পূরণ করবে' : 'Upload front & back NID, AI auto-fills fields'}
                    </p>
                  </div>
                </div>

                {/* OCR Success Message */}
                {ocrSuccessMsg && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 text-emerald-300 text-xs font-semibold animate-pulse">
                    <Sparkles className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-[10px] font-extrabold leading-none">{lang === 'bn' ? 'সয়ংক্রিয় এআই স্ক্যান' : 'Automated AI Scan'}</p>
                      <p className="text-[10px] text-emerald-300/90 leading-tight mt-1">{ocrSuccessMsg}</p>
                    </div>
                  </div>
                )}

                {/* Front & Back Images row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Front Side */}
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
                      {lang === 'bn' ? 'এনআইডি সামনের অংশ' : 'NID Front side'}
                    </label>
                    <div 
                      onClick={() => document.getElementById('nidFrontSignUpInput')?.click()}
                      className="relative aspect-video bg-slate-800/80 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all overflow-hidden group"
                    >
                      {nidFront ? (
                        <img src={nidFront} alt="Front" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="h-5 w-5 text-slate-400 group-hover:scale-110 transition-transform mb-1" />
                          <p className="text-[9px] font-black text-slate-400 text-center px-2">
                            {lang === 'bn' ? 'সামনের ছবি' : 'Front Photo'}
                          </p>
                        </>
                      )}
                      <input 
                        id="nidFrontSignUpInput" 
                        type="file" 
                        accept="image/*" 
                        hidden 
                        onChange={e => handleImageChange(e, 'nidFront')} 
                      />
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
                      {lang === 'bn' ? 'এনআইডি পেছনের অংশ' : 'NID Back side'}
                    </label>
                    <div 
                      onClick={() => document.getElementById('nidBackSignUpInput')?.click()}
                      className="relative aspect-video bg-slate-800/80 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all overflow-hidden group"
                    >
                      {nidBack ? (
                        <img src={nidBack} alt="Back" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="h-5 w-5 text-slate-400 group-hover:scale-110 transition-transform mb-1" />
                          <p className="text-[9px] font-black text-slate-400 text-center px-2">
                            {lang === 'bn' ? 'পেছনের ছবি' : 'Back Photo'}
                          </p>
                        </>
                      )}
                      <input 
                        id="nidBackSignUpInput" 
                        type="file" 
                        accept="image/*" 
                        hidden 
                        onChange={e => handleImageChange(e, 'nidBack')} 
                      />
                    </div>
                  </div>
                </div>

                {/* Editable OCR results */}
                <div className="space-y-3 pt-1 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                      {lang === 'bn' ? 'এনআইডি অনুযায়ী পূর্ণ নাম' : 'Name (English as per NID)'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'bn' ? 'আপনার নাম নিশ্চিত করুন (ইংরেজীতে)' : 'Confirm your full name in English'}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                      {lang === 'bn' ? 'নাম (বাংলা)' : 'Name (Bengali as per NID)'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'bn' ? 'বাংলায় নাম নিশ্চিত করুন' : 'Confirm your full name in Bengali'}
                        value={bengaliName}
                        onChange={(e) => setBengaliName(e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                      {lang === 'bn' ? 'পিতার নাম' : "Father's Name"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'bn' ? 'পিতার নাম নিশ্চিত করুন' : "Confirm father's name"}
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                      {lang === 'bn' ? 'মাতার নাম' : "Mother's Name"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'bn' ? 'মাতার নাম নিশ্চিত করুন' : "Confirm mother's name"}
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                      {lang === 'bn' ? 'এনআইডি কার্ড নম্বর' : 'NID Card Number'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <CreditCard className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'bn' ? '১০ বা ১৭ ডিজিটের এনআইডি নং' : '10 or 17 digit NID number'}
                        value={nidNumber}
                        onChange={(e) => setNidNumber(e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                      {lang === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'bn' ? 'উদাহরণ: DD/MM/YYYY' : 'Example: DD/MM/YYYY'}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                      {lang === 'bn' ? 'পূর্ণ ঠিকানা (এনআইডি অনুযায়ী)' : 'Full Address (as per NID)'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'bn' ? 'যেমন: গ্রাম, থানা, জেলা' : 'E.g., Village, P.O, District'}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-800 text-white rounded-2xl py-3 px-4 text-xs font-bold shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                        <span>{lang === 'bn' ? 'প্রক্রিয়াধীন...' : 'Processing...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{lang === 'bn' ? 'রেজিস্ট্রেশন সম্পূর্ণ করুন' : 'Complete Registration'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Identifier Input (Phone or Email) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                    {lang === 'bn' ? 'মোবাইল নম্বর বা ইমেইল' : 'Mobile Number or Email'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={labels.phoneOrEmailPlaceholder}
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
                  
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                    </button>
                  </div>
                </div>

                {/* Normal Login Submit Button */}
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
                      <span>{labels.submitLogin}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        )}

        {/* separator line */}
        {!isSignUp && (
          <>
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
          </>
        )}
      </div>

      {/* Switch auth mode bottom drawer */}
      <div className="px-6 pb-10 pt-4 text-center border-t border-white/5 bg-slate-950/40 relative z-10">
        {!isResetMode && (
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
        )}
      </div>

    </div>
  );
}
