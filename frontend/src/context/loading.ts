import { createContext, useContext } from "react";

export type LoadingContextType = {
  loading: boolean;
  setLoading: (v: boolean) => void;
};

export const LoadingContext = createContext<LoadingContextType | null>(null);

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used inside LoadingProvider");
  return ctx;
}
