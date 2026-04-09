import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { AccountProvider } from "@/auth/AccountContext";
import ProtectedRoute from "@/auth/ProtectedRoute";
import RequiresAccount from "@/auth/RequiresAccount";

import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";

import AppLayout from "@/components/layout/AppLayout";
import HomePage from "@/features/home/HomePage";
import AccountsPage from "@/features/accounts/AccountsPage";
import PotsPage from "@/features/pots/PotsPage";
import TransactionsPage from "@/features/transactions/TransactionsPage";
import RecurringPage from "@/features/recurrents/RecurrentsPage";
import SettingsPage from "@/features/settings/SettingsPage";

export default function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Requires at least one account */}
            <Route path="/pots" element={<RequiresAccount><PotsPage /></RequiresAccount>} />
            <Route path="/transactions" element={<RequiresAccount><TransactionsPage /></RequiresAccount>} />
            <Route path="/recurring" element={<RequiresAccount><RecurringPage /></RequiresAccount>} />
          </Route>
        </Routes>
      </AccountProvider>
    </AuthProvider>
  );
}
