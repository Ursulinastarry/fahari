import React, { useEffect, useState } from "react";
import axios from "axios";

interface Salon {
  id: string;
  name: string;
  description?: string;
  city: string;
  location: string;
  profileImage?: string;
}

const SalonsPage: React.FC = () => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; total: number }>>({});
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/salons");
        setSalons(res.data.salons);

        // 🔥 fetch ratings for each salon
        res.data.salons.forEach(async (salon: Salon) => {
          try {
            const ratingRes = await axios.get(`http://localhost:4000/api/reviews/${salon.id}/rating`);
            setRatings(prev => ({
              ...prev,
              [salon.id]: { avg: ratingRes.data.averageRating, total: ratingRes.data.totalReviews }
            }));
          } catch (err) {
            console.error("Error fetching rating:", err);
          }
        });
      } catch (err) {
        console.error("Error fetching salons:", err);
      }
    };
    fetchSalons();
  }, []);

  const fetchSalonDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:4000/api/salons/${id}`);
      setSelectedSalon(res.data);
      setServices(res.data.salonServices.map((s: any) => ({
      id: s.service.id,
      name: s.service.name,
      price: s.price
       })));
      setReviews(res.data.reviews);
    } catch (err) {
      console.error("Error fetching salon details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {!selectedSalon ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {salons.map((salon) => (
            <div
              key={salon.id}
              onClick={() => fetchSalonDetails(salon.id)}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer"
            >
              <img
                src={salon.profileImage || "https://via.placeholder.com/300"}
                alt={salon.name}
                className="rounded-lg mb-4 w-full h-40 object-cover"
              />
              <h2 className="text-xl font-semibold text-gray-700">{salon.name}</h2>
              <p className="text-gray-500">{salon.city}, {salon.location}</p>
              <p className="text-sm text-yellow-500 font-medium mt-2">
                ⭐ {ratings[salon.id]?.avg ?? 0} ({ratings[salon.id]?.total ?? 0} reviews)
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl p-6">
          <button
            onClick={() => setSelectedSalon(null)}
            className="text-indigo-600 hover:underline mb-4"
          >
            ← Back to salons
          </button>
          <h2 className="text-2xl font-bold">{selectedSalon.name}</h2>
          <p className="text-gray-600">{selectedSalon.description}</p>

          <h3 className="mt-6 font-semibold text-lg">Services</h3>
            <ul className="list-disc ml-6 text-gray-700">
            {services.map((s) => (
                <li key={s.id}>
                {s.name} – ksh{s.price}
                </li>
            ))}
            </ul>


          <h3 className="mt-6 font-semibold text-lg">Reviews</h3>
          {reviews.length === 0 ? (
            <p className="text-gray-500">No reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="border-b py-2">
                <p className="font-medium">{r.client.firstName} {r.client.lastName}</p>
                <p className="text-sm text-yellow-500">⭐ {r.rating}</p>
                <p className="text-gray-600">{r.comment}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SalonsPage;
