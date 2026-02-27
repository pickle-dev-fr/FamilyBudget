import { apiClient } from "@/api/client";

export function getPeriode(compteId: string) {
    return apiClient.get(`/utils/${compteId}/periode`)
}
