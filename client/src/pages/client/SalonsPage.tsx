import React, { useEffect, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

// Interfaces
interface SalonService {
  id: string;
  salonId: string;
  serviceId: string;
  price: number;
  duration: number;
  service: {
    id: string;
    name: string;
    isActive: boolean;
    description?: string;
    category?: string;
  };
}

interface Salon {
  id: string;
  name: string;
  description?: string;
  city: string;
  location: string;
  profileImage?: string;
  salonServices?: SalonService[];
  reviews?: any[];
}

interface Slot {
  id: string;
  date: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  isAvailable: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

const SalonsPage: React.FC = () => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [highlightedSlots, setHighlightedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all salons
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/salons");
        setSalons(res.data.salons);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSalons();
  }, []);

  // Fetch salon details
  const fetchSalonDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:4000/api/salons/${id}`);
      setSelectedSalon(res.data);
      setServices(
        res.data.salonServices.map((s: SalonService) => ({
          id: s.id,
          name: s.service.name,
          price: s.price,
          duration: s.duration
        }))
      );

      // Fetch slots
      const slotsRes = await axios.get<Slot[]>(`http://localhost:4000/api/slots/salons/${id}`);
      const validSlots = slotsRes.data.map(slot => ({
        ...slot,
        startTime: new Date(slot.startTime).toISOString(),
        endTime: new Date(slot.endTime).toISOString()
      }));
      setSlots(mergeConsecutiveSlots(validSlots));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Merge consecutive slots with same availability
  const mergeConsecutiveSlots = (slots: Slot[]): Slot[] => {
    if (!slots.length) return [];
    const sorted = [...slots].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const merged: Slot[] = [];
    let temp = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = new Date(temp.endTime).getTime();
      const currStart = new Date(sorted[i].startTime).getTime();

      if (prevEnd === currStart && temp.isAvailable === sorted[i].isAvailable) {
        temp.endTime = sorted[i].endTime;
      } else {
        merged.push({ ...temp });
        temp = { ...sorted[i] };
      }
    }
    merged.push(temp);
    return merged;
  };

  // Handle service selection
  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setHighlightedSlots([]);
  };

  // Handle slot selection
  const handleSlotClick = (slot: Slot) => {
    if (!slot.isAvailable || !selectedService) return;

    const slotDuration = 60; // minutes per slot
    const requiredSlots = Math.ceil(selectedService.duration / slotDuration);

    const sortedSlots = slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const startIndex = sortedSlots.findIndex(s => s.id === slot.id);
    if (startIndex === -1) return;

    const consecutive = sortedSlots.slice(startIndex, startIndex + requiredSlots);
    if (consecutive.length < requiredSlots || consecutive.some(s => !s.isAvailable)) {
      alert("Not enough consecutive slots for this service.");
      return;
    }

    setSelectedSlot(consecutive[0]);
    setHighlightedSlots(consecutive.map(s => s.id));
  };

  // Handle booking
const handleBookService = async (salonServiceId: string) => {
  if (!selectedSlot || !selectedSalon) {
    alert("Select a slot first.");
    return;
  }

  try {
    // Extract date & time properly
    const slotDate = new Date(selectedSlot.startTime).toISOString().split("T")[0]; // e.g. "2025-08-27"
    const slotStartTime = new Date(selectedSlot.startTime).toISOString().split("T")[1].slice(0, 5); // e.g. "09:00"

    await axios.post(
      "http://localhost:4000/api/bookings",
      {
        salonId: selectedSalon.id,
        salonServiceId,
        slotDate,
        slotStartTime,
      },
      { withCredentials: true }
    );

    alert("Booking confirmed!");

    // Refresh slots
    const slotsRes = await axios.get<Slot[]>(
      `http://localhost:4000/api/slots/salons/${selectedSalon.id}`
    );
    setSlots(mergeConsecutiveSlots(slotsRes.data));
    setSelectedSlot(null);
    setHighlightedSlots([]);
  } catch (err: any) {
    console.error(err.response?.data || err);
    alert(err.response?.data?.error || "Booking failed");
  }
};
;

  if (loading) return <p>Loading...</p>;

  const calendarEvents: EventInput[] = slots.map(slot => ({
    id: slot.id,
    start: slot.startTime,
    end: slot.endTime,
    title: slot.isAvailable ? (selectedService ? `Available – ${selectedService.duration} min` : "Available") : "Booked",
    backgroundColor: highlightedSlots.includes(slot.id) ? "#2563EB" : slot.isAvailable ? "#34D399" : "#F87171",
    borderColor: highlightedSlots.includes(slot.id) ? "#2563EB" : slot.isAvailable ? "#34D399" : "#F87171",
    extendedProps: { isAvailable: slot.isAvailable }
  }));

  return (
    <div>
      {!selectedSalon ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {salons.map(salon => (
            <div key={salon.id} onClick={() => fetchSalonDetails(salon.id)} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg cursor-pointer">
              <img src={salon.profileImage || "https://via.placeholder.com/300"} alt={salon.name} className="rounded-lg mb-4 w-full h-40 object-cover"/>
              <h2 className="text-xl font-semibold">{salon.name}</h2>
              <p className="text-gray-500">{salon.city}, {salon.location}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl p-6">
          <button onClick={() => setSelectedSalon(null)} className="text-indigo-600 hover:underline mb-4">← Back</button>
          <h2 className="text-2xl font-bold">{selectedSalon.name}</h2>
          <p className="text-gray-600">{selectedSalon.description}</p>

          <h3 className="mt-6 font-semibold text-lg">Services</h3>
<ul className="list-disc ml-6 text-gray-700">
  {services.map((service) => (
    <li key={service.id} className="flex justify-between items-center mb-2 border-b pb-2">
      <div>
        <span className="font-medium">{service.name}</span> – ksh{service.price} ({service.duration} mins)
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleServiceClick(service)}
          className={`px-3 py-1 rounded text-white ${
            selectedService?.id === service.id ? "bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {selectedService?.id === service.id ? "Selected" : "Select"}
        </button>

        <button
          onClick={() => handleBookService(service.id)}
          disabled={!selectedSlot}
          className={`px-3 py-1 rounded text-white ${
            selectedSlot ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Book Now
        </button>
      </div>
    </li>
  ))}
</ul>

<h3 className="mt-6 font-semibold text-lg">Available Slots</h3>
{slots.length === 0 ? (
  <p className="text-gray-500">No slots available.</p>
) : (
  <FullCalendar
    plugins={[dayGridPlugin, timeGridPlugin]}
    initialView="timeGridDay"
    headerToolbar={{
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    }}
    events={calendarEvents}
    eventClick={(info) => {
      const clickedSlot = slots.find((s) => s.id === info.event.id);
      if (!clickedSlot || !clickedSlot.isAvailable) {
        alert("This slot is already booked");
        return;
      }
      handleSlotClick(clickedSlot);
    }}
    height="auto"
  />
)}

         

          {selectedService && selectedSlot && (
            <button
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              onClick={() => handleBookService(selectedService.id)}
            >
              Book {selectedService.name} at {new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SalonsPage;
