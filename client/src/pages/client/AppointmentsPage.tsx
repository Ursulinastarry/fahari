// src/pages/owner/AppointmentsPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { baseUrl } from '../../config/baseUrl';
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
    const [loadingReview, setLoadingReview] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
  // Review modal state
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setcomment] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/bookings/me`, {
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
        `${baseUrl}/api/bookings/${id}/cancel`,
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
    const localDate = new Date(newDateTime);
    const dateTimeToSend = localDate.toISOString();
    
    console.log("Original input:", newDateTime);
    console.log("Sending to backend:", dateTimeToSend);

    const { data } = await axios.patch(
      `${baseUrl}/api/bookings/${rescheduleId}/reschedule`,
      { newDateTime: dateTimeToSend },
      { withCredentials: true }
    );

    alert(
      `${data.message}\n\n` +
      `Old Time: ${new Date(data.originalDateTime).toLocaleString()}\n` +
      `New Time: ${new Date(data.newDateTime).toLocaleString()}`
    );

    setRescheduleId(null);
    setNewDateTime("");
    fetchBookings();
  } catch (err: any) {
    console.error("Error rescheduling booking:", err);
    alert(err.response?.data?.message || "Failed to reschedule booking. Try again.");
  }
};

const fetchBookingReview = async (bookingId: string) => {
    setLoadingReview(true);
    try {
      const res = await axios.get(`${baseUrl}/api/reviews/${bookingId}`, {
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
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) {
    // Combine existing and new files, limit to 5
    const newFiles = [...images, ...files].slice(0, 5);
    setImages(newFiles); // Just set the array directly

    // Optional: Preview images
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Handle preview if needed
        console.log(e.target?.result);
      };
      reader.readAsDataURL(file);
    });
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
          className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-900 shadow rounded-lg p-4"
        >
          <div>
            <p className="font-semibold">
          {b.firstName} {b.lastName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
          Booking: {b.bookingNumber}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Salon: {b.salonName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Service: {b.serviceName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
          Appointment: {formatEAT(b.slotStartTime)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
          Created: {formatEAT(b.createdAt)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
              ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-white"
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

            {effectiveStatus === "COMPLETED" && (
          <button
            onClick={() => setReviewBookingId(b.id)}
            className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Review
          </button>
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
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
      {reviewBookingId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-black rounded-lg p-6 shadow-lg w-96">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">
                  Images (Max 5)
                </label>
            <div>
                    <label htmlFor="images" className="cursor-pointer bg-indigo-50 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center space-x-2 font-medium">
                      <span>Attach Images</span>
                    </label>
                    <input
                      type="file"
                      id="images"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                      className="hidden"
                      disabled={images.length >= 5}

                    />
                    <p className="text-sm text-gray-500 dark:text-white mt-2">
                      Upload multiple images ({images.length}/5 uploaded)
                    </p>
                  </div>

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
                images.forEach((file) => formData.append("reviewImages", file)); // field name must match multer config

                await axios.post(`${baseUrl}/api/reviews`, formData, {
                withCredentials: true,
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
        {/* Review Modal */}
      {isModalOpen && selectedReview && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-96 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(selectedReview.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
      </div>
      )}
  

export default AppointmentsPage;
