import { apiClient } from "@/api/client";

export type Compte = {
  id: string;
  name: string;
  start_day: number;
  initial_value: number;
};

export type CreateComptePayload = {
  name: string;
  initial_value: number;
  start_day: number;
};

export type UpdateComptePayload = {
  name: string;
  initial_value: number;
  start_day: number;
};

export function getComptes() {
  return apiClient.get("/comptes");
}

export function getComptesBalance(compteId: string) {
  return apiClient.get(`/comptes/${compteId}/solde`);
}

export async function createCompte(payload: CreateComptePayload) {
  return apiClient.post("/comptes", payload);
}

export function updateCompte(
  compteId: string,
  payload: UpdateComptePayload
) {
  return apiClient.put(`/comptes/${compteId}`, payload);
}