import { Navigate } from "react-router-dom";
import { useAccount } from "@/auth/AccountContext";
import type { ReactNode } from "react";

export default function RequiresAccount({ children }: { children: ReactNode }) {
    const { hasAccounts, loadingAccounts } = useAccount();

    if (loadingAccounts) return null;

    if (!hasAccounts) {
        return <Navigate to="/accounts" replace />;
    }

    return children;
}
