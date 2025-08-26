// src/pages/client/SlotsPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  salonId: string;
  serviceId: string;
}

const SlotsPage: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/slots", {
          withCredentials: true,
        });
        setSlots(res.data);
      } catch (err) {
        console.error("Error fetching slots:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, []);

  const handleBook = async (slot: Slot) => {
    try {
      const res = await axios.post(
        "http://localhost:4000/api/bookings",
        {
          salonId: slot.salonId,
          serviceId: slot.serviceId,
          slotId: slot.id,
          clientNotes: "Booked via dashboard",
        },
        { withCredentials: true }
      );

      setBookingMsg(`✅ Booking confirmed for ${res.data.salon.name}`);
      // Refresh slots after booking
      setSlots(
        slots.map((s) =>
          s.id === slot.id ? { ...s, isAvailable: false } : s
        )
      );
    } catch (err: any) {
      console.error("Booking failed:", err);
      setBookingMsg(
        err.response?.data?.message || "❌ Booking could not be created"
      );
    }
  };

  if (loading) return <p>Loading slots...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Available Slots</h2>
      {bookingMsg && (
        <p className="mb-4 text-center text-indigo-600 font-medium">
          {bookingMsg}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`p-4 rounded-lg shadow text-center ${
              slot.isAvailable
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <p className="font-semibold">
              {new Date(slot.date).toLocaleDateString()}
            </p>
            <p>
              {slot.startTime} - {slot.endTime}
            </p>
            <p>{slot.isAvailable ? "Available" : "Booked"}</p>
            {slot.isAvailable && (
              <button
                onClick={() => handleBook(slot)}
                className="mt-2 px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Book Now
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlotsPage;
