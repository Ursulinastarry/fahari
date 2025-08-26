// src/pages/owner/AppointmentsPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";

interface Booking {
  id: string;
  bookingNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  salonName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const AppointmentsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDateTime, setNewDateTime] = useState<string>("");

  const fetchBookings = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/bookings/owner", {
        withCredentials: true,
      });
      setBookings(res.data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.put(
        `http://localhost:4000/api/bookings/${id}`,
        { status },
        { withCredentials: true }
      );
      fetchBookings();
    } catch (err) {
      console.error("Error updating booking:", err);
    }
  };

  const rescheduleBooking = async () => {
    if (!rescheduleId || !newDateTime) return;
    try {
      await axios.patch(
        `http://localhost:4000/api/bookings/${rescheduleId}/reschedule`,
        { newDateTime },
        { withCredentials: true }
      );
      setRescheduleId(null);
      setNewDateTime("");
      fetchBookings();
    } catch (err) {
      console.error("Error rescheduling booking:", err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📅 Manage Appointments</h1>
      <div className="space-y-4">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white shadow rounded-lg p-4"
          >
            <div>
              <p className="font-semibold">{b.firstName} {b.lastName}</p>
              <p className="text-sm text-gray-600">Booking: {b.bookingNumber}</p>
              <p className="text-sm text-gray-600">Salon: {b.salonName}</p>
              <p className="text-sm text-gray-600">
                Created: {new Date(b.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Email: {b.email} | Phone: {b.phone}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 md:mt-0">
              <p className="font-bold">KES {b.totalAmount}</p>
              <span
                className={`px-3 py-1 text-xs rounded-full ${
                  b.status === "CONFIRMED"
                    ? "bg-green-100 text-green-600"
                    : b.status === "CANCELLED"
                    ? "bg-red-100 text-red-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {b.status}
              </span>
              {b.status === "PENDING_PAYMENT" && (
                <>
                  <button
                    onClick={() => updateStatus(b.id, "CONFIRMED")}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => updateStatus(b.id, "CANCELLED")}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button
                onClick={() => setRescheduleId(b.id)}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Reschedule
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reschedule Modal */}
      {rescheduleId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Reschedule Booking</h2>
            <input
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRescheduleId(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={rescheduleBooking}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
