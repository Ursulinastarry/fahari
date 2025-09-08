// src/pages/ClientDashboard.tsx
import React, { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import SalonsPage from "./client/SalonsPage";
import AppointmentsPage from "./client/AppointmentsPage";

const ClientDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"salons" | "slots" | "appointments">("salons");

  return (
    <DashboardLayout title="Client Dashboard">
      {/* Navbar inside dashboard */}
      <div className="flex gap-6 border-b mb-6">
        <button
          onClick={() => setActiveTab("salons")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "salons"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-600"
          }`}
        >
          Salons
        </button>
        {/* <button
          onClick={() => setActiveTab("slots")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "slots"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-600"
          }`}
        >
          Slots
        </button> */}
        <button
          onClick={() => setActiveTab("appointments")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "appointments"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-600"
          }`}
        >
          My Appointments
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === "salons" && <SalonsPage />}
        {activeTab === "appointments" && <AppointmentsPage />}
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
