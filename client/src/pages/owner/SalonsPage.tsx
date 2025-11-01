// src/components/SalonOwnerSalons.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import SalonImage from "../SalonImage";
import { Camera, Upload, X } from "lucide-react";

type Salon = {
  id: string;
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  location: string;
  businessHours: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  profileImage?: string | File;
  coverImage?: string | File;
  gallery: (string | File)[];
};

const API_BASE = "https://fahari-j7ac.onrender.com";

const SalonOwnerSalons: React.FC = () => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Preview states
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);

  const navigate = useNavigate();

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

  const handleEditClick = (salon: Salon) => {
    setSelectedSalon(salon);
    setError("");
    
    // Set existing image previews
    if (salon.profileImage && typeof salon.profileImage === 'string') {
      setProfilePreview(`${API_BASE}/uploads/${salon.profileImage}`);
    }
    if (salon.coverImage && typeof salon.coverImage === 'string') {
      setCoverPreview(`${API_BASE}/uploads/${salon.coverImage}`);
    }
    if (salon.gallery && salon.gallery.length > 0) {
      const existingPreviews = salon.gallery
        .filter(img => typeof img === 'string')
        .map(img => `${API_BASE}/uploads/${img}`);
      setGalleryPreviews(existingPreviews);
    }
    
    setFormOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedSalon(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setSelectedSalon(prev => prev ? {
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    } : null);
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedSalon(prev => prev ? { ...prev, profileImage: file } : null);
      const reader = new FileReader();
      reader.onload = () => setProfilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedSalon(prev => prev ? { ...prev, coverImage: file } : null);
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const currentTotal = galleryPreviews.length;
      const newFiles = [...newGalleryFiles, ...files].slice(0, 10 - currentTotal);
      setNewGalleryFiles(newFiles);
      
      const newPreviews = [...galleryPreviews];
      files.forEach(file => {
        if (newPreviews.length < 10) {
          const reader = new FileReader();
          reader.onload = () => {
            newPreviews.push(reader.result as string);
            setGalleryPreviews([...newPreviews]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    const newPreviews = galleryPreviews.filter((_, i) => i !== index);
    setGalleryPreviews(newPreviews);
    
    // Also remove from new files if it's a new upload
    if (selectedSalon && index >= (selectedSalon.gallery?.length || 0)) {
      const fileIndex = index - (selectedSalon.gallery?.length || 0);
      const newFiles = newGalleryFiles.filter((_, i) => i !== fileIndex);
      setNewGalleryFiles(newFiles);
    }
  };

  const removeProfileImage = () => {
    setSelectedSalon(prev => prev ? { ...prev, profileImage: undefined } : null);
    setProfilePreview("");
  };

  const removeCoverImage = () => {
    setSelectedSalon(prev => prev ? { ...prev, coverImage: undefined } : null);
    setCoverPreview("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;

    // Validation
    if (!selectedSalon.name.trim()) {
      setError("Salon name is required.");
      return;
    }
    if (!selectedSalon.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!selectedSalon.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    setSaveLoading(true);
    setError('');

    try {
      const formData = new FormData();

      formData.append("name", selectedSalon.name);
      formData.append("description", selectedSalon.description);
      formData.append("email", selectedSalon.email);
      formData.append("phone", selectedSalon.phone);
      formData.append("address", selectedSalon.address);
      formData.append("city", selectedSalon.city);
      formData.append("location", selectedSalon.location);
      formData.append("businessHours", JSON.stringify(selectedSalon.businessHours));

      if (selectedSalon.profileImage instanceof File) {
        formData.append("profileImage", selectedSalon.profileImage);
      }
      if (selectedSalon.coverImage instanceof File) {
        formData.append("coverImage", selectedSalon.coverImage);
      }
      
      newGalleryFiles.forEach((file) => {
        formData.append("gallery", file);
      });

      const res = await axios.put(
        `${API_BASE}/api/salons/${selectedSalon.id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      setSalons((prev) => prev.map((s) => (s.id === res.data.id ? res.data : s)));
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update salon");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCloseModal = () => {
    setFormOpen(false);
    setSelectedSalon(null);
    setProfilePreview("");
    setCoverPreview("");
    setGalleryPreviews([]);
    setNewGalleryFiles([]);
    setError("");
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage My Salons</h1>
        <button
          onClick={() => navigate('/create-salon')}
          className="bg-blue-500 text-white rounded-lg px-4 py-2"
        >
          + Add Salon
        </button>
      </div>

      {loading ? (
        <p>Loading salons...</p>
      ) : salons.length === 0 ? (
        <p>No salons yet. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salons.map((salon) => (
            <div key={salon.id} className="bg-white dark:bg-black shadow rounded-lg p-4">
              <SalonImage
                filename={typeof salon.coverImage === 'string' ? salon.coverImage : undefined}
                alt={salon.name}
                className="w-full h-40 object-cover rounded-lg mb-3 cursor-pointer"
                fallback="/images/default-salon.jpg"
                onClick={() => navigate(`/salon-services/${salon.id}`)}
              />
              <h2 className="font-semibold text-lg">{salon.name}</h2>
              <p className="text-sm text-gray-600 dark:text-white mb-2">{salon.city}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(salon)}
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

      {/* Edit Modal */}
      {formOpen && selectedSalon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-black rounded-lg shadow-lg w-full max-w-4xl my-8">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Edit Salon</h2>
                <p className="text-gray-600 dark:text-white">Update your salon information</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Salon Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={selectedSalon.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={selectedSalon.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                      Business Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={selectedSalon.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={selectedSalon.description}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Location</h3>
                  
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      required
                      value={selectedSalon.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        required
                        value={selectedSalon.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Location/Area
                      </label>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={selectedSalon.location}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Images</h3>
                  
                  {/* Profile Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">Profile Image</label>
                    <div className="flex items-center space-x-6">
                      {profilePreview ? (
                        <div className="relative">
                          <img
                            src={profilePreview}
                            alt="Profile preview"
                            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={removeProfileImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <Camera className="text-gray-400 dark:text-white" size={28} />
                        </div>
                      )}
                      <div>
                        <label htmlFor="profileImage" className="cursor-pointer bg-indigo-50 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-100 inline-flex items-center space-x-2 font-medium">
                          <Upload size={18} />
                          <span>Upload Profile Image</span>
                        </label>
                        <input
                          type="file"
                          id="profileImage"
                          accept="image/*"
                          onChange={handleProfileImageChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">Cover Image</label>
                    <div className="space-y-4">
                      {coverPreview ? (
                        <div className="relative">
                          <img
                            src={coverPreview}
                            alt="Cover preview"
                            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={removeCoverImage}
                            className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <Camera className="text-gray-400 dark:text-white" size={36} />
                        </div>
                      )}
                      <label htmlFor="coverImage" className="cursor-pointer bg-indigo-50 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-100 inline-flex items-center space-x-2 font-medium">
                        <Upload size={18} />
                        <span>Upload Cover Image</span>
                      </label>
                      <input
                        type="file"
                        id="coverImage"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Gallery */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">
                      Gallery Images (Max 10)
                    </label>
                    <div className="space-y-4">
                      {galleryPreviews.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {galleryPreviews.map((preview, index) => (
                            <div key={index} className="relative">
                              <img
                                src={preview}
                                alt={`Gallery ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label htmlFor="gallery" className="cursor-pointer bg-indigo-50 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-100 inline-flex items-center space-x-2 font-medium">
                        <Upload size={18} />
                        <span>Add Gallery Images</span>
                      </label>
                      <input
                        type="file"
                        id="gallery"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryChange}
                        className="hidden"
                        disabled={galleryPreviews.length >= 10}
                      />
                      <p className="text-sm text-gray-500 dark:text-white">
                        ({galleryPreviews.length}/10 images)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Business Hours</h3>
                  <div className="space-y-4">
                    {daysOfWeek.map((day) => (
                      <div key={day} className="flex items-center space-x-6 p-4 bg-gray-50 dark:bg-gray-600 rounded-lg">
                        <div className="w-24">
                          <span className="text-sm font-medium text-gray-700 dark:text-white capitalize">{day}</span>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!selectedSalon.businessHours[day]?.closed}
                            onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                            className="mr-3 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-600 dark:text-white">Open</span>
                        </label>
                        {!selectedSalon.businessHours[day]?.closed ? (
                          <div className="flex items-center space-x-3">
                            <input
                              type="time"
                              value={selectedSalon.businessHours[day]?.open || "09:00"}
                              onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-gray-500 dark:text-white">to</span>
                            <input
                              type="time"
                              value={selectedSalon.businessHours[day]?.close || "18:00"}
                              onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-white text-sm ml-8">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end pt-8 border-t space-x-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="bg-gray-200 text-gray-700 dark:text-white px-8 py-3 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                  >
                    {saveLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonOwnerSalons;