/**
 * api.js — Centralized API base URL resolver for THERMA.
 * 
 * Works seamlessly in both:
 * 1. Local Development: connects to /
 * 2. Vercel / Production: connects to relative paths ('') where /api or rewrite routes proxy to backend
 * 3. Custom backend host via VITE_API_BASE environment variable
 */

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE !== undefined && import.meta.env.VITE_API_BASE !== '') {
    return import.meta.env.VITE_API_BASE.replace(/\/+$/, '');
  }
  // In both local development (via Vite proxy) and production (Vercel rewrites),
  // relative API paths start with a leading slash (e.g. /api/ml/ask, /simulate).
  // An empty base string ensures `${API_BASE}/api/...` resolves to `/api/...`,
  // never creating protocol-relative `//api/...` which breaks in browser fetch.
  return '';
};

export const API_BASE = getApiBase();

export default API_BASE;
