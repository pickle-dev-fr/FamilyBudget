import { apiClient } from "@/api/client";

export type Pot = {
  id: string;
  name: string;
  icon?: string;
  account_id: string;
  position: number;
};

export type CreatePotPayload = {
  name: string;
  icon?: string;
};

export type UpdatePotPayload = {
  name: string;
  icon?: string;
};

export type ReorderSubPotPayload = {
    id: string;
};

export type ReorderPotPayload = {
    id: string;
    sub_pots: ReorderSubPotPayload[];
};

export type ReorderPotsPayload = {
    account_id: string
    ordered_ids: string[]
}

export function getPotsByAccount(accountId: string) {
  return apiClient.get(`/accounts/${accountId}/pots`);
}

export function getPotsAndSubPotsByAccount(accountId: string, year?: number, month?: number) {
  const params = new URLSearchParams({ include: "true" });
  if (year !== undefined && month !== undefined) {
    params.set("year", String(year));
    params.set("month", String(month));
  }
  return apiClient.get(`/accounts/${accountId}/pots?${params.toString()}`);
}

export function createPot(accountId: string, payload: CreatePotPayload) {
  return apiClient.post(`/accounts/${accountId}/pots`, payload);
}

export function updatePot(potId: string, payload: UpdatePotPayload) {
  return apiClient.put(`/pots/${potId}`, payload);
}

export function deletePot(potId: string) {
  return apiClient.delete(`/pots/${potId}`);
}

export function getDefaultPot(accountId: string) {
    return apiClient.get("/pot/defaut", {
        account_id: accountId,
    });
}

export function reorderPots(payload: ReorderPotsPayload) {
    return apiClient.put("/pots/reorder", payload)
}
