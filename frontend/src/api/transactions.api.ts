import { apiClient } from "@/api/client";
import { formatDate } from '@/utils';

export type Transaction = {
  id: string;
  transaction_date: string;
  transaction_type: "DEBIT" | "CREDIT";
  motif: string;
  amount: number;
};

export type CreateTransactionPayload = {
  id: string;
  transaction_date: string;
  transaction_type: "DEBIT" | "CREDIT";
  motif: string;
  amount: number;
  compte_id?: string,
  sous_pot_id?: string,
  recurrent?: boolean,
  recurrence_type?: string,
  recurrence_end_date?: string
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

export async function createTransaction(payload: CreateTransactionPayload) {
  return apiClient.post("/transactions", payload);
}

export function getTransactionsMois(compte_id: string, date: string) {
  return apiClient.get(`/compte/${compte_id}/transactions/`, {date});
}

export function deleteTransaction(id: string) {
  return apiClient.delete(`/transactions/${id}`);
}
