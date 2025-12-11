# E-Lawyer System Deployment & Integrations

## Integrations Checklist
- Supabase: Ensure `supabase/config.toml` and frontend integration in `src/integrations/supabase/` are configured with your project URL and anon key.
- MongoDB: Set `MONGODB_URI` in backend `.env` file. Use a cloud MongoDB (e.g., Atlas) for production.
- Backend API: Confirm CORS is enabled in `backend/app.js`. If deploying separately, set up a proxy in `vite.config.ts` for API calls.
- Socket.io Signaling: Make sure frontend connects to the correct backend URL for signaling (update in `useVideoConference.tsx`).

## Deployment Steps

### 1. Frontend (React/Vite)
- Build: `npm run build`
- Deploy `dist/` folder to Vercel, Netlify, or your preferred static host.
- Set environment variables for Supabase in your host dashboard.

### 2. Backend (Node.js/Express)
- Install dependencies: `npm install`
- Set up `.env` with `MONGODB_URI`, `JWT_SECRET`, etc.
- Start server: `node app.js` (or use PM2: `pm2 start app.js`)
- For production, use a process manager or Docker for reliability.
- Expose port (e.g., 5001) and ensure firewall rules allow traffic.

### 3. Socket.io Signaling
- Runs with backend on same port. Ensure WebSocket traffic is allowed.
- If using a reverse proxy (Nginx, Caddy), configure WebSocket support.

### 4. Environment Variables
- Store secrets securely (never commit `.env` to git).
- Use host dashboard or secret manager for production values.

### 5. Cloud Setup
- Vercel/Netlify: Connect repo, set build command, and environment variables.
- Heroku/Render/DigitalOcean: Deploy backend, set up MongoDB, configure environment.
- Optionally, use Docker Compose for full stack deployment.

## Final Checklist
- [ ] All integrations tested (Supabase, MongoDB, Socket.io)
- [ ] Frontend and backend build and run in production
- [ ] Environment variables set securely
- [ ] HTTPS enabled for all endpoints
- [ ] WebSocket signaling works for video meetings
- [ ] Monitoring and logging enabled

---
For further help, see README.md or ask for cloud-specific deployment scripts.
