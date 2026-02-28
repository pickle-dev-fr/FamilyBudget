import { apiClient } from "@/api/client";

export function getPeriode(accountId: string) {
    return apiClient.get(`/utils/${accountId}/period`)
}
