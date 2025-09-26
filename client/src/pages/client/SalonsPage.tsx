import React, { useEffect, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Star } from "lucide-react";
import { DateTime } from "luxon";
import { useUser } from "../../contexts/UserContext";
import SalonImage from "../SalonImage";
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
  coverImage?: string;
  gallery?: string[]; // Array of image URLs
}

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface BookingState {
  salon: Salon | null;
  service: SalonService | null;
  slot: Slot | null;
  selectedTime: string | null;
}

const SalonsPage: React.FC = () => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonRatings, setSalonRatings] = useState<{ [key: string]: number }>({});
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<SalonService[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<BookingState>({
    salon: null,
    service: null,
    slot: null,
    selectedTime: null
  });
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  // Modal states
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeOptions, setTimeOptions] = useState<string[]>([]);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [salonReviews, setSalonReviews] = useState<any[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  // Fetch salons + ratings
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/salons", { withCredentials: true });
        const salonsData: Salon[] = res.data.salons;
        setSalons(salonsData);

        const ratings: { [key: string]: number } = {};
        await Promise.all(
          salonsData.map(async (salon) => {
            try {
              const ratingRes = await axios.get(`http://localhost:4000/api/reviews/rating/${salon.id}`, { withCredentials: true });
              ratings[salon.id] = ratingRes.data.averageRating || 0;
            } catch {
              ratings[salon.id] = 0;
            }
            
          })
        );
        setSalonRatings(ratings);
      } catch (err) {
        console.error("Error fetching salons:", err);
      }
    };
    fetchSalons();
  }, []);

  // Fetch salon details + services + slots
  const fetchSalonDetails = async (id: string) => {
  setLoading(true);
  try {
    // ✅ Fetch salon details
    const res = await axios.get(`http://localhost:4000/api/salons/${id}`, { withCredentials: true });
    const salonData = res.data;

    // Extract images safely
    const profileImage = salonData.profileImage || "/default-profile.png";
    const coverImage = salonData.coverImage || "/default-cover.jpg";
    const gallery = salonData.gallery || []; // Array of image URLs

    // Store salon + images
    setSelectedSalon({
      ...salonData,
      profileImage,
      coverImage,
      gallery,
    });

    setServices(salonData.salonServices || []);

    // Reset booking state when switching salons
    setBooking({
      salon: salonData,
      service: null,
      slot: null,
      selectedTime: null,
    });

    // ✅ Fetch salon slots
    const slotsRes = await axios.get<Slot[]>(`http://localhost:4000/api/slots/salons/${id}`, { withCredentials: true });

    const validSlots = slotsRes.data.map((slot) => ({
      ...slot,
      startTime: new Date(slot.startTime).toISOString(),
      endTime: new Date(slot.endTime).toISOString(),
    }));

    setSlots(mergeConsecutiveSlots(validSlots));
  } catch (err) {
    console.error("Error fetching salon details:", err);
  } finally {
    setLoading(false);
  }
};


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

  const handleServiceClick = (service: SalonService) => {
    if(!user){
      alert("Please log in to book a service.");
      return;
    }
    setBooking(prev => ({
      ...prev,
      service,
      slot: null,
      selectedTime: null
    }));
  };

  const handleSlotClick = (slot: Slot) => {
    if (!booking.service) {
      alert("Please select a service first.");
      return;
    }

    if (!slot.isAvailable) {
      alert("This slot is already booked.");
      return;
    }

    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    const duration = booking.service.duration;

    const options: string[] = [];
    let current = new Date(start);
    
    while (current.getTime() + duration * 60000 <= end.getTime()) {
      options.push(
        current.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
      );
      current = new Date(current.getTime() + 60 * 60000); // increment by 60 mins
    }

    if (options.length === 0) {
      alert("No available time slots for this service duration.");
      return;
    }

    setBooking(prev => ({
      ...prev,
      slot,
      selectedTime: null
    }));
    setTimeOptions(options);
    setShowTimePicker(true);
  };

  const handleTimeSelection = async (selectedTime: string) => {
    if (!booking.salon || !booking.service || !booking.slot) {
      console.error("Missing booking data:", booking);
      alert("Please select a salon, service, and slot.");
      return;
    }

    setShowTimePicker(false);
    
    try {
      const slotDate = new Date(booking.slot.startTime).toISOString().split("T")[0];
      
      console.log("Making booking with:", {
        salonId: booking.salon.id,
        salonServiceId: booking.service.id,
        slotDate,
        slotStartTime: selectedTime
      });

      const res = await axios.post(
        "http://localhost:4000/api/bookings",
        { 
          salonId: booking.salon.id, 
          salonServiceId: booking.service.id, 
          slotDate, 
          slotStartTime: selectedTime 
        },
        { withCredentials: true }
      );

      // Show booking confirmation
      setBookingDetails({
        salon: booking.salon.name,
        service: booking.service.service.name,
        date: slotDate,
        time: selectedTime,
      });
      setShowBookingPopup(true);

      // Refresh slots
      const slotsRes = await axios.get(`http://localhost:4000/api/slots/salons/${booking.salon.id}`, { withCredentials: true });
      const validSlots = slotsRes.data.map((slot: Slot) => ({
        ...slot,
        startTime: new Date(slot.startTime).toISOString(),
        endTime: new Date(slot.endTime).toISOString(),
      }));
      setSlots(mergeConsecutiveSlots(validSlots));
      
      // Reset booking state
      setBooking(prev => ({
        ...prev,
        service: null,
        slot: null,
        selectedTime: null
      }));

    } catch (err: any) {
      console.error("Booking error:", err.response?.data || err);
      alert(err.response?.data?.error || "Booking failed. Please try again.");
    }
  };

  const fetchSalonReviews = async () => {
    if (!selectedSalon) return;
    try {
      const res = await axios.get(`http://localhost:4000/api/reviews/salon/${selectedSalon.id}`, { withCredentials: true });
      setSalonReviews(res.data);
      setShowReviewsModal(true);
    } catch (err) {
      console.error("Error fetching salon reviews:", err);
    }
  };

  const goBackToSalons = () => {
    setSelectedSalon(null);
    setServices([]);
    setSlots([]);
    setBooking({
      salon: null,
      service: null,
      slot: null,
      selectedTime: null
    });
  };

  if (loading) return <div className="flex justify-center items-center h-64"><p className="text-lg">Loading...</p></div>;

  const calendarEvents: EventInput[] = slots.map((slot) => ({
    id: slot.id,
    start: slot.startTime,
    end: slot.endTime,
    title: slot.isAvailable 
      ? (booking.service ? `Available – ${booking.service.duration} min` : "Available") 
      : "Booked",
    backgroundColor: slot.isAvailable ? "#34D399" : "#F87171",
    borderColor: slot.isAvailable ? "#34D399" : "#F87171",
    extendedProps: { isAvailable: slot.isAvailable },
  }));
