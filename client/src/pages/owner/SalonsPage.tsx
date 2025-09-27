// src/components/SalonOwnerSalons.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import SalonImage from "../SalonImage"; // Import the SalonImage component

type Salon = {
  id: string;
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  location: string;
  businessHours: string;
  profileImage?: string | File;
  coverImage?: string | File;
  gallery: (string | File)[];
};

const API_BASE = "http://localhost:4000"; // update for prod

const SalonOwnerSalons: React.FC = () => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);

  // fetch salons owned by logged-in user
  const fetchSalons = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/salons/owner/me`, {
        withCredentials: true
      });
      setSalons(data);
    } catch (err) {
      console.error("Error fetching salons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalons();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this salon?")) return;
    try {
      await axios.delete(`${API_BASE}/api/salons/${id}`, { withCredentials: true });
      setSalons((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSalon) return;

    try {
      const formData = new FormData();

      // Append normal fields
      formData.append("name", selectedSalon.name || "");
      formData.append("description", selectedSalon.description || "");
      formData.append("email", selectedSalon.email || "");
      formData.append("phone", selectedSalon.phone || "");
      formData.append("address", selectedSalon.address || "");
      formData.append("city", selectedSalon.city || "");
      formData.append("location", selectedSalon.location || "");
      formData.append("businessHours", selectedSalon.businessHours || "");

      // Append files if any
      if (selectedSalon.profileImage instanceof File) {
        formData.append("profileImage", selectedSalon.profileImage);
      }
      if (selectedSalon.coverImage instanceof File) {
        formData.append("coverImage", selectedSalon.coverImage);
      }
      if (galleryFiles) {
        Array.from(galleryFiles).forEach((file) => {
          formData.append("gallery", file);
        });
      }

      let data: Salon;
      if (selectedSalon.id) {
        // Update salon
        const res = await axios.put(
          `${API_BASE}/api/salons/${selectedSalon.id}`, 
          formData,
          { 
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" }
          },
        );
        data = res.data;

        setSalons((prev) =>
          prev.map((s) => (s.id === data.id ? data : s))
        );
      } else {
        // Create salon
        const res = await axios.post(
          `${API_BASE}/api/salons`,
          formData,
          { 
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" } 
          }
        );
        data = res.data;

        setSalons((prev) => [...prev, data]);
      }

      setFormOpen(false);
      setSelectedSalon(null);
      setGalleryFiles(null);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage My Salons</h1>
        <button
          onClick={() => {
            navigate('/create-salon');
          }}
          className="bg-blue-500 text-white rounded-lg px-4 py-2"
        >
          + Add Salon
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p>Loading salons...</p>
      ) : salons.length === 0 ? (
        <p>No salons yet. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salons.map((salon) => (
            <div key={salon.id} className="bg-white shadow rounded-lg p-4">
              <SalonImage
                filename={typeof salon.coverImage === 'string' ? salon.coverImage : undefined}
                alt={salon.name}
                className="w-full h-40 object-cover rounded-lg mb-3"
                fallback="/images/default-salon.jpg"
onClick={() => navigate(`/salon-services/${salon.id}`)}
              />
              <h2 className="font-semibold text-lg">{salon.name}</h2>
              <p className="text-sm text-gray-600 mb-2">{salon.city}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedSalon(salon);
                    setFormOpen(true);
                  }}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(salon.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {formOpen && selectedSalon && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">
              {selectedSalon.id ? "Edit Salon" : "Create Salon"}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              {/* text fields */}
              {[
                "name",
                "description",
                "email",
                "phone",
                "address",
                "city",
                "location",
                "businessHours",
              ].map((field) => (
                <input
                  key={field}
                  type="text"
                  placeholder={field}
                  value={(selectedSalon as any)[field] || ""}
                  onChange={(e) =>
                    setSelectedSalon({
                      ...selectedSalon,
                      [field]: e.target.value,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              ))}

              {/* profile image */}
              <div>
                <label className="block font-medium mb-2">Profile Image</label>
                {selectedSalon.profileImage && typeof selectedSalon.profileImage === 'string' && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">Current profile image:</p>
                    <SalonImage
                      filename={selectedSalon.profileImage}
                      alt="Current profile"
                      className="w-20 h-20 object-cover rounded"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedSalon({
                        ...selectedSalon,
                        profileImage: e.target.files[0] as any,
                      });
                    }
                  }}
                  className="w-full"
                />
                {selectedSalon.profileImage instanceof File && (
                  <p className="text-sm text-green-600 mt-1">
                    New file selected: {selectedSalon.profileImage.name}
                  </p>
                )}
              </div>

              {/* cover image */}
              <div>
                <label className="block font-medium mb-2">Cover Image</label>
                {selectedSalon.coverImage && typeof selectedSalon.coverImage === 'string' && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">Current cover image:</p>
                    <SalonImage
                      filename={selectedSalon.coverImage}
                      alt="Current cover"
                      className="w-32 h-20 object-cover rounded"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedSalon({
                        ...selectedSalon,
                        coverImage: e.target.files[0] as any,
                      });
                    }
                  }}
                  className="w-full"
                />
                {selectedSalon.coverImage instanceof File && (
                  <p className="text-sm text-green-600 mt-1">
                    New file selected: {selectedSalon.coverImage.name}
                  </p>
                )}
              </div>

              {/* gallery */}
              <div>
                <label className="block font-medium mb-2">Gallery Images</label>
                {selectedSalon.gallery && selectedSalon.gallery.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">Current gallery images:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSalon.gallery
                        .filter(img => typeof img === 'string')
                        .map((img, index) => (
                          <SalonImage
                            key={index}
                            filename={img as string}
                            alt={`Gallery ${index + 1}`}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ))}
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setGalleryFiles(e.target.files)}
                  className="w-full"
                />
                {galleryFiles && galleryFiles.length > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {galleryFiles.length} new file(s) selected
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setSelectedSalon(null);
                    setGalleryFiles(null);
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonOwnerSalons;