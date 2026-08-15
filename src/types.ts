export type Operator = 'GP' | 'Robi' | 'Airtel' | 'Teletalk' | 'Banglalink';

export interface OperatorDetails {
  id: Operator;
  name: string;
  nameBn: string;
  color: string;
  textColor: string;
  gradient: string;
  prefixes: string[];
  logoUrl?: string;
}

export type ConnectionType = 'Prepaid' | 'Postpaid' | 'Skitto';

export interface RechargePackage {
  id: string;
  title: string;
  titleBn: string;
  operator: Operator;
  price: number;
  validity: string;
  validityBn: string;
  category: 'internet' | 'talktime' | 'bundle';
  volume: string;
  volumeBn: string;
  description: string;
  descriptionBn: string;
  isPopular?: boolean;
  imageUrl?: string;
  regularPrice?: number;
  discount?: number;
}

export interface Transaction {
  id: string;
  type: 'Recharge' | 'Bill' | 'CashIn' | 'Transfer' | 'Voucher' | 'ScratchCard' | 'Fine';
  operator?: Operator;
  targetNumber?: string;
  senderNumber?: string;
  amount: number;
  billerName?: string;
  billerNameBn?: string;
  date: string;
  txId: string;
  status: 'Success' | 'Pending' | 'Failed' | 'Approved' | 'Rejected';
  userId?: string;
  userEmail?: string;
  userName?: string;
  rejectionReason?: string;
  transferMethod?: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'NIHAD BUSINESS POINT Wallet (User)' | 'Received from User';
  voucherItem?: string;
  voucherCode?: string;
  details?: string;
  voucherCategory?: 'Gaming' | 'OTT';
  note?: string;
}

export interface FavoriteContact {
  id: string;
  name: string;
  number: string;
  operator: Operator;
  color: string; // Tailwind bg color class
}

export interface BillProvider {
  id: string;
  name: string;
  nameBn: string;
  category: 'Electricity' | 'Water' | 'Gas' | 'Internet' | 'Education';
  categoryBn: string;
  logoColor: string;
  imageUrl?: string;
}

export interface PromoBanner {
  id: string;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  operator: Operator;
  prefillAmount: number;
  gradient: string;
  imageUrl?: string;
}

export type AppTab = 'home' | 'packages' | 'history' | 'profile' | 'store';

export type Language = 'bn' | 'en';

export interface StoreProduct {
  id: string;
  title: string;
  titleBn: string;
  price: number;
  stock: number;
  description: string;
  descriptionBn: string;
  imageUrl?: string;
  category: string;
  categoryBn: string;
}

export interface StoreOrder {
  id: string;
  productId: string;
  productTitle: string;
  productTitleBn: string;
  price: number;
  quantity: number;
  totalPrice: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  deliveryAddress?: string;
  note?: string;
  rejectionReason?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  kycStatus?: 'not_verified' | 'pending' | 'verified' | 'rejected';
  kycData?: {
    nidNumber: string;
    fullName: string;
    dob: string;
    nidFrontUrl: string;
    nidBackUrl: string;
    submittedAt: string;
    verifiedAt?: string;
    rejectionReason?: string;
  };
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  dueAmount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  dueAmount: number;
  creditLimit: number;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
}

export interface IncomeRecord {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  salary: number;
  joinDate: string;
  status: 'Active' | 'On Leave' | 'Terminated';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'Present' | 'Absent' | 'Late';
}

export interface POSCartItem {
  product: StoreProduct;
  quantity: number;
  discount: number;
}

export interface PhoneListing {
  id: string;
  title: string;
  brand: string;
  model: string;
  ram: string;
  rom: string;
  batteryHealth: string;
  camera: string;
  processor: string;
  display: string;
  sim: string;
  purchaseDate: string;
  usageDuration: string;
  condition: 'Mint / Like New' | 'Good (Minor Marks)' | 'Fair / Has Scratches' | 'Needs Screen Repair';
  listingType: 'Sell' | 'Exchange' | 'Both';
  expectedPrice: number;
  swapTarget?: string;
  cashTopup?: string;
  reasonForSelling: string;
  includedAccessories: string[];
  images: string[];
  sellerName: string;
  sellerPhone: string;
  sellerWhatsapp: string;
  sellerLocation: string;
  sellerEmail: string;
  createdAt: string;
  status: 'Active' | 'Sold' | 'Exchanged';
  isVerifiedSeller?: boolean;
  aiPriceRating?: string;
  userId?: string;
}

