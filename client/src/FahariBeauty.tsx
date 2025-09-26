import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Star, MessageCircle, CreditCard, Bell, User, Search, Filter, Phone, CheckCircle, AlertCircle } from 'lucide-react';

const FahariBeauty = () => {
  const [currentPage, setCurrentPage] = useState('login');
  type Salon = {
    id: number;
    name: string;
    location: string;
    rating: number;
    reviews: number;
    image: string;
    services: { id: number; name: string; duration: number; price: number }[];
    availableSlots: string[];
    distance: string;
  };
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [selectedService, setSelectedService] = useState<{ id: number; name: string; duration: number; price: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  type ChatMessage = {
    type: 'user' | 'ai';
    message: string;
    timestamp: Date;
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  type User = {
    name: string;
    phone: string;
    email: string;
    salon?: string;
  } | null;
  const [user, setUser] = useState<User>(null);
  const [userType, setUserType] = useState('client');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    userType: 'client'
  });

  // Mock data for salon owners
  const salonOwnerData = {
    salon: {
      id: 1,
      name: "Elegance Hair Studio",
      location: "Nyeri Town",
      rating: 4.8,
      reviews: 127,
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop",
      owner: "Mary Wanjiku",
      phone: "+254712345678",
      email: "mary@elegancehair.com"
    },
    services: [
      { id: 1, name: "Hair Cut & Style", duration: 60, price: 800, active: true },
      { id: 2, name: "Hair Coloring", duration: 120, price: 2500, active: true },
      { id: 3, name: "Manicure", duration: 45, price: 500, active: true },
      { id: 4, name: "Pedicure", duration: 60, price: 700, active: false }
    ],
    todaysAppointments: [
      {
        id: 1,
        clientName: "Jane Doe",
        clientPhone: "+254798765432",
        service: "Hair Cut & Style",
        time: "09:00",
        status: "confirmed",
        price: 800
      },
      {
        id: 2,
        clientName: "Grace Mwangi",
        clientPhone: "+254765432198",
        service: "Hair Coloring",
        time: "10:30",
        status: "pending",
        price: 2500
      },
      {
        id: 3,
        clientName: "Alice Kamau",
        clientPhone: "+254721456789",
        service: "Manicure",
        time: "14:00",
        status: "confirmed",
        price: 500
      }
    ],
    analytics: {
      todayRevenue: 3800,
      weeklyRevenue: 24500,
      monthlyRevenue: 98000,
      totalAppointments: 127,
      averageRating: 4.8
    }
  };
  
  const salons = [
    {
      id: 1,
      name: "Elegance Hair Studio",
      location: "Nyeri Town",
      rating: 4.8,
      reviews: 127,
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop",
      services: [
        { id: 1, name: "Hair Cut & Style", duration: 60, price: 800 },
        { id: 2, name: "Hair Coloring", duration: 120, price: 2500 },
        { id: 3, name: "Manicure", duration: 45, price: 500 },
        { id: 4, name: "Pedicure", duration: 60, price: 700 }
      ],
      availableSlots: ["09:00", "10:30", "14:00", "15:30"],
      distance: "0.5 km"
    },
    {
      id: 2,
      name: "Glamour Beauty Lounge",
      location: "Kimathi Way",
      rating: 4.6,
      reviews: 89,
      image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=200&fit=crop",
      services: [
        { id: 1, name: "Facial Treatment", duration: 90, price: 1500 },
        { id: 2, name: "Eyebrow Threading", duration: 30, price: 300 },
        { id: 3, name: "Hair Wash & Blow Dry", duration: 45, price: 600 },
        { id: 4, name: "Massage", duration: 60, price: 1200 }
      ],
      availableSlots: ["10:00", "11:30", "13:00", "16:00"],
      distance: "1.2 km"
    }
  ];

  const appointments = [
    {
      id: 1,
      salon: "Elegance Hair Studio",
      service: "Hair Cut & Style",
      date: "2025-08-25",
      time: "10:30",
      status: "confirmed",
      price: 800
    },
    {
      id: 2,
      salon: "Glamour Beauty Lounge",
      service: "Facial Treatment",
      date: "2025-08-28",
      time: "14:00",
      status: "pending",
      price: 1500
    }
  ];
  const adminData = {
  users: [
    { id: 1, name: "Jane Wanjiku", role: "Client", email: "jane@example.com" },
    { id: 2, name: "Mary Wanjiku", role: "Salon Owner", email: "mary@elegancehair.com" },
    { id: 3, name: "Admin User", role: "Admin", email: "admin@faharibeauty.co.ke" },
  ],
  salons: [
    { id: 1, name: "Elegance Hair Studio", owner: "Mary Wanjiku", status: "Active" },
    { id: 2, name: "Glamour Beauty Lounge", owner: "Pauline Njeri", status: "Pending" },
  ],
  analytics: {
    totalUsers: 340,
    totalSalons: 56,
    totalBookings: 1280,
    totalRevenue: 1450000,
  }
};

  useEffect(() => {
    if (isLoggedIn && userType === 'client') {
      setUser({
        name: "Jane Wanjiku",
        phone: "+254712345678",
        email: "jane@example.com"
      });

      setChatMessages([
        {
          type: 'ai',
          message: "Hello! I'm your Fahari Beauty assistant. I can help you find the perfect salon, book appointments, and answer any questions. What would you like to do today?",
          timestamp: new Date()
        }
      ]);
    } else if (isLoggedIn && userType === 'salon_owner') {
      setUser({
        name: salonOwnerData.salon.owner,
        phone: salonOwnerData.salon.phone,
        email: salonOwnerData.salon.email,
        salon: salonOwnerData.salon.name
      });
    }
  }, [isLoggedIn, userType]);

const handleLogin = (e: { preventDefault: () => void; }) => {
  e.preventDefault();
  if (loginForm.username.toLowerCase().trim() === 'admin' && loginForm.password.toLowerCase().trim() === 'admin') {
    setUserType(loginForm.userType);
    setIsLoggedIn(true);

    let newPage = 'home';
    if (loginForm.userType === 'salon_owner') newPage = 'salon-dashboard';
    if (loginForm.userType === 'admin') newPage = 'admin-dashboard';

    setCurrentPage(newPage);
  } else {
    alert('Invalid credentials. Please use username: admin, password: admin');
  }
};


  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentPage('login');
    setLoginForm({ username: '', password: '', userType: 'client' });
  };

  const handleChatSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      type: 'user',
      message: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      let aiResponse = "";
      const input = chatInput.toLowerCase();
      
      if (input.includes('book') || input.includes('appointment')) {
        aiResponse = "I'd be happy to help you book an appointment! Based on your location in Nyeri, I recommend checking out Elegance Hair Studio - they have excellent ratings and availability today. What type of service are you looking for?";
      } else if (input.includes('recommend') || input.includes('best')) {
        aiResponse = "Based on your preferences and current availability, I recommend Elegance Hair Studio. They have a 4.8-star rating, are only 0.5km away, and have slots available at 2:00 PM and 3:30 PM today. Would you like me to help you book?";
      } else {
        aiResponse = "I understand you're looking for help with salon services. I can assist you with finding salons, booking appointments, checking availability, and answering questions about services and prices. What specific help do you need?";
      }

      setChatMessages(prev => [...prev, {
        type: 'ai',
        message: aiResponse,
        timestamp: new Date()
      }]);
    }, 1000);

    setChatInput('');
  };

  const handleBooking = () => {
    if (!selectedService || !selectedTime) {
      alert('Please select a service and time slot');
      return;
    }
    setCurrentPage('payment');
  };

  const handlePayment = () => {
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('success');
      setTimeout(() => {
        setCurrentPage('confirmation');
      }, 2000);
    }, 3000);
  };

  const filteredSalons = salons.filter(salon => {
    const matchesSearch = salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         salon.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = filterLocation === 'all' || salon.location.toLowerCase().includes(filterLocation.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Fahari Beauty</h1>
            </div>
            <p className="text-gray-600">Welcome back! Please sign in to continue.</p>
          </div>

          <div onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="Enter username"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="Enter password"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Login as:</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="client"
                    checked={loginForm.userType === 'client'}
                    onChange={(e) => setLoginForm({...loginForm, userType: e.target.value})}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-gray-700">Client</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="salon_owner"
                    checked={loginForm.userType === 'salon_owner'}
                    onChange={(e) => setLoginForm({...loginForm, userType: e.target.value})}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-gray-700">Salon Owner</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="admin"
                    checked={loginForm.userType === 'admin'}
                    onChange={(e) => setLoginForm({...loginForm, userType: e.target.value})}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-gray-700">Admin</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleLogin}
              type="button"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
            >
              Sign In
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center mb-2">Demo Credentials:</p>
            <div className="text-xs text-gray-500 text-center">
              Username: <span className="font-mono bg-white px-1 rounded">admin</span><br/>
              Password: <span className="font-mono bg-white px-1 rounded">admin</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main App Content
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold">Fahari Beauty</span>
            </div>

            {/* Centered Navigation */}
            <div className="flex items-center gap-6 text-lg font-medium">
              {userType === 'client' && (
                <>
                  <button
                    onClick={() => setCurrentPage('home')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'home' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setCurrentPage('salons')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'salons' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Salons
                  </button>
                  <button
                    onClick={() => setCurrentPage('appointments')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'appointments' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Appointments
                  </button>
                  <button
                    onClick={() => setCurrentPage('chat')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'chat' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    AI Chat
                  </button>
                </>
              )}

              {userType === 'salon_owner' && (
                <>
                  <button
                    onClick={() => setCurrentPage('salon-dashboard')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'salon-dashboard' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setCurrentPage('salon-services')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'salon-services' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Services
                  </button>
                  <button
                    onClick={() => setCurrentPage('salon-appointments')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'salon-appointments' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Appointments
                  </button>
                </>
              )}

              {userType === 'admin' && (
                <>
                  <button
                    onClick={() => setCurrentPage('admin-dashboard')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'admin-dashboard' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setCurrentPage('manage-users')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'manage-users' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setCurrentPage('manage-salons')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'manage-salons' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Salons
                  </button>
                  <button
                    onClick={() => setCurrentPage('platform-analytics')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 'platform-analytics' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Analytics
                  </button>
                </>
              )}
            </div>

            {/* Right Profile + Logout */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <User className="text-gray-500" size={22} />
                  <span className="text-base font-medium">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>



      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Pages */}
        {userType === 'client' && currentPage === 'home' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 rounded-2xl">
              <h1 className="text-3xl font-bold mb-4">Welcome to Fahari Beauty</h1>
              <p className="text-lg mb-6">Your intelligent salon booking assistant. Find, book, and pay for salon services with ease.</p>
              <button 
                onClick={() => setCurrentPage('salons')}
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Book Now
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 p-6 rounded-xl text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{salons.length}</div>
                <div className="text-gray-600">Partner Salons</div>
              </div>
              <div className="bg-yellow-50 p-6 rounded-xl text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">24/7</div>
                <div className="text-gray-600">AI Support</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">M-Pesa</div>
                <div className="text-gray-600">Secure Payments</div>
              </div>
            </div>

            {appointments.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-xl font-bold mb-4">Your Upcoming Appointments</h2>
                <div className="space-y-3">
                  {appointments.slice(0, 2).map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{apt.salon}</div>
                        <div className="text-sm text-gray-600">{apt.service} - {apt.date} at {apt.time}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {apt.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {userType === 'client' && currentPage === 'salons' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search salons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="text-gray-400" size={20} />
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Locations</option>
                  <option value="nyeri">Nyeri Town</option>
                  <option value="kimathi">Kimathi Way</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSalons.map(salon => (
                <div key={salon.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => {
                       setSelectedSalon(salon);
                       setCurrentPage('booking');
                     }}>
                  <img src={salon.image} alt={salon.name} className="w-full h-48 object-cover rounded-t-xl" />
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{salon.name}</h3>
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <MapPin size={16} />
                      <span className="text-sm">{salon.location} • {salon.distance}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center">
                        <Star className="text-yellow-400 fill-current" size={16} />
                        <span className="ml-1 font-medium">{salon.rating}</span>
                      </div>
                      <span className="text-gray-500 text-sm">({salon.reviews} reviews)</span>
                    </div>
                    <div className="text-sm font-medium text-green-600 mb-2">
                      {salon.availableSlots.length} slots available today
                    </div>
                    <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Salon Owner Dashboard */}
        {userType === 'salon_owner' && currentPage === 'salon-dashboard' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 rounded-2xl">
              <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
              <p className="text-lg mb-4">{salonOwnerData.salon.name} Dashboard</p>
              <p className="text-purple-100">Manage your appointments, services, and track your business performance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today's Revenue</p>
                    <p className="text-2xl font-bold text-green-600">KES {salonOwnerData.analytics.todayRevenue.toLocaleString()}</p>
                  </div>
                  <CreditCard className="text-green-600" size={32} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today's Appointments</p>
                    <p className="text-2xl font-bold text-blue-600">{salonOwnerData.todaysAppointments.length}</p>
                  </div>
                  <Calendar className="text-blue-600" size={32} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Rating</p>
                    <p className="text-2xl font-bold text-yellow-600">{salonOwnerData.analytics.averageRating}</p>
                  </div>
                  <Star className="text-yellow-600" size={32} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">KES {(salonOwnerData.analytics.monthlyRevenue / 1000).toFixed(0)}K</p>
                  </div>
                  <CreditCard className="text-purple-600" size={32} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-bold mb-6">Today's Appointments</h2>
              <div className="space-y-4">
                {salonOwnerData.todaysAppointments.map(appointment => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <div className="font-medium">{appointment.clientName}</div>
                        <div className="text-sm text-gray-600">{appointment.service}</div>
                        <div className="text-sm text-gray-500">{appointment.clientPhone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">KES {appointment.price.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{appointment.time}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        appointment.status === 'confirmed' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {appointment.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {userType === 'salon_owner' && currentPage === 'salon-services' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Services</h2>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Add New Service
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {salonOwnerData.services.map(service => (
                <div key={service.id} className="bg-white rounded-xl p-6 shadow-sm border">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{service.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {service.duration} mins
                        </div>
                        <div className="font-bold text-purple-600">
                          KES {service.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm ${
                      service.active 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {service.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                      Edit
                    </button>
                    <button className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      service.active
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}>
                      {service.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {userType === 'salon_owner' && currentPage === 'salon-appointments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">All Appointments</h2>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex gap-4 mb-6">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-4">
                {salonOwnerData.todaysAppointments.map(appointment => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="text-purple-600" size={18} />
                      </div>
                      <div>
                        <div className="font-medium">{appointment.clientName}</div>
                        <div className="text-sm text-gray-600">{appointment.service}</div>
                        <div className="text-sm text-gray-500">{appointment.time}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold">KES {appointment.price.toLocaleString()}</div>
                        <div className={`text-sm px-2 py-1 rounded-full ${
                          appointment.status === 'confirmed' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {appointment.status}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors text-sm">
                          Edit
                        </button>
                        <button className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Admin Dashboard */}
        {userType === 'admin' && currentPage === 'admin-dashboard' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 rounded-2xl">
              <h1 className="text-3xl font-bold mb-2">Welcome, Admin!</h1>
              <p className="text-lg mb-4">Fahari Beauty Management Console</p>
              <p className="text-purple-100">Manage users, salons, and view platform analytics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div onClick={() => setCurrentPage('manage-users')} className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md">
                <h2 className="text-xl font-bold mb-2">Manage Users</h2>
                <p className="text-gray-600">View, edit, and remove platform users.</p>
              </div>
              <div onClick={() => setCurrentPage('manage-salons')} className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md">
                <h2 className="text-xl font-bold mb-2">Manage Salons</h2>
                <p className="text-gray-600">Approve or suspend salon accounts.</p>
              </div>
              <div onClick={() => setCurrentPage('platform-analytics')} className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md">
                <h2 className="text-xl font-bold mb-2">Platform Analytics</h2>
                <p className="text-gray-600">Track overall bookings and revenue.</p>
              </div>
            </div>
          </div>
        )}
        {/* Manage Users Page */}
        {userType === 'admin' && currentPage === 'manage-users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Manage Users</h2>
            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3">ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.users.map(user => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{user.id}</td>
                      <td className="p-3">{user.name}</td>
                      <td className="p-3">{user.role}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3 space-x-2">
                        <button className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded">Edit</button>
                        <button className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 🔹 Manage Salons Page */}
        {userType === 'admin' && currentPage === 'manage-salons' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Manage Salons</h2>
            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3">ID</th>
                    <th className="p-3">Salon Name</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.salons.map(salon => (
                    <tr key={salon.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{salon.id}</td>
                      <td className="p-3">{salon.name}</td>
                      <td className="p-3">{salon.owner}</td>
                      <td className="p-3">{salon.status}</td>
                      <td className="p-3 space-x-2">
                        <button className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded">Approve</button>
                        <button className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded">Suspend</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 🔹 Platform Analytics Page */}
        {userType === 'admin' && currentPage === 'platform-analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Platform Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-purple-600">{adminData.analytics.totalUsers}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                <p className="text-sm text-gray-600">Total Salons</p>
                <p className="text-2xl font-bold text-pink-600">{adminData.analytics.totalSalons}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-green-600">{adminData.analytics.totalBookings}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">KES {adminData.analytics.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
    

        {/* Client booking flow */}
        {userType === 'client' && currentPage === 'booking' && selectedSalon && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start gap-4 mb-6">
                <img src={selectedSalon.image} alt={selectedSalon.name} className="w-20 h-20 object-cover rounded-lg" />
                <div>
                  <h2 className="text-2xl font-bold">{selectedSalon.name}</h2>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <MapPin size={16} />
                    <span>{selectedSalon.location}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="text-yellow-400 fill-current" size={16} />
                    <span className="font-medium">{selectedSalon.rating}</span>
                    <span className="text-gray-500">({selectedSalon.reviews} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold mb-4">Select Service</h3>
                  <div className="space-y-3">
                    {selectedSalon.services.map(service => (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedService?.id === service.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{service.name}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <Clock size={14} />
                              {service.duration} minutes
                            </div>
                          </div>
                          <div className="text-lg font-bold text-purple-600">
                            KES {service.price.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">Select Date & Time</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Available Time Slots</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedSalon.availableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`p-3 border rounded-lg text-sm font-medium transition-all ${
                            selectedTime === slot
                              ? 'border-purple-500 bg-purple-500 text-white'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedService && selectedTime && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium mb-2">Booking Summary</h4>
                      <div className="text-sm space-y-1">
                        <div>Service: {selectedService.name}</div>
                        <div>Duration: {selectedService.duration} minutes</div>
                        <div>Date: {selectedDate}</div>
                        <div>Time: {selectedTime}</div>
                        <div className="font-bold text-purple-600">Total: KES {selectedService.price.toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleBooking}
                    disabled={!selectedService || !selectedTime}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {userType === 'client' && currentPage === 'payment' && (
          <div className="max-w-md mx-auto bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-2xl font-bold mb-6 text-center">M-Pesa Payment</h2>
            
            {paymentStatus === '' && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium mb-3">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Service:</span>
                      <span>{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date & Time:</span>
                      <span>{selectedDate} at {selectedTime}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>KES {selectedService?.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+254712345678"
                    defaultValue={user?.phone}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <button
                  onClick={handlePayment}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard size={20} />
                  Pay with M-Pesa
                </button>
              </>
            )}

            {paymentStatus === 'processing' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium mb-2">Processing Payment</h3>
                <p className="text-gray-600">Please check your phone for the M-Pesa prompt and enter your PIN</p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="text-center py-8">
                <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
                <h3 className="text-lg font-medium mb-2">Payment Successful!</h3>
                <p className="text-gray-600">Your appointment has been confirmed</p>
              </div>
            )}
          </div>
        )}

        {userType === 'client' && currentPage === 'confirmation' && (
          <div className="max-w-md mx-auto bg-white rounded-xl p-6 shadow-sm border">
            <div className="text-center mb-6">
              <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-gray-600">Your appointment has been successfully booked</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h3 className="font-bold mb-3">Appointment Details</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Salon:</strong> {selectedSalon?.name}</div>
                <div><strong>Service:</strong> {selectedService?.name}</div>
                <div><strong>Date:</strong> {selectedDate}</div>
                <div><strong>Time:</strong> {selectedTime}</div>
                <div><strong>Duration:</strong> {selectedService?.duration} minutes</div>
                <div><strong>Amount Paid:</strong> KES {selectedService?.price.toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Bell size={16} />
                <span>You'll receive reminders 24hrs and 1hr before your appointment</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={16} />
                <span>The salon will contact you if any changes are needed</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => setCurrentPage('home')}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Back to Home
              </button>
              <button
                onClick={() => setCurrentPage('appointments')}
                className="w-full border border-purple-600 text-purple-600 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                View All Appointments
              </button>
            </div>
          </div>
        )}

        {userType === 'client' && currentPage === 'chat' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl p-6 shadow-sm border h-96 flex flex-col">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <MessageCircle className="text-purple-600" size={24} />
              <h2 className="text-xl font-bold">Fahari Beauty Assistant</h2>
              <div className="ml-auto flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Online
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.type === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleChatSubmit} className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask me anything about salon bookings..."
                className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {userType === 'client' && currentPage === 'appointments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Appointments</h2>
            
            <div className="space-y-4">
              {appointments.map(apt => (
                <div key={apt.id} className="bg-white rounded-xl p-6 shadow-sm border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{apt.salon}</h3>
                      <p className="text-gray-600">{apt.service}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {apt.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {apt.time}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm mb-2 ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {apt.status}
                      </div>
                      <div className="text-lg font-bold">KES {apt.price.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      Reschedule
                    </button>
                    <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="text-xl font-bold">Fahari Beauty</span>
              </div>
              <p className="text-gray-600 text-sm">
                Your intelligent salon booking assistant. Making beauty appointments effortless across Kenya.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Services</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>AI-Powered Booking</li>
                <li>M-Pesa Integration</li>
                <li>Real-time Scheduling</li>
                <li>Appointment Reminders</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Nyeri, Kenya</li>
                <li>+254 706520320</li>
                <li>fahari.ai2025@gmail.com</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center">
            <p className="text-gray-600 text-sm">
              © 2025 Fahari Beauty. All rights reserved. | Powered by AI & M-Pesa
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FahariBeauty;