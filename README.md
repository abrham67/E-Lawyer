# E-Legal Connect

## Overview
Web platform for lawyers, clients, court users, and admins to manage cases, schedule and run virtual hearings, exchange documents, chat in real time, and view activity/reporting. Built for the Ethiopian legal system modernization project.

## Stack
- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn-ui, Socket.io client
- Backend: Node.js, Express, Socket.io, MongoDB (Mongoose)
- Auth: JWT + role-based access control
- Video/Signaling: WebRTC with Socket.io signaling

## Quick Start (Local)

Prereqs: Node.js + npm, MongoDB running locally or a remote URI.

1) Backend
```powershell
cd backend
npm install
# set .env (see env vars below)
npm start       # or: node app.js
```
Defaults: PORT 5100, MongoDB at mongodb://localhost:27017/e-lawyer

2) Frontend (new terminal)
```powershell
cd ..
npm install
npm run dev     # default Vite port 5173 (or next available)
```

Open the app at the dev server URL shown in the terminal (e.g., http://localhost:5173).

## Key Features
- JWT auth with RBAC (lawyer, client, court, admin)
- Case management with history
- Session scheduling/join links, WebRTC signaling, optional recordings
- Secure document upload/download tied to cases and messages
- Real-time chat, notifications, reminders
- Reports and activity logging; health check at `/health`

## Deployment (Summary)
- Frontend: `npm run build`, deploy `dist/` to static host (Netlify/Vercel/etc.). Set `VITE_SIGNALING_URL`/`VITE_SOCKET_URL` if backend is on a different origin.
- Backend: `npm install`, `npm start` (or PM2). Provide env vars below; ensure HTTPS and WebSocket support; use MongoDB Atlas or managed Mongo.


## Backend Environment Variables (.env)
- `MONGODB_URI` — Mongo connection string
- `PORT` — HTTP port (default 5100)
- `JWT_SECRET` — secret for JWT signing
- `MESSAGE_SECRET` — optional 32+ chars to enable message encryption
- `APP_ORIGIN` / `FRONTEND_BASE_URL` — used for join links in session routes
- `ALLOW_ADMIN_SESSION_CONTROL` — `true|false` to let admins control sessions
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` — AI assistance
- `SERPAPI_KEY`, `GOOGLE_CSE_KEY`, `GOOGLE_CSE_ID` — web search support for AI
- Admin seeding (optional): `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`

## Scripts
- Frontend: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`
- Backend: `npm start`, `npm test` (Jest)

## Docs
- Project docs: docs/README.md
- API quick list: docs/api.md
- Deployment checklist: DEPLOYMENT.md
- Final report: docs/final-documentation.md

## Support
If you encounter issues, open an issue in your repository or contact the project maintainers.
## Support

If you encounter issues, open an issue in your repository or contact the project maintainers.
