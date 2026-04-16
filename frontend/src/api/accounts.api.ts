import { apiClient } from "@/api/client";

export type AccountType = "NORMAL" | "SAVINGS" | "INVESTMENT";
export type AssetType = "STOCK" | "ETF" | "CRYPTO";
export type InterestFrequency = "DAILY" | "MONTHLY" | "ANNUAL";

export type InvestmentAsset = {
  id: string;
  ticker: string;
  name: string;
  asset_type: AssetType;
  quantity: number;
  current_price: number;
  last_price_update: string | null;
  account_id: string;
};

export type Account = {
  id: string;
  name: string;
  start_day: number;
  initial_value: number;
  decallage: number;
  account_type: AccountType;
  savings_goal: number | null;
  interest_rate: number | null;
  interest_frequency: InterestFrequency | null;
  assets: InvestmentAsset[];
};

export type CreateAccountPayload = {
  name: string;
  initial_value: number;
  start_day: number;
  decallage: number;
  account_type: AccountType;
  savings_goal?: number | null;
  interest_rate?: number | null;
  interest_frequency?: InterestFrequency | null;
};

export type UpdateAccountPayload = {
  name?: string;
  initial_value?: number;
  start_day?: number;
  decallage?: number;
  savings_goal?: number | null;
  interest_rate?: number | null;
  interest_frequency?: InterestFrequency | null;
};

export function getAccounts() {
  return apiClient.get("/accounts");
}

export function getAccount(accountId: string) {
  return apiClient.get(`/accounts/${accountId}`);
}

export function getAccountsBalance(accountId: string) {
  return apiClient.get(`/accounts/${accountId}/balance`);
}

export async function createAccount(payload: CreateAccountPayload) {
  return apiClient.post("/accounts", payload);
}

export function updateAccount(accountId: string, payload: UpdateAccountPayload) {
  return apiClient.put(`/accounts/${accountId}`, payload);
}

export function reorderAccounts(orderedIds: string[]) {
  return apiClient.put("/accounts/reorder", { ordered_ids: orderedIds });
}

export function deleteAccount(id: string) {
  return apiClient.delete(`/accounts/${id}`);
}

export type TickerSearchResult = {
  ticker: string;
  name: string;
  asset_type: AssetType;
};

export function searchTickers(q: string): Promise<TickerSearchResult[]> {
  return apiClient.get(`/investment/search?q=${encodeURIComponent(q)}`);
}

export function listAssets(accountId: string) {
  return apiClient.get(`/accounts/${accountId}/assets`);
}

export function createAsset(accountId: string, payload: Omit<InvestmentAsset, "id" | "current_price" | "last_price_update" | "account_id">) {
  return apiClient.post(`/accounts/${accountId}/assets`, payload);
}

export function updateAsset(accountId: string, assetId: string, payload: Partial<Pick<InvestmentAsset, "ticker" | "name" | "asset_type" | "quantity">>) {
  return apiClient.put(`/accounts/${accountId}/assets/${assetId}`, payload);
}

export function deleteAsset(accountId: string, assetId: string) {
  return apiClient.delete(`/accounts/${accountId}/assets/${assetId}`);
}

export function refreshAssetPrices(accountId: string) {
  return apiClient.post(`/accounts/${accountId}/assets/refresh`, {});
}
