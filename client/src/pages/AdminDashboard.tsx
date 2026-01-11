// src/pages/AdminDashboard.tsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { baseUrl } from '../config/baseUrl'; // Ensure this file exists and exports baseUrl correctly
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

type FilterType = 'all' | 'active' | 'pending';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'salons'>('users');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, salonsRes] = await Promise.all([
        axios.get(`${baseUrl}/api/users`, { withCredentials: true }),
        axios.get(`${baseUrl}/api/salons`, { withCredentials: true })
      ]);
      setUsers(usersRes.data);
      setSalons(salonsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered and searched data
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'active' && user.isActive) ||
                           (filterType === 'pending' && !user.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filterType]);

  const filteredSalons = useMemo(() => {
    return salons.filter(salon => {
      const matchesSearch = salon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           salon.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'active' && salon.isActive) ||
                           (filterType === 'pending' && !salon.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [salons, searchTerm, filterType]);

  // Stats
  const stats = useMemo(() => ({
    totalUsers: users.length,
    salonOwners: users.filter(u => u.role === "SALON_OWNER").length,
    totalSalons: salons.length,
    pendingApprovals: users.filter(u => !u.isActive).length + salons.filter(s => !s.isActive).length,
    activeUsers: users.filter(u => u.isActive).length,
    activeSalons: salons.filter(s => s.isActive).length,
  }), [users, salons]);

  // User actions
  const approveUser = async (id: string) => {
    try {
      await axios.put(`${baseUrl}/api/users/${id}/approve`, {}, { withCredentials: true });
      setUsers(users.map(u => u.id === id ? { ...u, isActive: true } : u));
    } catch (err) {
      console.error("Error approving user:", err);
    }
  };

  const suspendUser = async (id: string) => {
    try {
      await axios.put(`${baseUrl}/api/users/${id}/suspend`, {}, { withCredentials: true });
      setUsers(users.map(u => u.id === id ? { ...u, isActive: false } : u));
    } catch (err) {
      console.error("Error suspending user:", err);
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${baseUrl}/api/users/${id}`, { withCredentials: true });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const bulkApproveUsers = async () => {
    const pendingUsers = filteredUsers.filter(u => !u.isActive);
    if (pendingUsers.length === 0) return;
    if (!window.confirm(`Approve ${pendingUsers.length} pending users?`)) return;
    
    try {
      await Promise.all(pendingUsers.map(u => 
        axios.put(`${baseUrl}/api/users/${u.id}/approve`, {}, { withCredentials: true })
      ));
      setUsers(users.map(u => pendingUsers.some(p => p.id === u.id) ? { ...u, isActive: true } : u));
    } catch (err) {
      console.error("Error bulk approving users:", err);
    }
  };

  // Salon actions
  const approveSalon = async (id: string) => {
    try {
      await axios.put(`${baseUrl}/api/salons/${id}/approve`, {}, { withCredentials: true });
      setSalons(salons.map(s => s.id === id ? { ...s, isActive: true } : s));
    } catch (err) {
      console.error("Error approving salon:", err);
    }
  };

  const suspendSalon = async (id: string) => {
    try {
      await axios.put(`${baseUrl}/api/salons/${id}/suspend`, {}, { withCredentials: true });
      setSalons(salons.map(s => s.id === id ? { ...s, isActive: false } : s));
    } catch (err) {
      console.error("Error suspending salon:", err);
    }
  };

  const bulkApproveSalons = async () => {
    const pendingSalons = filteredSalons.filter(s => !s.isActive);
    if (pendingSalons.length === 0) return;
    if (!window.confirm(`Approve ${pendingSalons.length} pending salons?`)) return;
    
    try {
      await Promise.all(pendingSalons.map(s => 
        axios.put(`${baseUrl}/api/salons/${s.id}/approve`, {}, { withCredentials: true })
      ));
      setSalons(salons.map(s => pendingSalons.some(p => p.id === s.id) ? { ...s, isActive: true } : s));
    } catch (err) {
      console.error("Error bulk approving salons:", err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage users and salons efficiently</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">{stats.activeUsers} active</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Salons</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalSalons}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">{stats.activeSalons} active</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Salon Owners</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.salonOwners}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.pendingApprovals}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Awaiting approval</p>
          </div>
        </div>

        {/* Tabs and Controls */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => { setActiveTab('users'); setSearchTerm(''); setFilterType('all'); }}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                    activeTab === 'users'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Users ({users.length})
                </button>
                <button
                  onClick={() => { setActiveTab('salons'); setSearchTerm(''); setFilterType('all'); }}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                    activeTab === 'salons'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Salons ({salons.length})
                </button>
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-2">
                {activeTab === 'users' && filteredUsers.some(u => !u.isActive) && (
                  <button
                    onClick={bulkApproveUsers}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Approve All Pending
                  </button>
                )}
                {activeTab === 'salons' && filteredSalons.some(s => !s.isActive) && (
                  <button
                    onClick={bulkApproveSalons}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Approve All Pending
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('active')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'active'
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterType('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {activeTab === 'users' ? (
              filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">No users found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{user.email}</td> {/* Fixed: was {salon.phone} */}
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded capitalize">
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {!user.isActive && (
                            <button
                              onClick={() => approveUser(user.id)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {user.isActive && (
                            <button
                              onClick={() => suspendUser(user.id)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              filteredSalons.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">No salons found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Salon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredSalons.map(salon => (
                      <tr key={salon.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {salon.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{salon.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">ID: {salon.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{salon.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{salon.phone}</td>
                        <td className="px-6 py-4">
                          {salon.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {!salon.isActive && (
                            <button
                              onClick={() => approveSalon(salon.id)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {salon.isActive && (
                            <button
                              onClick={() => suspendSalon(salon.id)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          {/* Results Count */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {activeTab === 'users' ? filteredUsers.length : filteredSalons.length} of {activeTab === 'users' ? users.length : salons.length} {activeTab}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;