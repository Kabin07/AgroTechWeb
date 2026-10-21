import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "./i18n";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import ChatAssistant from "./components/ChatAssistant";
import LanguagePicker from "./components/LanguagePicker";
import { RequireAuth } from "./components/common";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import PricesPage from "./pages/PricesPage";
import FarmerPage from "./pages/FarmerPage";
import BuyerPage from "./pages/BuyerPage";
import TransportPage from "./pages/TransportPage";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <Router>
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/prices" element={<PricesPage />} />
                  <Route path="/farmer" element={<RequireAuth><FarmerPage /></RequireAuth>} />
                  <Route path="/buyer" element={<RequireAuth><BuyerPage /></RequireAuth>} />
                  <Route path="/transport" element={<RequireAuth><TransportPage /></RequireAuth>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <ChatAssistant />
              <LanguagePicker />
            </Router>
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
