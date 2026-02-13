import { apiClient } from "@/api/client";

export type SousPot = {
  id: string;
  name: string;
  prevision: number;
  current: number;
  pot_id: string;
  position: number;
};

export type CreateSousPotPayload = {
  name: string;
  prevision: number;
};

export type UpdateSousPotPayload = {
  name: string;
  prevision: number;
};

export type ReorderSousPotsPayload = {
    ancien_pot: {
        pot_id: string
        sous_pot_ids?: string[]
    }
    nouveau_pot: {
        pot_id: string
        sous_pot_ids: string[]
    }
}

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

export function reorderSousPots(compte_id: string, payload: ReorderSousPotsPayload) {
    return apiClient.put(`/comptes/${compte_id}/sous-pots/reorder`, payload)
}
