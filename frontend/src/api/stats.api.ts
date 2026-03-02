import { apiClient } from "@/api/client";

export function getTotalBalance(): Promise<number> {
  return apiClient.get("/stats/total-balance");
}
