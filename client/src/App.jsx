
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ClientDashboard from "./pages/ClientDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Notifications from "./pages/Notifications";
import CreateSalonForm from "./pages/owner/CreateSalonForm";
import SalonOwnerSalons from "./pages/owner/SalonsPage";
import { UserProvider } from './contexts/UserContext';
import ServicesPage from "./pages/owner/ServicesPage";
import HomePage from "./pages/HomePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useEffect } from 'react';
import { registerServiceWorker } from './utils/pushNotifications';
function App() {
  useEffect(() => {
    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      registerServiceWorker().catch(console.error);
    }
  }, []);

  return (
    
    <UserProvider>
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<HomePage />} /> */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-salon" element={<CreateSalonForm />} />
        <Route path="/" element={<ClientDashboard />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/owner/salons" element={<SalonOwnerSalons />} />
        <Route path="/salon-services/:salonId" element={<ServicesPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage/>} />
        <Route path="/reset-password" element={<ResetPasswordPage/>} />

      </Routes>
    </BrowserRouter>
    </UserProvider>
  );
}

export default App;
