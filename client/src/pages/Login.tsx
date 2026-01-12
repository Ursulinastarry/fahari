import React, { useState } from "react";
import axios from "axios";
import { baseUrl } from "../config/baseUrl";
import { useNavigate, Link } from "react-router-dom";
import PasswordInput from "./Password";
import { useUser } from "../contexts/UserContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUser(); // ✅ Use setUser instead of refreshUser

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ Login - backend now returns full user object
      const loginRes = await axios.post(
        `${baseUrl}/api/users/login`,
        { email, password },
        { withCredentials: true }
      );

      // 2️⃣ Get user data from login response
      const user = loginRes.data.user;

      if (!user) {
        alert("Login failed - no user data returned");
        return;
      }

      // 3️⃣ Update context with user data
      setUser(user);

      // 4️⃣ Role-based navigation
      switch (user.role) {
        case "CLIENT":
          navigate("/");
          break;
        case "SALON_OWNER":
          navigate("/owner");
          break;
        case "ADMIN":
          navigate("/admin");
          break;
        default:
          navigate("/");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-pink-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <PasswordInput
            value={password}
            onChange={(value) => setPassword(value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/signup" className="text-indigo-600 hover:underline">
            Sign up here
          </Link>
        </p>

        <p className="mt-2 text-center text-sm">
          <Link
            to="/forgot-password"
            className="text-indigo-600 hover:underline"
          >
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;