// src/pages/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { baseUrl } from '../config/baseUrl';
import DashboardLayout from "./DashboardLayout";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Salon {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'salons'>('users');
  const [loading, setLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [salonsError, setSalonsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setUsersError(null);
      setSalonsError(null);
      
      try {
        const [usersRes, salonsRes] = await Promise.allSettled([
          axios.get(`${baseUrl}/api/users`, { withCredentials: true }),
          axios.get(`${baseUrl}/api/salons`, { withCredentials: true })
        ]);

        if (usersRes.status === 'fulfilled') {
          setUsers(usersRes.value.data);
        } else {
          console.error("Error fetching users:", usersRes.reason);
          setUsersError("Failed to load users data");
        }

        if (salonsRes.status === 'fulfilled') {
          setSalons(salonsRes.value.data);
        } else {
          console.error("Error fetching salons:", salonsRes.reason);
          setSalonsError("Failed to load salons data");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setUsersError("An unexpected error occurred");
        setSalonsError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const approveUser = async (id: string) => {
    try {
      await axios.put(
        `${baseUrl}/api/users/${id}/approve`,
        {},
        { withCredentials: true }
      );
      setUsers(users.map(u => u.id === id ? { ...u, isActive: true } : u));
    } catch (err) {
      console.error("Error approving user:", err);
      alert("Failed to approve user. Please try again.");
    }
  };

  const suspendUser = async (id: string) => {
    try {
      await axios.put(
        `${baseUrl}/api/users/${id}/suspend`,
        {},
        { withCredentials: true }
      );
      setUsers(users.map(u => u.id === id ? { ...u, isActive: false } : u));
    } catch (err) {
      console.error("Error suspending user:", err);
      alert("Failed to suspend user. Please try again.");
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    
    try {
      await axios.delete(
        `${baseUrl}/api/users/${id}`,
        { withCredentials: true }
      );
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user. Please try again.");
    }
  };

  const approveSalon = async (id: string) => {
    try {
      await axios.put(
        `${baseUrl}/api/salons/${id}/approve`,
        {},
        { withCredentials: true }
      );
      setSalons(salons.map(s => s.id === id ? { ...s, isActive: true } : s));
    } catch (err) {
      console.error("Error approving salon:", err);
      alert("Failed to approve salon. The feature may not be available on the live server yet.");
    }
  };

  const suspendSalon = async (id: string) => {
    try {
      await axios.put(
        `${baseUrl}/api/salons/${id}/suspend`,
        {},
        { withCredentials: true }
      );
      setSalons(salons.map(s => s.id === id ? { ...s, isActive: false } : s));
    } catch (err) {
      console.error("Error suspending salon:", err);
      alert("Failed to suspend salon. The feature may not be available on the live server yet.");
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="min-h-screen bg-gray-50 dark:bg-black p-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Admin Dashboard</h1>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Global Error Messages */}
            {(usersError || salonsError) && (
              <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded mb-6">
                <strong className="font-bold">Warning:</strong>
                <span className="block sm:inline"> Some data failed to load.</span>
                {usersError && <p className="text-sm mt-1">Users: {usersError}</p>}
                {salonsError && <p className="text-sm mt-1">Salons: {salonsError}</p>}
              </div>
            )}

            {/* Stats Section */}
            <div className="grid gap-6 md:grid-cols-4 mb-8">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-white">Total Users</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {usersError ? "—" : users.length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-white">Salon Owners</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {usersError ? "—" : users.filter(u => u.role === "SALON_OWNER").length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-white">Total Salons</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {salonsError ? "—" : salons.length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-white">Pending Approvals</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {(usersError && salonsError) ? "—" : 
                    (usersError ? salons.filter(s => !s.isActive).length :
                    salonsError ? users.filter(u => !u.isActive).length :
                    users.filter(u => !u.isActive).length + salons.filter(s => !s.isActive).length)
                  }
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Manage Users
                </button>
                <button
                  onClick={() => setActiveTab('salons')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'salons'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Manage Salons
                </button>
              </div>
            </div>

            {/* Users Table */}
            {activeTab === 'users' && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 overflow-x-auto">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Manage Users</h2>
                {usersError ? (
                  <div className="text-center py-8">
                    <p className="text-red-600 dark:text-red-400">{usersError}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      This feature may not be available on the live server yet.
                    </p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No users found.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 dark:bg-black dark:text-white">
                        <th className="p-3">ID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="p-3 text-gray-700 dark:text-gray-300">{user.id}</td>
                          <td className="p-3 text-gray-700 dark:text-gray-300">{user.name}</td>
                          <td className="p-3 text-gray-700 dark:text-gray-300">{user.email}</td>
                          <td className="p-3 capitalize text-gray-700 dark:text-gray-300">{user.role}</td>
                          <td className="p-3">
                            {user.isActive ? (
                              <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
                                Active
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-3 space-x-2">
                            {!user.isActive && (
                              <button 
                                onClick={() => approveUser(user.id)} 
                                className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {user.isActive && (
                              <button 
                                onClick={() => suspendUser(user.id)} 
                                className="px-3 py-1 text-sm bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800 transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                            <button 
                              onClick={() => deleteUser(user.id)} 
                              className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Salons Table */}
            {activeTab === 'salons' && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 overflow-x-auto">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Manage Salons</h2>
                {salonsError ? (
                  <div className="text-center py-8">
                    <p className="text-red-600 dark:text-red-400">{salonsError}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      This feature may not be available on the live server yet.
                    </p>
                  </div>
                ) : salons.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No salons found.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 dark:bg-black dark:text-white">
                        <th className="p-3">ID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salons.map(salon => (
                        <tr key={salon.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="p-3 text-gray-700 dark:text-gray-300">{salon.id}</td>
                          <td className="p-3 text-gray-700 dark:text-gray-300">{salon.name}</td>
                          <td className="p-3 text-gray-700 dark:text-gray-300">{salon.email}</td>
                          <td className="p-3 text-gray-700 dark:text-gray-300">{salon.phone}</td>
                          <td className="p-3">
                            {salon.isActive ? (
                              <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
                                Active
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-3 space-x-2">
                            {!salon.isActive && (
                              <button 
                                onClick={() => approveSalon(salon.id)} 
                                className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {salon.isActive && (
                              <button 
                                onClick={() => suspendSalon(salon.id)} 
                                className="px-3 py-1 text-sm bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800 transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;