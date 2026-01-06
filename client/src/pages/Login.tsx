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
  const { setUser } = useUser(); // 🔑 this is the fix

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${baseUrl}/api/users/login`,
        { email, password },
        { withCredentials: true }
      );

      const { user } = res.data;

      // ✅ IMMEDIATELY update context
      setUser(user);

      // ✅ then navigate
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-slate-100 mb-6">
          Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-100">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 p-3 border"
            />
          </div>

          <PasswordInput
            value={password}
            onChange={setPassword}
            label="Password"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-indigo-600 font-medium hover:underline">
            Sign up here
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-gray-600">
          <Link to="/forgot-password" className="text-indigo-600 font-medium hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
