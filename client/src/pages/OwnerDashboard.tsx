// src/pages/OwnerDashboard.tsx
import { Routes, Route, NavLink } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import StatisticsPage from "./owner/StatisticsPage";
import ServicesPage from "./owner/ServicesPage";
import AppointmentsPage from "./owner/AppointmentsPage";
import ReviewsPage from "./owner/ReviewsPage";
import SalonOwnerSalons from "./owner/SalonsPage";
import CreateSalonForm from "./owner/CreateSalonForm";
import React, { useState, useEffect } from "react";

const OwnerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "statistics" | "services" | "appointments" | "reviews" | "salons"
  >("statistics");

  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if owner has a salon
    const checkSalon = async () => {
      try {
        // Replace this endpoint with your actual salon check API
        const response = await fetch('http://localhost:4000/api/salons/owner/me', {
          credentials: 'include' // Include cookies for authentication
        });
        
        console.log('Salon check response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Salon check response data:', data);
          
          // Check different possible response formats
          const hasSalonData = !!(data.salon || data.id || (Array.isArray(data) && data.length > 0));
          console.log('Has salon:', hasSalonData);
          setHasSalon(hasSalonData);
        } else if (response.status === 404) {
          console.log('No salon found (404)');
          setHasSalon(false); // No salon found
        } else {
          console.log('Unexpected response status:', response.status);
          const errorData = await response.text();
          console.log('Error response:', errorData);
          setHasSalon(false);
        }
      } catch (error) {
        console.error("Error checking salon:", error);
        setHasSalon(false);
      } finally {
        setLoading(false);
      }
    };

    checkSalon();
  }, []);

  const handleSalonCreated = (salonData: any) => {
    setHasSalon(true);
  };

  if (loading) {
    return (
      <DashboardLayout title="Owner Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Show create salon form if owner has no salon
  if (!hasSalon) {
    return (
      <DashboardLayout title="Create Your Salon">
        <CreateSalonForm onSalonCreated={handleSalonCreated} />
      </DashboardLayout>
    );
  }

  // Show regular dashboard if user has a salon
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
        {/* <button
          onClick={() => setActiveTab("services")}
          className={`pb-2 px-4 font-medium ${
            activeTab === "services"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-600"
          }`}
        >
          Services
        </button> */}
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
      </div>

      {/* Content */}
      <div>
        {activeTab === "statistics" && <StatisticsPage />}
        {activeTab === "services" && <ServicesPage />}
        {activeTab === "appointments" && <AppointmentsPage />}
        {activeTab === "reviews" && <ReviewsPage />}
        {activeTab === "salons" && <SalonOwnerSalons />}
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;