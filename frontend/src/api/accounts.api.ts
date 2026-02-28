import { apiClient } from "@/api/client";

export type Account = {
  id: string;
  name: string;
  start_day: number;
  initial_value: number;
  decallage: number;
};

export type CreateAccountPayload = {
  name: string;
  initial_value: number;
  start_day: number;
  decallage: number;
};

export type UpdateAccountPayload = {
  name: string;
  initial_value: number;
  start_day: number;
  decallage: number;
};

export function getAccounts() {
  return apiClient.get("/accounts");
}

export function getAccountsBalance(accountId: string) {
  return apiClient.get(`/accounts/${accountId}/balance`);
}

export async function createAccount(payload: CreateAccountPayload) {
  return apiClient.post("/accounts", payload);
}

export function updateAccount(
  accountId: string,
  payload: UpdateAccountPayload
) {
  return apiClient.put(`/accounts/${accountId}`, payload);
}

export function reorderAccounts(orderedIds: string[]) {
    return apiClient.put("/accounts/reorder", {
        ordered_ids: orderedIds
    });
}

export function deleteAccount(id: string) {
  return apiClient.delete(`/accounts/${id}`);
}