import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getAccounts } from "@/api/accounts.api";
import { useAuth } from "@/auth/AuthContext";

type AccountContextType = {
    hasAccounts: boolean;
    loadingAccounts: boolean;
    refreshAccounts: () => Promise<void>;
};

const AccountContext = createContext<AccountContextType | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
    const { authenticated } = useAuth();
    const [hasAccounts, setHasAccounts] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(true);

    const refreshAccounts = useCallback(async () => {
        if (!authenticated) {
            setHasAccounts(false);
            // Ne pas mettre loadingAccounts à false ici : RequiresAccount rendrait
            // avec hasAccounts=false avant que l'auth ait le temps de résoudre
            return;
        }
        setLoadingAccounts(true);
        try {
            const accounts = await getAccounts();
            setHasAccounts(accounts.length > 0);
        } catch {
            setHasAccounts(false);
        } finally {
            setLoadingAccounts(false);
        }
    }, [authenticated]);

    useEffect(() => {
        refreshAccounts();
    }, [refreshAccounts]);

    return (
        <AccountContext.Provider value={{ hasAccounts, loadingAccounts, refreshAccounts }}>
            {children}
        </AccountContext.Provider>
    );
}

export function useAccount() {
    const ctx = useContext(AccountContext);
    if (!ctx) {
        throw new Error("useAccount must be used inside AccountProvider");
    }
    return ctx;
}
