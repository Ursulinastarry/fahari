// src/config/baseUrl.ts
export const baseUrl: string = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.REACT_APP_BASE_URL;

export default baseUrl;
