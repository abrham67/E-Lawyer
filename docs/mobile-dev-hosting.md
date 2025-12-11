# Run the app on your phone (LAN HTTPS)

This guide shows how to open the Vite dev server on your mobile device for end‑to‑end testing with camera/mic. It assumes Windows + PowerShell.

Why HTTPS? Mobile browsers require a secure context (HTTPS) for camera/mic (getUserMedia). The repo is already configured to serve HTTPS in dev via mkcert and to proxy API and Socket.IO, so you only need to expose one port.

## 1) Start backend and frontend

- Backend (Express + Socket.IO): runs on port 5100 and listens on all interfaces.
- Frontend (Vite): runs on port 5176 with HTTPS and proxies /api and /ws to the backend.

You can start the frontend from VS Code Tasks ("Run Vite Frontend"). Start the backend separately from the `backend` folder:

```powershell
# In VS Code integrated terminal or PowerShell
cd backend
npm run start
```

Leave both running.

## 2) Get your PC’s LAN IP

Find the IPv4 address of your Windows machine connected to the same Wi‑Fi as your phone:

```powershell
Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } | ForEach-Object { $_.IPv4Address.IPAddress }
```

Example result: `10.143.23.137`

## 3) Allow inbound traffic on the Vite port (5176)

Windows Firewall may block other devices from reaching your dev server. Create a one‑off inbound rule for TCP 5176:

```powershell
# Temporarily allow 5176 inbound for PRIVATE profiles (your home/office Wi‑Fi)
New-NetFirewallRule -DisplayName "Vite Dev 5176" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5176 -Profile Private
```

Note: You do not need to open 5100 to your LAN. The mobile browser will hit the Vite server on 5176, and Vite will proxy all API and WebSocket traffic to the backend locally.

## 4) Trust the dev certificate on your phone (mkcert)

HTTPS will work only if your phone trusts the local root certificate used by mkcert. Install it once and you’re set for all future dev sessions.

1) Locate the mkcert CA folder on your PC:

```powershell
# Shows the directory containing rootCA.pem
npx mkcert -CAROOT
```

Typical Windows path: `%LOCALAPPDATA%\mkcert`. Copy `rootCA.pem` from that folder to your phone (AirDrop/USB/email/self‑send).

2) Install and trust the certificate on your phone:

- iOS
  - Share `rootCA.pem` to the device and tap to install the Profile.
  - Settings → General → About → Certificate Trust Settings → enable full trust for the imported root.
- Android (Chrome)
  - Share `rootCA.pem` to the device. Rename to `rootCA.cer` if Android doesn’t list it.
  - Settings → Security → Encryption & credentials → Install a certificate → CA certificate → pick the file.
  - Confirm install. Chrome will now trust sites signed by this CA.

If your device or policy prevents installing a user CA, use the tunnel option below.

## 5) Open the app on your phone

- Connect the phone to the same Wi‑Fi network as your PC (avoid guest networks with client isolation).
- In the phone browser, open:

```
https://<YOUR_PC_LAN_IP>:5176/
```

Example: `https://10.143.23.137:5176/`

Because the frontend proxies `/api` and `/ws` (Socket.IO) to `http://localhost:5100`, everything stays same‑origin from the phone’s perspective—no CORS issues. Camera/mic should work now.

## Alternative: Cloudflare Tunnel (no cert install)

If you can’t install the dev CA on mobile, use a trusted public tunnel that terminates HTTPS with a valid certificate.

1) Install cloudflared (one‑time):

```powershell
choco install cloudflared -y
# or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

2) Run a quick tunnel to your Vite server:

```powershell
cloudflared tunnel --url https://localhost:5176
```

You’ll get a URL like `https://random-name.trycloudflare.com`. Open that on your phone. WebSockets and the API proxy will work through the tunnel. No code changes required.

(ngrok works similarly: `ngrok http https://localhost:5176`.)

## Troubleshooting

- Blank camera/mic on phone
  - Ensure you used HTTPS and the phone trusts the dev CA (or you used a public tunnel).
  - Close other apps using the camera/mic.
- Can’t reach the site
  - Verify the LAN IP is correct and both devices are on the same subnet.
  - Disable "AP/client isolation" on your Wi‑Fi or switch off Guest Wi‑Fi.
  - Confirm the firewall rule on port 5176.
- WebSocket connect errors
  - The Vite proxy forwards `/ws` to the backend. Keep both servers running.
  - If tunneling, Cloudflare Tunnel supports WebSockets out of the box.
- Video still one‑way
  - Some devices need a page interaction (tap the video) to start playback due to autoplay policies.
  - Switch to a different network or try the tunnel to avoid NAT oddities.

You’re set. Open the LAN URL or the tunnel URL on your phone and test virtual sessions end‑to‑end with audio/video.