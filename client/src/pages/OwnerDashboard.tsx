// src/pages/OwnerDashboard.tsx
import { Routes, Route, NavLink } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import StatisticsPage from "./owner/StatisticsPage";
import ServicesPage from "./owner/ServicesPage";
import AppointmentsPage from "./owner/AppointmentsPage";
import ReviewsPage from "./owner/ReviewsPage";
import React, { useState } from "react";


const OwnerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "statistics" | "services" | "appointments" | "reviews"
  >("statistics");

  return (
    <DashboardLayout title="Owner Dashboard">
      {/* Horizontal Navbar inside dashboard */}
      <div className="flex gap-6 border-b mb-6">
        <button
          onClick={() => setActiveTab("statistics")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "statistics"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-600"
          }`}
        >
          Statistics & Performance
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "services"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-600"
          }`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "appointments"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-600"
          }`}
        >
          Appointments
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "reviews"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-600"
          }`}
        >
          Reviews
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === "statistics" && <StatisticsPage />}
        {activeTab === "services" && <ServicesPage />}
        {activeTab === "appointments" && <AppointmentsPage />}
        {activeTab === "reviews" && <ReviewsPage />}
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;