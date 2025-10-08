import React, { useEffect, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";
import { Star } from "lucide-react";

interface Booking {
  id: string;
  bookingNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string; // UTC
  salonName: string;
  serviceName: string; // new field
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  slotStartTime: string; // UTC
}

const AppointmentsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDateTime, setNewDateTime] = useState<string>("");

  // Review modal state
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await axios.get("https://fahari-production.up.railway.app/api/bookings/owner", {
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

  const cancelBooking = async (id: string, status: string) => {
    try {
      await axios.patch(
        `https://fahari-production.up.railway.app/api/bookings/${id}/cancel`,
        { status },
        { withCredentials: true }
      );
      fetchBookings();
    } catch (err) {
      console.error("Error updating booking:", err);
    }
  };

  const rescheduleBooking = async () => {
    console.log("Rescheduling booking:", rescheduleId, newDateTime);
  if (!rescheduleId || !newDateTime) {
    alert("Please select a booking and a new time before rescheduling.");
    return;
  }

  try {
    const { data } = await axios.patch(
      `https://fahari-production.up.railway.app/api/bookings/${rescheduleId}/reschedule`,
      { newDateTime },
      { withCredentials: true }
    );

    // Show success message before refresh
    alert(
      `${data.message}\n\n` +
      `Old Time: ${new Date(data.originalDateTime).toLocaleString()}\n` +
      `New Time: ${new Date(data.newDateTime).toLocaleString()}`
    );

    setRescheduleId(null);
    setNewDateTime("");
    fetchBookings(); // refresh after message
  } catch (err: any) {
    console.error("Error rescheduling booking:", err);
    alert(err.response?.data?.message || "Failed to reschedule booking. Try again.");
  }
};

  const fetchBookingReview = async (bookingId: string) => {
    setLoadingReview(true);
    try {
      const res = await axios.get(`https://fahari-production.up.railway.app/api/reviews/${bookingId}`, {
        withCredentials: true,
      });
      setSelectedReview(res.data);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error("Error fetching review:", err.response?.data?.message || err.message);
    } finally {
      setLoadingReview(false);
    }
  };

  const formatEAT = (utcDate: string) => {
    return DateTime.fromISO(utcDate, { zone: "utc" })
      .setZone("Africa/Nairobi")
      .toFormat("dd LLL yyyy, HH:mm");
  };

  const now = DateTime.now().setZone("Africa/Nairobi");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📅 Manage Appointments</h1>
      <div className="space-y-4">
        {bookings.map((b) => {
          const slotTime = DateTime.fromISO(b.slotStartTime, { zone: "utc" }).setZone(
            "Africa/Nairobi"
          );
          let effectiveStatus = b.status;
          if (b.status !== "CANCELLED" && slotTime < now) {
        if (b.status === "REVIEWED") {
          effectiveStatus = "REVIEWED";
        } else {
          effectiveStatus = "COMPLETED";
        }
          }

          // If backend status is REVIEWED, always show as REVIEWED
          if (b.status === "REVIEWED") {
        effectiveStatus = "REVIEWED";
          }

          return (
            <div
              key={b.id}
              className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-black shadow rounded-lg p-4"
            >
              <div>
                <p className="font-semibold">
                  {b.firstName} {b.lastName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-50">Booking: {b.bookingNumber}</p>
                <p className="text-sm text-gray-600 dark:text-gray-50">Salon: {b.salonName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-50">Service: {b.serviceName}</p> {/* New line */}

                <p className="text-sm text-gray-600 dark:text-gray-50">
                  Appointment: {formatEAT(b.slotStartTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-50">Created: {formatEAT(b.createdAt)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-50">
                  Email: {b.email} | Phone: {b.phone}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3 md:mt-0">
                <p className="font-bold">KES {b.totalAmount}</p>
                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    effectiveStatus === "CONFIRMED"
                      ? "bg-green-100 text-green-600"
                      : effectiveStatus === "CANCELLED"
                      ? "bg-red-100 text-red-600"
                      : effectiveStatus === "COMPLETED"
                      ? "bg-gray-200 text-gray-700 dark:text-white"
                      : effectiveStatus === "REVIEWED"
              ? "bg-blue-100 text-blue-600"
              : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {effectiveStatus}
                </span>

                {effectiveStatus === "PENDING_PAYMENT" && (
                  <>
                    <button
                      onClick={() => cancelBooking(b.id, "CONFIRMED")}
                      className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => cancelBooking(b.id, "CANCELLED")}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {effectiveStatus === "CONFIRMED" && (
                  <>
                    <button
                      onClick={() => setRescheduleId(b.id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => cancelBooking(b.id, "CANCELLED")}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Cancel
                    </button>
                  </>
                )}

              
                 {effectiveStatus === "REVIEWED" && (
          <button
              onClick={() => fetchBookingReview(b.id)}
            className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
           {loadingReview ? "Loading..." : "see review"}

            
          </button>
            )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reschedule Modal */}
      {rescheduleId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white dark:bg-black rounded-lg p-6 shadow-lg w-96">
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

      {/* Review Modal */}
      {isModalOpen && selectedReview && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-black rounded-lg shadow-lg p-6 w-96 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 dark:text-white hover:text-gray-700 dark:text-white"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={selectedReview.client.avatar || "/default-avatar.png"}
                alt={selectedReview.client.firstName}
                className="w-12 h-12 rounded-full object-cover"
              />
              <p className="font-semibold">
                {selectedReview.client.firstName} {selectedReview.client.lastName}
              </p>
            </div>

            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < selectedReview.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>

            <p className="text-gray-700 dark:text-white mb-2">{selectedReview.comment}</p>
            <p className="text-xs text-gray-500 dark:text-white">
              {new Date(selectedReview.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
