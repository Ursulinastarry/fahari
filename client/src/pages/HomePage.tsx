import { Star, MessageCircle, Scissors, Smartphone, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-50 text-gray-800">
      {/* Hero Section */}
      <section
  className="flex flex-col items-center justify-center text-center py-24 px-6 bg-cover bg-center relative"
  style={{ backgroundImage: "url('/images/blur-gym-fitness.jpg')" }}
>
  {/* Overlay for readability */}
  <div className="absolute inset-0 bg-black/40"></div>

  {/* Content on top of overlay */}
  <div className="relative z-10">
    <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 text-white">
      Book Smarter. <br /> Glow Brighter.
    </h1>
    <p className="text-lg md:text-xl text-gray-200 dark:text-slate-300 max-w-2xl mb-8">
      Let <span className="font-semibold text-pink-300">Fahari AI</span>{" "}
      guide you to the perfect salon experience—fast, simple, and stress-free.
    </p>
    <div className="flex flex-col md:flex-row gap-4 justify-center">
    <button className="px-8 py-4 bg-pink-600 text-white rounded-2xl shadow-lg hover:bg-pink-700 transition flex items-center gap-2">
      <MessageCircle className="w-5 h-5" />
      Start with AI Assistant
    </button>
    <br />
    <button
  onClick={() =>{user&&( navigate("/create-salon"));(navigate("/login"))}}
  className="px-8 py-4 bg-pink-600 text-white rounded-2xl shadow-lg hover:bg-pink-700 transition flex items-center gap-2"
>
  <MessageCircle className="w-5 h-5" />
  Register your salon
</button>

    </div>
  </div>
</section>


      {/* How It Works */}
      <section className="grid md:grid-cols-3 gap-8 px-10 py-20 bg-white dark:bg-slate-800 shadow-inner">
        {[
          {
            icon: <MessageCircle className="w-10 h-10 text-pink-600" />,
            title: "Tell AI Your Needs",
            desc: "Chat with Fahari AI and describe your service.",
          },
          {
            icon: <Clock className="w-10 h-10 text-pink-600" />,
            title: "Get Recommendations",
            desc: "AI finds the right salon and available slots.",
          },
          {
            icon: <Smartphone className="w-10 h-10 text-pink-600" />,
            title: "Book & Pay",
            desc: "Confirm instantly with M-Pesa and get reminders.",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-8 bg-pink-50 rounded-2xl shadow hover:shadow-md transition flex flex-col items-center text-center"
          >
            {item.icon}
            <h3 className="text-xl font-semibold mt-4 mb-2">{item.title}</h3>
            <p className="text-gray-600  dark:text-slate-300">{item.desc}</p>
          </div>
        ))}
      </section>

      

      {/* Why Fahari AI */}
      <section className="bg-pink-600 text-white py-20 px-10">
        <h2 className="text-3xl font-bold text-center mb-10">Why Choose Fahari AI?</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            {
              icon: <Scissors className="w-10 h-10 mx-auto" />,
              title: "Smart AI Recommendations",
              desc: "Get matched with the right salon in seconds.",
            },
            {
              icon: <Smartphone className="w-10 h-10 mx-auto" />,
              title: "Secure Payments",
              desc: "Pay instantly and securely with M-Pesa.",
            },
            {
              icon: <Clock className="w-10 h-10 mx-auto" />,
              title: "Personalized Reminders",
              desc: "Never miss your appointment again.",
            },
          ].map((item, idx) => (
            <div key={idx} className="p-6">
              {item.icon}
              <h3 className="text-xl font-semibold mt-4 mb-2">{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-10">
        <h2 className="text-3xl font-bold text-center mb-10">What Our Clients Say</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              name: "Jane Mwangi",
              text: "Booking with Fahari AI was so easy. The reminders saved me from missing my appointment!",
            },
            {
              name: "Amina Ali",
              text: "I love how the AI understood exactly what I needed. Truly a game changer!",
            },
          ].map((review, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow hover:shadow-md transition"
            >
              <p className="text-gray-600  dark:text-slate-300 italic mb-4">"{review.text}"</p>
              <h4 className="font-semibold">{review.name}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center bg-gradient-to-r from-pink-600 to-pink-600 text-white">
        <h2 className="text-4xl font-bold mb-6">
          Ready to book your glow-up?
        </h2>
        <button className="px-8 py-4 bg-white dark:bg-slate-800 text-pink-700 rounded-2xl shadow-lg hover:bg-gray-100 transition">
          Start with AI Assistant
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 text-gray-600  dark:text-slate-400 py-10 text-center">
  <p className="text-sm mb-4">
    © {new Date().getFullYear()} Fahari AI Salon Booking. All rights reserved.
  </p>
  <div className="flex flex-col md:flex-row justify-center gap-6 text-sm">
    <p><strong>Phone:</strong> +254 706 520320</p>
    <p><strong>Email:</strong> help@faharibeauty.com</p>
    <p><strong>Location:</strong> Nyeri, Kenya</p>
  </div>
</footer>

    </div>
  );
}
