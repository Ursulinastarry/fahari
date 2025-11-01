// src/pages/owner/ReviewsPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Star } from "lucide-react"; // star icon
import Review from "../Review";
interface Review {
  id: string;
  clientName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  images?: string | string[]; // image filenames
}

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    axios
      .get("https://fahari-j7ac.onrender.com/api/reviews/owner", { withCredentials: true })
      .then((res) => setReviews(res.data))
      .catch((err) => console.error("Error fetching reviews:", err));
  }, []);

  // Compute average rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "0";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">⭐ Customer Reviews</h1>

      {/* Summary */}
      <div className="bg-white dark:bg-black shadow rounded-xl p-6 mb-6 flex items-center gap-6">
        <div>
          <p className="text-lg font-semibold">Average Rating</p>
          <div className="flex items-center mt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-6 w-6 ${
                  i < Math.round(Number(avgRating))
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="ml-3 text-lg font-bold">{avgRating}/5</span>
          </div>
        </div>
        <p className="text-gray-600 dark:text-white">{reviews.length} total reviews</p>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
  {reviews.map((review) => (
    <div
      key={review.id}
      className="bg-white dark:bg-black shadow rounded-lg p-4 flex justify-between items-start gap-4"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Review
                filename={typeof review.images === 'string' ? review.images : undefined}
                alt={review.clientName}
                className="w-full h-40 object-cover rounded-lg mb-3"
                fallback="/images/default-salon.jpg"
              />
          <p className="font-semibold">{review.clientName}</p>
        </div>

        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
              }`}
            />
          ))}
        </div>

        <p className="text-gray-700 dark:text-white">{review.comment}</p>
      </div>

      <p className="text-xs text-gray-500 dark:text-white">
        {new Date(review.createdAt).toLocaleDateString()}
      </p>
    </div>
  ))}

  {reviews.length === 0 && (
    <p className="text-gray-500 dark:text-white text-center">No reviews yet.</p>
  )}
</div>
    </div>
  );
};

export default ReviewsPage;
