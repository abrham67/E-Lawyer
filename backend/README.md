# E-Lawyer Backend

This is the Node.js/Express backend scaffold for the E-Lawyer System.

## Features
- Express server with CORS enabled
- Case management API routes (CRUD scaffold)

## Getting Started
1. Install dependencies:
   ```powershell
   cd backend
   npm install
   ```
2. Start the server:
   ```powershell
   npm start
   ```
3. The API will be available at `http://localhost:5100/`

## Frontend Setup
1. Open a new terminal and navigate to the main project folder:
   ```powershell
   cd ..
   npm install
   ```
2. Start the Vite development server:
   ```powershell
   npm run dev
   ```
3. The frontend will be available at `http://localhost:5176/` (or the next available port).

## Proxy Configuration
- The frontend is configured to proxy API requests (`/api`) to `http://localhost:5100/` via `vite.config.ts`.

## Next Steps
- Connect to MongoDB or MySQL for persistent data storage
- Implement full CRUD for cases, users, sessions, etc.
- Add authentication and authorization middleware
