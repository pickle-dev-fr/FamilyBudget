import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import ProtectedRoute from "@/auth/ProtectedRoute";

import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";

import AppLayout from "@/components/layout/AppLayout";
import HomePage from "@/features/accueil/HomePage";
import ComptesPage from "@/features/comptes/ComptesPage";
import PotsPage from "@/features/pots/PotsPage";
import TransactionsPage from "@/features/transactions/TransactionsPage";

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
          <Route path="/accounts" element={<ComptesPage />} />
          <Route path="/pots" element={<PotsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
