import { apiClient } from "@/api/client";

export type SubPot = {
  id: string;
  name: string;
  prevision: number;
  current: number;
  pot_id: string;
  position: number;
};

export type CreateSubPotPayload = {
  name: string;
  prevision: number;
};

export type UpdateSubPotPayload = {
  name: string;
  prevision: number;
};

export type ReorderSubPotsPayload = {
    ancien_pot: {
        pot_id: string
        sub_pot_ids?: string[]
    }
    nouveau_pot: {
        pot_id: string
        sub_pot_ids: string[]
    }
}

export function getSubPotsByPot(potId: string) {
  return apiClient.get(`/pots/${potId}/sub-pots`);
}

export function createSubPot(potId: string, payload: CreateSubPotPayload) {
  return apiClient.post(`/pots/${potId}/sub-pots`, payload);
}

export function updateSubPot(
  subPotId: string,
  payload: UpdateSubPotPayload
) {
  return apiClient.put(`/sub-pots/${subPotId}`, payload);
}

export function deleteSubPot(subPotId: string) {
  return apiClient.delete(`/sub-pots/${subPotId}`);
}

export function reorderSubPots(account_id: string, payload: ReorderSubPotsPayload) {
    return apiClient.put(`/accounts/${account_id}/sub-pots/reorder`, payload)
}
