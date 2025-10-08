// src/pages/owner/StatisticsPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface Booking {
  id: string;
  price: number;
  time: string; // assume ISO string
}

const StatisticsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    axios
      .get("https://fahari-production.up.railway.app/api/bookings/owner", { withCredentials: true })
      .then((res) => setBookings(res.data))
      .catch((err) => console.error("Error fetching bookings:", err));
  }, []);

  const totalRevenue = bookings.reduce((sum, b) => sum + b.price, 0);

  // Group by date (simple daily revenue)
  const revenueByDate = bookings.reduce((acc: Record<string, number>, b) => {
    const date = new Date(b.time).toLocaleDateString();
    acc[date] = (acc[date] || 0) + b.price;
    return acc;
  }, {});

  const chartData = Object.keys(revenueByDate).map((date) => ({
    date,
    revenue: revenueByDate[date],
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Statistics & Performance</h1>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white dark:bg-black shadow rounded-xl p-6">
          <h2 className="text-gray-600 dark:text-white">Total Bookings</h2>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </div>
        <div className="bg-white dark:bg-black shadow rounded-xl p-6">
          <h2 className="text-gray-600 dark:text-white">Total Revenue</h2>
          <p className="text-2xl font-bold">KES {totalRevenue}</p>
        </div>
        <div className="bg-white dark:bg-black shadow rounded-xl p-6">
          <h2 className="text-gray-600 dark:text-white">Avg. per Booking</h2>
          <p className="text-2xl font-bold">
            {bookings.length > 0 ? `KES ${(totalRevenue / bookings.length).toFixed(0)}` : "KES 0"}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-black shadow rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Revenue Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#7e3af2" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatisticsPage;
