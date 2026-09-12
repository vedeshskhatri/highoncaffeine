/**
 * api.js — Centralized API base URL resolver for THERMA.
 * 
 * Works seamlessly in both:
 * 1. Local Development: connects to /
 * 2. Vercel / Production: connects to relative paths ('') where /api or rewrite routes proxy to backend
 * 3. Custom backend host via VITE_API_BASE environment variable
 */

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE !== undefined) {
    return import.meta.env.VITE_API_BASE;
  }
  // In development, default to local FastAPI server
  if (import.meta.env.DEV) {
    return '/';
  }
  // In production (Vercel), same-origin relative requests
  return '';
};

export const API_BASE = getApiBase();

export default API_BASE;
