// src/pages/owner/CreateSalonForm.tsx
import React, { useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from "react-router-dom";
import { baseUrl } from '../../config/baseUrl';

interface CreateSalonFormProps {
  onSalonCreated?: (salonData: any) => void;
}

interface SalonFormData {
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
  profileImage: File | null;
  coverImage: File | null;
  gallery: File[];
}

const CreateSalonForm: React.FC<CreateSalonFormProps> = ({ onSalonCreated }) => {
  const navigate = useNavigate();
  const { user } = useUser();

  const [formData, setFormData] = useState<SalonFormData>({
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    location: "",
    businessHours: {
      monday: { open: "09:00", close: "18:00", closed: false },
      tuesday: { open: "09:00", close: "18:00", closed: false },
      wednesday: { open: "09:00", close: "18:00", closed: false },
      thursday: { open: "09:00", close: "18:00", closed: false },
      friday: { open: "09:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "17:00", closed: false },
      sunday: { open: "10:00", close: "16:00", closed: false },
    },
    profileImage: null,
    coverImage: null,
    gallery: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, profileImage: file }));
      const reader = new FileReader();
      reader.onload = () => setProfilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, coverImage: file }));
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = [...formData.gallery, ...files].slice(0, 10);
      setFormData(prev => ({ ...prev, gallery: newFiles }));
      
      const newPreviews = [...galleryPreviews];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          newPreviews.push(reader.result as string);
          setGalleryPreviews([...newPreviews].slice(0, 10));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = formData.gallery.filter((_, i) => i !== index);
    const newPreviews = galleryPreviews.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, gallery: newGallery }));
    setGalleryPreviews(newPreviews);
  };

  const removeProfileImage = () => {
    setFormData(prev => ({ ...prev, profileImage: null }));
    setProfilePreview("");
  };

  const removeCoverImage = () => {
    setFormData(prev => ({ ...prev, coverImage: null }));
    setCoverPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("Please log in to create a salon.");
      return;
    }

    // Basic validation
    if (!formData.name.trim()) {
      setError("Salon name is required.");
      return;
    }
    if (!formData.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!formData.address.trim()) {
      setError("Address is required.");
      return;
    }
    if (!formData.city.trim()) {
      setError("City is required.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Append text fields
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('phone', formData.phone.trim());
      formDataToSend.append('address', formData.address.trim());
      formDataToSend.append('city', formData.city.trim());
      formDataToSend.append('location', formData.location.trim());
      formDataToSend.append('businessHours', JSON.stringify(formData.businessHours));
      
      // Append images
      if (formData.profileImage) {
        formDataToSend.append('profileImage', formData.profileImage);
      }
      if (formData.coverImage) {
        formDataToSend.append('coverImage', formData.coverImage);
      }
      formData.gallery.forEach((image) => {
        formDataToSend.append('gallery', image);
      });

      const response = await fetch(`${baseUrl}/api/salons`, {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create salon');
      }

      const salonData = await response.json();
      
      if (onSalonCreated) {
        onSalonCreated(salonData);
      }
      
      // Navigate to owner salons page
      navigate('/owner/salons');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the salon');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      name: "",
      description: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      location: "",
      businessHours: {
        monday: { open: "09:00", close: "18:00", closed: false },
        tuesday: { open: "09:00", close: "18:00", closed: false },
        wednesday: { open: "09:00", close: "18:00", closed: false },
        thursday: { open: "09:00", close: "18:00", closed: false },
        friday: { open: "09:00", close: "18:00", closed: false },
        saturday: { open: "09:00", close: "17:00", closed: false },
        sunday: { open: "10:00", close: "16:00", closed: false },
      },
      profileImage: null,
      coverImage: null,
      gallery: [],
    });
    
    // Reset previews
    setProfilePreview("");
    setCoverPreview("");
    setGalleryPreviews([]);
    setError("");
    
    // Navigate back
    navigate('/owner/salons');
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Your Salon</h2>
            <p className="text-gray-600 dark:text-white">Set up your salon profile to start managing your business</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
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
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter salon name"
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
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="(123) 456-7890"
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
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="salon@example.com"
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
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Describe your salon..."
                />
              </div>
            </div>

            {/* Location Information */}
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
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="123 Main Street"
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
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="City"
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
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Downtown, Mall, etc."
                  />
                </div>
              </div>
            </div>

            {/* Images Upload Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Images</h3>
              
              {/* Profile Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">
                  Profile Image
                </label>
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
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
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
                    <label htmlFor="profileImage" className="cursor-pointer bg-indigo-50 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center space-x-2 font-medium">
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
                    <p className="text-sm text-gray-500 dark:text-white mt-2">Recommended: Square image, max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">
                  Cover Image
                </label>
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
                        className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="text-gray-400 dark:text-white mx-auto mb-3" size={36} />
                        <p className="text-gray-500 dark:text-white font-medium">Cover Image</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label htmlFor="coverImage" className="cursor-pointer bg-indigo-50 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center space-x-2 font-medium">
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
                    <p className="text-sm text-gray-500 dark:text-white mt-2">Recommended: 16:9 ratio, max 5MB</p>
                  </div>
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
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <label htmlFor="gallery" className="cursor-pointer bg-indigo-50 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center space-x-2 font-medium">
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
                      disabled={formData.gallery.length >= 10}
                    />
                    <p className="text-sm text-gray-500 dark:text-white mt-2">
                      Upload multiple images ({formData.gallery.length}/10 uploaded)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Business Hours</h3>
              <div className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center space-x-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-24">
                      <span className="text-sm font-medium text-gray-700 dark:text-white capitalize">{day}</span>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!formData.businessHours[day].closed}
                        onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                        className="mr-3 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-600 dark:text-white">Open</span>
                    </label>
                    {!formData.businessHours[day].closed ? (
                      <div className="flex items-center space-x-3">
                        <input
                          type="time"
                          value={formData.businessHours[day].open}
                          onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-gray-500 dark:text-white">to</span>
                        <input
                          type="time"
                          value={formData.businessHours[day].close}
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
                onClick={handleCancel}
                className="bg-gray-200 text-gray-700 dark:text-white px-8 py-3 rounded-lg hover:bg-gray-300 
                           focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? "Creating Salon..." : "Create Salon"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSalonForm;