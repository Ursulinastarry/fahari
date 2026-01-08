import React, { useEffect, useState } from "react";
import axios from "axios";
import { baseUrl } from '../../config/baseUrl';
import FullCalendar from "@fullcalendar/react";
import { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Star } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import SalonImage from "../SalonImage";
import Review from "../Review";

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
  phone: string;
  city: string;
  location: string;
  profileImage?: string;
  salonServices?: SalonService[];
  coverImage?: string;
  gallery?: string[];
  reviews?: Review[];
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

interface Review {
  id: string;
  salonId: string;
  clientName: string;
  rating: number;
  comment: string;
  images: string[];
}

interface PaymentDetails {
  salon: string;
  service: string;
  date: string;
  time: string;
  servicePrice: number;
  transactionFee: number;
  totalAmount: number;
}

const TRANSACTION_FEE_PERCENTAGE = 0.02; // 2%

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("MPESA");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [salonReviews, setSalonReviews] = useState<any[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // Fetch salons + ratings
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const res = await axios.get(`${baseUrl}/api/salons`, { withCredentials: true });
        const salonsData: Salon[] = res.data.salons;
        setSalons(salonsData);

        const ratings: { [key: string]: number } = {};
        await Promise.all(
          salonsData.map(async (salon) => {
            try {
              const ratingRes = await axios.get(`${baseUrl}/api/reviews/rating/${salon.id}`, { withCredentials: true });
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
      const res = await axios.get(`${baseUrl}/api/salons/${id}`, { withCredentials: true });
      const salonData = res.data;

      const profileImage = salonData.profileImage || "/default-profile.png";
      const coverImage = salonData.coverImage || "/default-cover.jpg";
      const gallery = salonData.gallery || [];

      setSelectedSalon({
        ...salonData,
        profileImage,
        coverImage,
        gallery,
      });

      setServices(salonData.salonServices || []);

      setBooking({
        salon: salonData,
        service: null,
        slot: null,
        selectedTime: null,
      });

      const slotsRes = await axios.get<Slot[]>(`${baseUrl}/api/slots/salons/${id}`, { withCredentials: true });

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
    if (!user) {
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
      current = new Date(current.getTime() + 60 * 60000);
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

  const handleTimeSelection = (selectedTime: string) => {
    if (!booking.salon || !booking.service || !booking.slot) {
      console.error("Missing booking data:", booking);
      alert("Please select a salon, service, and slot.");
      return;
    }

    setShowTimePicker(false);
    
    const slotDate = new Date(booking.slot.startTime).toISOString().split("T")[0];
    const servicePrice = booking.service.price;
    const transactionFee = Math.ceil(servicePrice * TRANSACTION_FEE_PERCENTAGE);
    const totalAmount = servicePrice + transactionFee;

    // Set payment details
    setPaymentDetails({
      salon: booking.salon.name,
      service: booking.service.service.name,
      date: slotDate,
      time: selectedTime,
      servicePrice,
      transactionFee,
      totalAmount
    });

    // Set phone number from user profile if available
    setPhoneNumber(user?.phone || "");
    
    setBooking(prev => ({
      ...prev,
      selectedTime
    }));

    setShowPaymentModal(true);
  };

  const checkPaymentStatus = async (bookingId: string) => {
    try {
      const res = await axios.get(
        `${baseUrl}/api/payments/status/${bookingId}`,
        { withCredentials: true }
      );
      
      return res.data;
    } catch (err) {
      console.error("Error checking payment status:", err);
      return null;
    }
  };

  const pollPaymentStatus = async (bookingId: string, maxAttempts = 30) => {
    setIsCheckingPayment(true);
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const status = await checkPaymentStatus(bookingId);
      
      if (status?.status === "COMPLETED" && status?.bookingStatus === "CONFIRMED") {
        setIsCheckingPayment(false);
        return true;
      } else if (status?.status === "FAILED") {
        setIsCheckingPayment(false);
        return false;
      }
    }
    
    setIsCheckingPayment(false);
    return false;
  };

  const handlePaymentSubmit = async () => {
    if (!booking.salon || !booking.service || !booking.slot || !booking.selectedTime) {
      alert("Missing booking information");
      return;
    }

    if (paymentMethod === "MPESA" && (!phoneNumber || phoneNumber.length < 10)) {
      alert("Please enter a valid phone number");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const slotDate = new Date(booking.slot.startTime).toISOString().split("T")[0];

      // Initiate payment with booking creation
      const paymentRes = await axios.post(
        `${baseUrl}/api/payments/initiate`,
        {
          salonId: booking.salon.id,
          salonServiceId: booking.service.id,
          slotDate,
          slotStartTime: booking.selectedTime,
          phoneNumber: paymentMethod === "MPESA" ? phoneNumber : undefined,
          paymentMethod
        },
        { withCredentials: true }
      );

      if (paymentRes.data.success) {
        const { bookingId, checkoutRequestId } = paymentRes.data;

        if (paymentMethod === "MPESA") {
          // For M-Pesa, poll for payment status
          setCheckoutRequestId(checkoutRequestId);
          alert("STK Push sent! Please enter your M-Pesa PIN on your phone.");
          
          const paymentSuccessful = await pollPaymentStatus(bookingId);
          
          if (paymentSuccessful) {
            // Payment confirmed - show success modal
            setBookingDetails({
              salon: booking.salon.name,
              service: booking.service.service.name,
              date: slotDate,
              time: booking.selectedTime,
            });
            
            setShowPaymentModal(false);
            setShowBookingPopup(true);

            // Refresh slots
            const slotsRes = await axios.get(
              `${baseUrl}/api/slots/salons/${booking.salon.id}`,
              { withCredentials: true }
            );
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
          } else {
            alert("Payment failed or timed out. Please try again.");
          }
        } else if (paymentMethod === "CASH") {
          // For cash, booking is confirmed immediately
          setBookingDetails({
            salon: booking.salon.name,
            service: booking.service.service.name,
            date: slotDate,
            time: booking.selectedTime,
          });
          
          setShowPaymentModal(false);
          setShowBookingPopup(true);

          // Refresh slots
          const slotsRes = await axios.get(
            `${baseUrl}/api/slots/salons/${booking.salon.id}`,
            { withCredentials: true }
          );
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
        }
      }

    } catch (err: any) {
      console.error("Payment/Booking error:", err.response?.data || err);
      alert(err.response?.data?.error || "Payment failed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const fetchSalonReviews = async () => {
    if (!selectedSalon) return;
    try {
      const res = await axios.get(`${baseUrl}/api/reviews/salon/${selectedSalon.id}`, { withCredentials: true });
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
                  <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                    {(salonRatings[salon.id] || 0).toFixed(1)}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400">{salon.city}, {salon.location}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 shadow-lg rounded-xl p-6">
          <button 
            onClick={goBackToSalons} 
            className="text-indigo-600 hover:underline mb-4 font-medium"
          >
            ← Back to Salons
          </button>

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
              <p className="text-gray-500 dark:text-gray-400">No gallery images available.</p>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">{selectedSalon.name}</h2>
            <p className="text-gray-600 dark:text-white mb-4">{selectedSalon.description}</p>
            <p className="text-gray-600 dark:text-white mb-4">{selectedSalon.phone}</p>

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
                <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
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
              <p className="text-gray-500 dark:text-gray-400">No services available.</p>
            ) : (
              <div className="grid gap-4">
                {services.map((salonService) => (
                  <div key={salonService.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <span className="font-medium text-lg">{salonService.service.name}</span>
                      <p className="text-gray-600 dark:text-gray-300">KSh {salonService.price} • {salonService.duration} minutes</p>
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
              <p className="text-gray-500 dark:text-gray-400">No slots available.</p>
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
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-96 max-h-96 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Choose Start Time</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
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
              className="mt-4 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-slate-200 border rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentDetails && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Payment Details</h2>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Salon</p>
                <p className="font-semibold text-gray-800 dark:text-white">{paymentDetails.salon}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Service</p>
                <p className="font-semibold text-gray-800 dark:text-white">{paymentDetails.service}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg flex justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {new Date(paymentDetails.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time</p>
                  <p className="font-semibold text-gray-800 dark:text-white">{paymentDetails.time}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Service Price</span>
                  <span className="font-medium text-gray-800 dark:text-white">KSh {paymentDetails.servicePrice}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Transaction Fee (2%)</span>
                  <span className="font-medium text-gray-800 dark:text-white">KSh {paymentDetails.transactionFee}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-800 dark:text-white">Total Amount</span>
                  <span className="text-blue-600 dark:text-blue-400">KSh {paymentDetails.totalAmount}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white dark:border-gray-700"
              >
                <option value="MPESA">M-Pesa</option>
                <option value="CASH">Cash (Pay at Salon)</option>
              </select>
            </div>

            {paymentMethod === "MPESA" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., 0712345678"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white dark:border-gray-700"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You will receive an STK push request on this number
                </p>
              </div>
            )}

            {isCheckingPayment && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                  ⏳ Waiting for payment confirmation...
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentDetails(null);
                }}
                disabled={isProcessingPayment || isCheckingPayment}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={isProcessingPayment || isCheckingPayment || (paymentMethod === "MPESA" && !phoneNumber)}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingPayment || isCheckingPayment ? "Processing..." : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation Popup */}
      {showBookingPopup && bookingDetails && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-6 text-green-600">🎉 Booking Confirmed!</h2>
            <div className="space-y-3 text-gray-700 dark:text-white">
              <p><strong>Salon:</strong> {bookingDetails.salon}</p>
              <p><strong>Service:</strong> {bookingDetails.service}</p>
              <p><strong>Date:</strong> {new Date(bookingDetails.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {bookingDetails.time}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              {paymentMethod === "MPESA" 
                ? "Payment successful! You will receive a confirmation SMS shortly." 
                : "Please pay at the salon when you arrive."}
            </p>
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
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Reviews for {selectedSalon?.name}</h2>
              <button 
                onClick={() => setShowReviewsModal(false)} 
                className="text-gray-500 dark:text-white hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            {salonReviews.length === 0 ? (
              <p className="text-gray-500 dark:text-white">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {salonReviews.map((review) => (
                  <div key={review.id} className="border-b pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <Review
                          filename={typeof review.images === 'string' ? review.images : undefined}
                          alt={`${review.clientName} | ${review.rating} stars`}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                          fallback="/images/default-salon.jpg"
                        />
                        <p className="font-semibold">{review.clientName}</p>
                      </div>
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
                    <p className="text-gray-700 dark:text-white">{review.comment}</p>
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