# E-Lawyer System

## Project Info
A web-based platform for lawyers and clients to manage cases, attend virtual court sessions, and communicate efficiently. Built for the Ethiopian legal system modernization project.

## Technologies Used
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Node.js (Express backend)
- MongoDB (database)
- Socket.io (real-time video & chat)

## How to Run Locally

### 1. Prerequisites
- Node.js & npm installed ([Download Node.js](https://nodejs.org/))
- MongoDB installed and running locally ([Download MongoDB](https://www.mongodb.com/try/download/community))

### 2. Start MongoDB
Open a terminal and run:
```powershell
mongod
```
(Leave this window open)

### 3. Start the Backend
Open a new terminal:
```powershell
cd backend
npm install
node app.js
```
You should see `MongoDB connected` and `Backend server and signaling server running on port 5001`.

### 4. Start the Frontend
Open another terminal:
```powershell
cd ..
npm install
npm run dev
```
You should see the app running at [http://localhost:8083](http://localhost:8083).

## Features
- User registration and login (JWT-based)
- Case management (CRUD)
- Session scheduling and management
- Virtual video meetings (WebRTC + Socket.io)
- Real-time chat during meetings
- Document upload and sharing
- Role-based access (lawyer, client,Court,Admin)

## Deployment
- Build frontend: `npm run build` (deploy `dist/` to Netlify, Vercel, etc.)
- Deploy backend to Node.js host (Heroku, Render, DigitalOcean, etc.)
- Set environment variables (`MONGODB_URI`, `JWT_SECRET`, etc.) in your host dashboard



## Support
If you encounter issues, open an issue in your repository or contact the project maintainers.

---

