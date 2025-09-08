// src/pages/owner/AppointmentsPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";

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
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setcomment] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const fetchBookings = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/bookings/me", {
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
      await axios.patch(
        `http://localhost:4000/api/bookings/${id}/cancel`,
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
            effectiveStatus = "COMPLETED";
          }

          return (
            <div
              key={b.id}
              className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white shadow rounded-lg p-4"
            >
              <div>
  <p className="font-semibold">
    {b.firstName} {b.lastName}
  </p>
  <p className="text-sm text-gray-600">
    Booking: {b.bookingNumber}
  </p>
  <p className="text-sm text-gray-600">Salon: {b.salonName}</p>
  <p className="text-sm text-gray-600">Service: {b.serviceName}</p> {/* New line */}
  <p className="text-sm text-gray-600">
    Appointment: {formatEAT(b.slotStartTime)}
  </p>
  <p className="text-sm text-gray-600">
    Created: {formatEAT(b.createdAt)}
  </p>
  <p className="text-sm text-gray-600">
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
                      ? "bg-gray-200 text-gray-700"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {effectiveStatus}
                </span>

                {effectiveStatus === "PENDING_PAYMENT" && (
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

                {effectiveStatus === "CONFIRMED" && (
                  <>
                    <button
                      onClick={() => setRescheduleId(b.id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => updateStatus(b.id, "CANCELLED")}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {effectiveStatus === "COMPLETED" && (
                  <button
                    onClick={() => setReviewBookingId(b.id)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          );
        })}
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

      {/* Review Modal */}
      {reviewBookingId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Leave a Review</h2>

            {/* Star rating */}
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  className={`cursor-pointer text-2xl ${
                    star <= rating ? "text-yellow-400" : "text-gray-300"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

            {/* comment */}
            <textarea
              placeholder="Write your comment..."
              value={comment}
              onChange={(e) => setcomment(e.target.value)}
              className="w-full border rounded p-2 mb-4"
            />

            {/* File upload */}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files || []))}
              className="mb-4"
            />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReviewBookingId(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const formData = new FormData();
                  formData.append("bookingId", reviewBookingId!);
                  formData.append("rating", rating.toString());
                  formData.append("comment", comment);
                  images.forEach((file) => formData.append("images", file));

                  await axios.post("http://localhost:4000/api/reviews", formData, {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                  });

                  setReviewBookingId(null);
                  setRating(0);
                  setcomment("");
                  setImages([]);
                }}
                disabled={rating === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
