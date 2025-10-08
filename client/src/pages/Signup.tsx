import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PasswordInput from "./Password";
const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "" 
  });
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
};


 const navigate = useNavigate();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await axios.post(
      "https://fahari-production.up.railway.app/api/users/register",
      formData,
      { withCredentials: true }
    );
    alert("Signup successful, wait for admin approval!");
    navigate("/"); // 👈 redirect after success
  } catch (err: any) {
    alert(err.response?.data?.message || "Signup failed");
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Create Account
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            onChange={handleChange}
            className="col-span-1 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 p-3 border"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            onChange={handleChange}
            className="col-span-1 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 p-3 border"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="col-span-2 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 p-3 border"
          />
          <input
            type="text"
            name="phone"
            placeholder="Phone"
            onChange={handleChange}
            className="col-span-2 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 p-3 border"
          />
          <PasswordInput
        value={password}
        onChange={setPassword}
        label="Password"
        placeholder="••••••••"
      />
      <PasswordInput
        value={confirmPassword}
        onChange={setConfirmPassword}
        label="Confirm Password"
        placeholder="Re-enter your password"
      />

      {/* Error message */}
      {confirmPassword && !passwordsMatch && (
        <p className="text-red-500 text-sm">Passwords do not match</p>
      )}
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-white text-sm font-bold mb-2">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select Role</option>
              <option value="CLIENT">Client</option>
              <option value="SALON_OWNER">Salon Owner</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!passwordsMatch}
            className="col-span-2 w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
