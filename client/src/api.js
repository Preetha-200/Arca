/* ─────────────────────────────────────────────────────────────────────
   api.js  —  Single source of truth for the backend URL.

   In development the Vite dev server is running on localhost:5000.
   In production the app talks to the Render deployment.

   VITE_API_URL can be set in:
     • .env.local  (gitignored, for local dev)
     • Vercel Environment Variables (for the live deployment)

   If neither is set, it falls back to the Render URL so the
   production build always works out of the box.
   ──────────────────────────────────────────────────────────────────── */

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "https://arca-aq2o.onrender.com";

export default API_BASE;
