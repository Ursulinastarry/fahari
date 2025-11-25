// src/pages/ClientDashboard.tsx
import React, { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import SalonsPage from "./client/SalonsPage";
import AppointmentsPage from "./client/AppointmentsPage";
import HomePage from "./HomePage";
import { useUser } from "../contexts/UserContext";
const ClientDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"salons" | "appointments" | "home">("home");
  const { user } = useUser();

  return (
<DashboardLayout 
  title="Fahari Beauty"
  logo="/logo.png" // or logo={<YourLogoComponent />}
>     
 {/* Navbar inside dashboard */}
      <div className="flex gap-6 border-b mb-6">
        <button
          onClick={() => setActiveTab("home")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "home"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 dark:text-slate-400 hover:text-indigo-600"
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setActiveTab("salons")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "salons"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 dark:text-slate-400 hover:text-indigo-600"
          }`}
        >
          Salons
        </button>
        
        {user && (
  <button
    onClick={() => setActiveTab("appointments")}
    className={`pb-2 px-4 font-medium ${
      activeTab === "appointments"
        ? "border-b-2 border-indigo-600 text-indigo-600"
        : "text-gray-500 dark:text-slate-400 hover:text-indigo-600"
    }`}
  >
    My Appointments
  </button>
)}

      </div>

      {/* Content */}
      <div>
        {activeTab === "salons" && <SalonsPage />}
        {activeTab === "appointments" && <AppointmentsPage />}
        {activeTab === "home" && <HomePage />}
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
