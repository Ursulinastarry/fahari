// src/config/baseUrl.ts
const raw = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.REACT_APP_BASE_URL;

function ensureProtocol(value?: string | null) {
	if (!value) return value;
	if (value.startsWith("http://") || value.startsWith("https://")) return value;
	return `https://${value}`;
}

let resolved: string;
if (raw) {
	resolved = ensureProtocol(raw)!;
} else if (typeof window !== 'undefined' && window.location) {
	resolved = window.location.origin;
} else {
	resolved = 'http://localhost:5000';
}

export const baseUrl: string = resolved;

export default baseUrl;
