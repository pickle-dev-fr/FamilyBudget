import { apiClient } from "@/api/client";

export type Compte = {
  id: string;
  name: string;
};

export function getComptes() {
  return apiClient.get("/comptes");
}

export function getComptesBalance(compteId: string) {
  return apiClient.get(`/comptes/${compteId}/solde`);
}