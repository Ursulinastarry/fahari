// src/config/api.ts
const API_CONFIG = {
  baseURL: (import.meta as any).env?.VITE_API_URL || "https://fahari-j7ac.onrender.com",
  imagesPath: "/uploads/users",
};


// Helper to build full image URLs
export const buildImageUrl = (filename?: string | null) => {
  if (!filename) return null;
  if (filename.startsWith("http")) return filename;
  return `${API_CONFIG.baseURL}${API_CONFIG.imagesPath}/${filename}`;
};
