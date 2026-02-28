import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import ProtectedRoute from "@/auth/ProtectedRoute";

import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";

import AppLayout from "@/components/layout/AppLayout";
import HomePage from "@/features/home/HomePage";
import AccountsPage from "@/features/accounts/AccountsPage";
import PotsPage from "@/features/pots/PotsPage";
import TransactionsPage from "@/features/transactions/TransactionsPage";
import RecurringPage from "@/features/recurrents/RecurrentsPage";

export default function App() {
  return (
    <AuthProvider>
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
          <Route path="/pots" element={<PotsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
