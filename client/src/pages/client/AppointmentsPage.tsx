import React, { useEffect, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";

interface Appointment {
  id: string;
  date: string;        // UTC date
  startTime: string;   // UTC datetime
  endTime: string;     // UTC datetime
  salon: { name: string };
  service: { name: string };
  status: string;
}

const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/bookings/me", {
          withCredentials: true
        });
        setAppointments(res.data);
      } catch (err) {
        console.error("Error fetching appointments:", err);
      }
    };
    fetchAppointments();
  }, []);

  const cancelAppointment = async (id: string) => {
    await axios.patch(`http://localhost:4000/api/appointments/${id}/cancel`);
    setAppointments(appointments.map(a => a.id === id ? { ...a, status: "CANCELLED" } : a));
  };

  const formatEAT = (utcDate: string) => {
    return DateTime.fromISO(utcDate, { zone: "utc" })
      .setZone("Africa/Nairobi")
      .toFormat("dd LLL yyyy, HH:mm");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Appointments</h2>
      {appointments.length === 0 ? (
        <p className="text-gray-500">No appointments yet.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((a) => (
            <div key={a.id} className="bg-white shadow rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{a.salon.name} – {a.service.name}</p>
                <p className="text-gray-500">
                  {formatEAT(a.startTime)} - {formatEAT(a.endTime)}
                </p>
                <p className={`font-medium ${a.status === "CANCELLED" ? "text-red-500" : "text-green-600"}`}>
                  {a.status}
                </p>
              </div>
              {a.status !== "CANCELLED" && (
                <button
                  onClick={() => cancelAppointment(a.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
