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

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${baseUrl}/api/users`, { withCredentials: true });
        setUsers(res.data);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

 const approveUser = async (id: string) => {
  await axios.put(
    `${baseUrl}/api/users/${id}/approve`,
    {}, // no body, so pass empty object
    { withCredentials: true }
  );
  setUsers(users.map(u => u.id === id ? { ...u, isActive: true } : u));
};

const suspendUser = async (id: string) => {
  await axios.put(
    `${baseUrl}/api/users/${id}/suspend`,
    {},
    { withCredentials: true }
  );
  setUsers(users.map(u => u.id === id ? { ...u, isActive: false } : u));
};

const deleteUser = async (id: string) => {
  await axios.delete(
    `${baseUrl}/api/users/${id}`,
    { withCredentials: true }
  );
  setUsers(users.filter(u => u.id !== id));
};


  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-6">Admin Dashboard</h1>

      {/* Stats Section */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-100">Total Users</h2>
          <p className="text-gray-500 dark:text-slate-400">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-100">Salon Owners</h2>
          <p className="text-gray-500 dark:text-slate-400">{users.filter(u => u.role === "SALON_OWNER").length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-100">Pending Approvals</h2>
          <p className="text-gray-500 dark:text-slate-400">{users.filter(u => !u.isActive).length}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-100 text-gray-700 dark:bg-slate-900 dark:text-slate-100">
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
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{user.id}</td>
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3 capitalize">{user.role}</td>
                <td className="p-3">
                  {user.isActive ? (
                    <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-600">Active</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-600">Pending</span>
                  )}
                </td>
                <td className="p-3 space-x-2">
                  {!user.isActive && (
                    <button 
                      onClick={() => approveUser(user.id)} 
                      className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200"
                    >
                      Approve
                    </button>
                  )}
                  {user.isActive && (
                    <button 
                      onClick={() => suspendUser(user.id)} 
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200"
                    >
                      Suspend
                    </button>
                  )}
                  <button 
                    onClick={() => deleteUser(user.id)} 
                    className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
