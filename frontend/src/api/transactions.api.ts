import { apiClient } from "@/api/client";
import { formatDate } from '@/utils';

export type Transaction = {
  id: string;
  date: string;
  label: string;
  amount: number;
  account_name: string;
};

export function getTodayTransactions() {
  const today = formatDate(new Date());
  return apiClient.get(`/transactions?date=${today}`);
}

export function getTomorrowTransactions() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatted = formatDate(tomorrow);
  return apiClient.get(`/transactions?date=${formatted}`);
}
