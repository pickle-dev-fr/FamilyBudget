import { apiClient } from "@/api/client";

export type BalancePoint = { year: number; month: number; balance: number };
export type MonthlySummaryPoint = { year: number; month: number; income: number; expenses: number; delta: number };
export type PotAmount = { pot: string; amount: number };
export type SubPotAmount = { pot: string; sub_pot: string; amount: number };
export type HeatmapPoint = { date: string; amount: number; count: number };

export function getTotalBalance(): Promise<number> {
  return apiClient.get("/stats/total-balance");
}

export function getBalanceHistory(accountId: string): Promise<BalancePoint[]> {
  return apiClient.get(`/stats/accounts/${accountId}/balance-history`);
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

export function getHeatmap(accountId: string, year: number): Promise<HeatmapPoint[]> {
  return apiClient.get(`/stats/accounts/${accountId}/heatmap?year=${year}`);
}