const now = new Date();

// Filter out slots that ended before "now"
const futureEvents = calendarEvents.filter((event) => {
  const eventStart = new Date(event.start as string);
  return eventStart >= now;
});

  return (
    <div className="container mx-auto px-4 py-6">
      {!selectedSalon ? (
        <div>
          <h1 className="text-3xl font-bold mb-8 text-center">Choose a Salon</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => (
              <div
                key={salon.id}
                onClick={() => fetchSalonDetails(salon.id)}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg cursor-pointer transition-shadow duration-300"
              >
                <SalonImage
                  filename={salon.coverImage}
                  alt={`${salon.name} cover`}
                  className="rounded-lg mb-4 w-full h-40 object-cover"
                  fallback="/images/placeholder.jpg"
                />
                <h2 className="text-xl font-semibold mb-2">{salon.name}</h2>

  
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(salonRatings[salon.id] || 0) 
                          ? "text-yellow-400 fill-yellow-400" 
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-gray-500 text-sm ml-2">
                    {(salonRatings[salon.id] || 0).toFixed(1)}
                  </span>
                </div>
                <p className="text-gray-500">{salon.city}, {salon.location}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl p-6">
          <button 
            onClick={goBackToSalons} 
            className="text-indigo-600 hover:underline mb-4 font-medium"
          >
            ← Back to Salons
          </button>
           {/* ✅ Gallery Section */}
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-3">Gallery</h3>
      {selectedSalon?.gallery && selectedSalon.gallery.length > 0 ? (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    {selectedSalon.gallery.map((filename: string, idx: number) => (
      <SalonImage
        key={idx}
        filename={filename}
        alt={`${selectedSalon.name} gallery ${idx + 1}`}
        className="w-full h-32 object-cover rounded-lg shadow-sm hover:opacity-90 transition cursor-pointer"
        fallback="/images/gallery-placeholder.jpg"
      />
    ))}
  </div>
) : (
  <p className="text-gray-500">No gallery images available.</p>
)}
    </div>
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">{selectedSalon.name}</h2>
            <p className="text-gray-600 mb-4">{selectedSalon.description}</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(salonRatings[selectedSalon.id] || 0) 
                        ? "text-yellow-400 fill-yellow-400" 
                        : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="text-gray-500 text-sm ml-1">
                  {(salonRatings[selectedSalon.id] || 0).toFixed(1)}
                </span>
              </div>
              <button
                onClick={fetchSalonReviews}
                className="ml-4 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
              >
                See Reviews
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Services</h3>
            {services.length === 0 ? (
              <p className="text-gray-500">No services available.</p>
            ) : (
              <div className="grid gap-4">
                {services.map((salonService) => (
                  <div key={salonService.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <span className="font-medium text-lg">{salonService.service.name}</span>
                      <p className="text-gray-600">KSh {salonService.price} • {salonService.duration} minutes</p>
                    </div>
                    <button
                      onClick={() => handleServiceClick(salonService)}
                      className={`px-4 py-2 rounded transition-colors ${
                        booking.service?.id === salonService.id 
                          ? "bg-blue-700 text-white" 
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {booking.service?.id === salonService.id ? "Selected" : "Select"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {booking.service && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                <strong>Selected Service:</strong> {booking.service.service.name} 
                ({booking.service.duration} minutes, KSh {booking.service.price})
              </p>
              <p className="text-blue-600 text-sm mt-1">Click on an available time slot to book.</p>
            </div>
          )}

          <div>
            <h3 className="text-xl font-semibold mb-4">Available Time Slots</h3>
            {slots.length === 0 ? (
              <p className="text-gray-500">No slots available.</p>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin]}
                initialView="timeGridDay"
                headerToolbar={{ 
                  left: "prev,next today", 
                  center: "title", 
                  right: "dayGridMonth,timeGridWeek,timeGridDay" 
                }}
                events={futureEvents}
                eventClick={(info) => {
                  const clickedSlot = slots.find((s) => s.id === info.event.id);
                  if (clickedSlot) {
                    handleSlotClick(clickedSlot);
                  }
                }}
                height="auto"
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                eventDisplay="block"
              />
            )}
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96 max-h-96 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Choose Start Time</h2>
            <p className="text-sm text-gray-600 mb-4">
              Service: {booking.service?.service.name} ({booking.service?.duration} minutes)
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {timeOptions.map((time, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTimeSelection(time)}
                  className="w-full px-4 py-3 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  {time}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTimePicker(false)}
              className="mt-4 px-4 py-2 text-gray-600 hover:text-gray-800 border rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Booking Confirmation Popup */}
      {showBookingPopup && bookingDetails && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-8 shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-6 text-green-600">🎉 Booking Confirmed!</h2>
            <div className="space-y-3 text-gray-700">
              <p><strong>Salon:</strong> {bookingDetails.salon}</p>
              <p><strong>Service:</strong> {bookingDetails.service}</p>
              <p><strong>Date:</strong> {new Date(bookingDetails.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {bookingDetails.time}</p>
            </div>
            <button
              onClick={() => {
                setShowBookingPopup(false);
                setBookingDetails(null);
              }}
              className="mt-6 w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Salon Reviews Modal */}
      {showReviewsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Reviews for {selectedSalon?.name}</h2>
              <button 
                onClick={() => setShowReviewsModal(false)} 
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            {salonReviews.length === 0 ? (
              <p className="text-gray-500">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {salonReviews.map((review) => (
                  <div key={review.id} className="border-b pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">
                        {review.client?.firstName} {review.client?.lastName}
                      </p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${
                              i < review.rating 
                                ? "text-yellow-400 fill-yellow-400" 
                                : "text-gray-300"
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonsPage;