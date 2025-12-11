# Time-gated invite links for virtual court sessions

This document explains how invite links are generated and enforced.

- When a virtual court session is created (POST /api/courtsessions), the backend generates:
  - `invite_token`: a random token for the session
  - `invite_active_from`: computed from `scheduleDate` + optional `startTime`
- Participants (lawyers and clients) receive a notification with an invite URL: `/invite/:token`.
- The invite URL calls `GET /api/courtsessions/invite/:token` to check if the invite is active.
  - Response contains `{ active, session_id, join_path, active_from }`.
  - If `active` is true, the frontend redirects to `join_path` (e.g., `/meeting/:sessionId`).
  - If `active` is false, a countdown is displayed until activation.
- Defense-in-depth: the signaling server denies joining the room before `invite_active_from` and for ended/cancelled sessions.

Notes and tips:
- Time gating uses server time; ensure the server has correct time (NTP).
- `startTime` is expected in `HH:mm` or `HH:mm:ss` (24h) and combined with `scheduleDate`.
- If you need to invalidate an invite, rotate `invite_token` on the session document and re-send invites.
