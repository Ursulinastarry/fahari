// src/config/api.ts
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || "https://fahari-production.up.railway.app",
  imagesPath: "/uploads/salons",
};


// Helper to build full image URLs
export const buildImageUrl = (filename?: string | null) => {
  if (!filename) return null;
  if (filename.startsWith("http")) return filename;
  return `${API_CONFIG.baseURL}${API_CONFIG.imagesPath}/${filename}`;
};
