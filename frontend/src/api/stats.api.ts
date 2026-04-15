import { apiClient } from "@/api/client";

export type BalancePoint = { year: number; month: number; balance: number };
export type DailyBalancePoint = { date: string; balance: number; is_future: boolean };
export type MonthlySummaryPoint = { year: number; month: number; income: number; expenses: number; delta: number };
export type PotAmount = { pot: string; amount: number };
export type SubPotAmount = { pot: string; sub_pot: string; amount: number };
export type HeatmapPoint = { date: string; amount: number; count: number };
export type TransactionStat = {
  date: string;
  amount: number;
  motif: string | null;
  sub_pot: string;
  pot: string;
  transaction_type: string;
  is_planned: boolean;
};

export function getTotalBalance(): Promise<number> {
  return apiClient.get("/stats/total-balance");
}

export function getBalanceHistory(accountId: string): Promise<BalancePoint[]> {
  return apiClient.get(`/stats/accounts/${accountId}/balance-history`);
}

export function getDailyBalance(accountId: string, year: number, month: number): Promise<DailyBalancePoint[]> {
  return apiClient.get(`/stats/accounts/${accountId}/daily-balance?year=${year}&month=${month}`);
}

export function getMonthlySummary(accountId: string): Promise<MonthlySummaryPoint[]> {
  return apiClient.get(`/stats/accounts/${accountId}/monthly`);
}

export function getByPot(accountId: string, year: number, month: number): Promise<PotAmount[]> {
  return apiClient.get(`/stats/accounts/${accountId}/by-pot?year=${year}&month=${month}`);
}

export function getBySubPot(accountId: string, year: number, month: number): Promise<SubPotAmount[]> {
  return apiClient.get(`/stats/accounts/${accountId}/by-subpot?year=${year}&month=${month}`);
}

export function getTopTransactions(accountId: string, year: number, month: number): Promise<TransactionStat[]> {
  return apiClient.get(`/stats/accounts/${accountId}/top-transactions?year=${year}&month=${month}`);
}

export function getHeatmap(accountId: string, year: number): Promise<HeatmapPoint[]> {
  return apiClient.get(`/stats/accounts/${accountId}/heatmap?year=${year}`);
}
