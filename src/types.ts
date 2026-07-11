export type Operator = 'GP' | 'Robi' | 'Airtel' | 'Teletalk' | 'Banglalink';

export interface OperatorDetails {
  id: Operator;
  name: string;
  nameBn: string;
  color: string;
  textColor: string;
  gradient: string;
  prefixes: string[];
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
}

export interface Transaction {
  id: string;
  type: 'Recharge' | 'Bill' | 'CashIn' | 'Transfer' | 'Voucher';
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
  transferMethod?: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Nihad Wallet (User)' | 'Received from User';
  voucherItem?: string;
  voucherCode?: string;
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

export type AppTab = 'home' | 'packages' | 'history' | 'profile';

export type Language = 'bn' | 'en';
