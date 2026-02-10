import { apiClient } from "@/api/client";

export type Pot = {
  id: string;
  name: string;
  icon?: string;
  compte_id: string;
};

export type CreatePotPayload = {
  name: string;
  icon?: string;
};

export type UpdatePotPayload = {
  name: string;
  icon?: string;
};

export function getPotsByCompte(compteId: string) {
  return apiClient.get(`/comptes/${compteId}/pots`);
}

export function createPot(compteId: string, payload: CreatePotPayload) {
  return apiClient.post(`/comptes/${compteId}/pots`, payload);
}

export function updatePot(potId: string, payload: UpdatePotPayload) {
  return apiClient.put(`/pots/${potId}`, payload);
}

export function deletePot(potId: string) {
  return apiClient.delete(`/pots/${potId}`);
}

export function getDefaultPot(compteId: string) {
    return apiClient.get("/pot/defaut", {
        compte_id: compteId,
    });
}
export function reorderPots(
    compteId: string,
    orderedIds: string[]
) {
    return apiClient.put(
        `/comptes/${compteId}/pots/reorder`,
        { ordered_ids: orderedIds }
    );
}
