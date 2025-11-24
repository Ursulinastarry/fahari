import React, { useState } from 'react';
import { Edit3, Camera, X, Save, Mail, Phone, MapPin, User } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import Avatar from './avatars';
import { baseUrl } from '../config/baseUrl';
const ProfileComponent = ({ user = useUser().user, onClose }: { user: any; onClose: any; }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [avatarPreview, setavatarPreview] = useState(user!.avatar);
  const [newavatar, setNewavatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setEditedUser((prev: typeof user) => ({
    ...prev,
    [name]: value,
  }));
};

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setNewavatar(file); 

    const reader = new FileReader();
    reader.onload = () => {
      setavatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }
};


  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('firstName', editedUser!.firstName);
      formData.append('lastName', editedUser!.lastName);
      formData.append('email', editedUser!.email);
      formData.append('phone', editedUser!.phone);

      if (newavatar) {
        formData.append('avatar', newavatar, newavatar.name);
      }

      ;
      const response = await fetch(`${baseUrl}/api/users/${user!.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });
      // avatar=response.avatar;

      if (response.ok) {
        setIsEditing(false);
        setNewavatar(newavatar);
        // Update user context here
        console.log('Profile updated successfully');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(user);
    setavatarPreview(user!.avatar);
    setNewavatar(null);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-8 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white dark:text-gray-900 hover:bg-white dark:bg-gray-900 hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="text-center">
            {/* Profile Image */}
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-900 shadow-lg bg-white dark:bg-gray-900">
                {avatarPreview ? (
                  <Avatar
                filename={typeof user.avatar === 'string' ? user.avatar : undefined}
                alt={user.firstName}
                className="w-full h-40 object-cover rounded-lg mb-3"
                fallback="/images/default-salon.jpg"
              />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-900 flex items-center justify-center">
                    <User className="text-gray-400 dark:text-white" size={32} />
                  </div>
                )}
              </div>
              
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white dark:text-gray-900 rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                  <Camera size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            
            {/* Name */}
            <h2 className="text-2xl font-bold text-white dark:text-gray-900 mb-1">
              {editedUser.firstName} {editedUser.lastName}
            </h2>
            <p className="text-indigo-100 text-sm capitalize">
              {editedUser.role.replace('_', ' ').toLowerCase()}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Edit Button */}
          {!isEditing ? (
            <div className="flex justify-center">
              <button
                onClick={() => setIsEditing(true)}
                className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center space-x-2 font-medium"
              >
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleCancel}
                className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-200 dark:bg-gray-900transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-indigo-600 text-white dark:text-gray-900 px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center space-x-2 disabled:opacity-50"
              >
                <Save size={16} />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}

          {/* Profile Information */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={`${editedUser.firstName} ${editedUser.lastName}`}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <User className="text-gray-400 dark:text-white" size={18} />
                  <span className="text-gray-800 dark:text-white">{user.firstName} {user.lastName}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editedUser.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Mail className="text-gray-400 dark:text-white" size={18} />
                  <span className="text-gray-800 dark:text-white">{user.email}</span>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={editedUser.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Phone className="text-gray-400 dark:text-white" size={18} />
                  <span className="text-gray-800 dark:text-white">{user.phone}</span>
                </div>
              )}
            </div>

            
          </div>

          {/* Additional Info */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500 dark:text-white">
            Member since{" "}
{new Date(user.createdAt).toLocaleString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Nairobi", // 👈 Nairobi time
})}


            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Circular Profile Button Component
const CircularProfileButton = ({ user, onClick }: { user: any; onClick: any; }) => {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      {user?.avatar ? (
        <Avatar
          filename={typeof user.avatar === 'string' ? user.avatar : undefined}
          alt={user.firstName}
          className="w-full h-full object-cover"
          fallback="/images/default-salon.jpg"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
          <span className="text-white dark:text-gray-900 font-medium text-sm">
            {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
      )}
    </button>
  );
};


// Main component that includes both profile button and modal
const ProfileManager = () => {
  const [showProfile, setShowProfile] = useState(false);
  // Replace with actual user from context
    const { user } = useUser();
  return (
    <>
      {/* Only show profile button if user is logged in */}
      {user && (
        <CircularProfileButton 
          user={user} 
          onClick={() => setShowProfile(true)} 
        />
      )}
      
      {/* Profile Modal */}
      {showProfile && (
        <ProfileComponent 
          user={user} 
          onClose={() => setShowProfile(false)} 
        />
      )}
    </>
  );
};

export default ProfileManager;