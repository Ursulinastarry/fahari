import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { baseUrl } from "../config/baseUrl";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void; // ✅ Added setter
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${baseUrl}/api/users/me`, {
        withCredentials: true,
      });
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await axios.post(`${baseUrl}/api/users/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  useEffect(() => {
    if (document.cookie.includes('access_token')) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      refreshUser: fetchUser, 
      setUser, // ✅ Expose setter
      logout 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
};