import { apiClient } from "@/api/client";

export type SousPot = {
  id: string;
  name: string;
  prevision: number;
  current: number;
  pot_id: string;
};

export type CreateSousPotPayload = {
  name: string;
  prevision: number;
};

export type UpdateSousPotPayload = {
  name: string;
  prevision: number;
};

export type DefaultSousPot = {
    id: string;
    pot_id: string;
};

export function getSousPotsByPot(potId: string) {
  return apiClient.get(`/pots/${potId}/sous-pots`);
}

export function createSousPot(potId: string, payload: CreateSousPotPayload) {
  return apiClient.post(`/pots/${potId}/sous-pots`, payload);
}

export function updateSousPot(
  sousPotId: string,
  payload: UpdateSousPotPayload
) {
  return apiClient.put(`/sous-pots/${sousPotId}`, payload);
}

export function deleteSousPot(sousPotId: string) {
  return apiClient.delete(`/sous-pots/${sousPotId}`);
}

export function reorderSousPots(
    potId: string,
    orderedIds: string[]
) {
    return apiClient.put(
        `/pots/${potId}/sous-pots/reorder`,
        { ordered_ids: orderedIds }
    );
}