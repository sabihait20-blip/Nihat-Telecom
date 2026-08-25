import { Transaction } from '../types';

export const DAILY_TRANSFER_LIMIT = 30000; // ৳30,000 (৩০ হাজার টাকা)
export const MONTHLY_TRANSFER_LIMIT = 300000; // ৳3,00,000 (৩ লাখ টাকা)

export interface UserTransferLimitStats {
  dailyLimit: number;
  monthlyLimit: number;
  dailySpent: number;
  monthlySpent: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  dailyPercentage: number;
  monthlyPercentage: number;
  todayCount: number;
  monthCount: number;
  isDailyLimitExceeded: boolean;
  isMonthlyLimitExceeded: boolean;
}

/**
 * Calculates a user's daily and monthly transfer usage and remaining limits from their transactions list.
 */
export function calculateTransferLimitStats(
  transactions: Transaction[] = [],
  referenceDate: Date = new Date()
): UserTransferLimitStats {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0 - 11
  const currentDate = referenceDate.getDate();

  let dailySpent = 0;
  let monthlySpent = 0;
  let todayCount = 0;
  let monthCount = 0;

  (transactions || []).forEach((tx) => {
    // Only count outgoing transfers (debits/sends)
    if (tx.type !== 'Transfer') return;
    
    // Ignore rejected or failed transactions
    if (tx.status === 'Rejected' || tx.status === 'Failed') return;

    const amount = Number(tx.amount) || 0;
    if (amount <= 0) return;

    // Parse date safely
    let txDate: Date | null = null;
    if (tx.date) {
      const normalizedDateStr = tx.date.replace(' ', 'T');
      const parsed = new Date(normalizedDateStr);
      if (!isNaN(parsed.getTime())) {
        txDate = parsed;
      }
    }

    if (!txDate) return;

    const isSameYear = txDate.getFullYear() === currentYear;
    const isSameMonth = isSameYear && txDate.getMonth() === currentMonth;
    const isSameDay = isSameMonth && txDate.getDate() === currentDate;

    if (isSameMonth) {
      monthlySpent += amount;
      monthCount += 1;
    }

    if (isSameDay) {
      dailySpent += amount;
      todayCount += 1;
    }
  });

  const dailyRemaining = Math.max(0, DAILY_TRANSFER_LIMIT - dailySpent);
  const monthlyRemaining = Math.max(0, MONTHLY_TRANSFER_LIMIT - monthlySpent);
  const dailyPercentage = Math.min(100, Math.round((dailySpent / DAILY_TRANSFER_LIMIT) * 100));
  const monthlyPercentage = Math.min(100, Math.round((monthlySpent / MONTHLY_TRANSFER_LIMIT) * 100));

  return {
    dailyLimit: DAILY_TRANSFER_LIMIT,
    monthlyLimit: MONTHLY_TRANSFER_LIMIT,
    dailySpent,
    monthlySpent,
    dailyRemaining,
    monthlyRemaining,
    dailyPercentage,
    monthlyPercentage,
    todayCount,
    monthCount,
    isDailyLimitExceeded: dailySpent >= DAILY_TRANSFER_LIMIT,
    isMonthlyLimitExceeded: monthlySpent >= MONTHLY_TRANSFER_LIMIT,
  };
}

/**
 * Validates whether an outgoing transfer amount is allowed based on current daily and monthly usage.
 */
export function validateTransferLimit(
  amount: number,
  stats: UserTransferLimitStats,
  lang: 'bn' | 'en' = 'bn'
): { allowed: boolean; errorMessage?: string } {
  if (amount <= 0 || isNaN(amount)) {
    return {
      allowed: false,
      errorMessage: lang === 'bn' ? 'সঠিক টাকার পরিমাণ লিখুন।' : 'Please enter a valid amount.'
    };
  }

  if (stats.dailySpent + amount > stats.dailyLimit) {
    const remaining = stats.dailyRemaining;
    return {
      allowed: false,
      errorMessage: lang === 'bn'
        ? `আজকের দৈনিক ট্রান্সফার লিমিট ৩০,০০০ টাকা অতিক্রম করবে! আজ আর সর্বোচ্চ ৳${remaining.toLocaleString()} টাকা ট্রান্সফার করা যাবে। (আজ ব্যবহৃত: ৳${stats.dailySpent.toLocaleString()})`
        : `Daily transfer limit of ৳${stats.dailyLimit.toLocaleString()} exceeded! You can only transfer up to ৳${remaining.toLocaleString()} today. (Spent today: ৳${stats.dailySpent.toLocaleString()})`
    };
  }

  if (stats.monthlySpent + amount > stats.monthlyLimit) {
    const remaining = stats.monthlyRemaining;
    return {
      allowed: false,
      errorMessage: lang === 'bn'
        ? `চলতি মাসের ট্রান্সফার লিমিট ৩,০০,০০০ টাকা (৩ লাখ) অতিক্রম করবে! এই মাসে আর সর্বোচ্চ ৳${remaining.toLocaleString()} টাকা ট্রান্সফার করা যাবে। (মাসে ব্যবহৃত: ৳${stats.monthlySpent.toLocaleString()})`
        : `Monthly transfer limit of ৳${stats.monthlyLimit.toLocaleString()} exceeded! You can only transfer up to ৳${remaining.toLocaleString()} this month. (Spent this month: ৳${stats.monthlySpent.toLocaleString()})`
    };
  }

  return { allowed: true };
}
