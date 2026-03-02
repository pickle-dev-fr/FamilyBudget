import { apiClient } from "@/api/client";
import { formatDate } from '@/utils';

export type Transaction = UpdateTransactionPayload & {
  id: string
};

export type CreateTransactionPayload = {
  transaction_date: string;
  transaction_type: "DEBIT" | "CREDIT";
  motif: string;
  amount: number;
  account_id?: string | null,
  sub_pot_id?: string | null,
  recurrent?: boolean,
  recurrence_type?: string | null,
  recurrence_end_date?: string | null
};

export type CreateTransferPayload = {
    account_source_id: string
    account_destination_id: string
    sub_pot_id: string
    amount: number
    motif?: string
    transaction_date?: string
    recurrent: boolean
    recurrence_type?: string | null
    recurrence_end_date?: string | null
}

export type UpdateTransactionPayload = CreateTransactionPayload


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

export function createTransfer(payload: CreateTransferPayload) {
    return apiClient.post("/transfers", payload)
}

export async function updateTransaction(id: string, payload: UpdateTransactionPayload) {
  return apiClient.put(`/transactions/${id}`, payload);
}

export function getTransactionsMois(account_id: string, payload: {date_month: number, date_year: number}) {
  return apiClient.get(`/account/${account_id}/transactions`, payload);
}

export function getTransactionsRecurrente(account_id: string) {
  return apiClient.get(`/account/${account_id}/transactions/recurrente`);
}

export function deleteTransaction(id: string) {
  return apiClient.delete(`/transactions/${id}`);
}

export function deleteTransactionRecurrence(id: string) {
  return apiClient.delete(`/transactions/${id}/recurrence`);
}
