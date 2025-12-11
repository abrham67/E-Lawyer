# System Administration Manual

## Overview
This manual covers installation, configuration, maintenance, and troubleshooting for E-Legal Connect.

## Installation
- Prerequisites: Node.js, MongoDB
- Clone the repository and run `npm install`
- Configure environment variables in `.env`
- Start the backend and frontend servers

## Configuration
- Edit `config.toml` and environment variables as needed

## Maintenance
- Regularly back up the database
- Monitor server logs for errors

## Administrative Privileges
- **User oversight**: Visit `/api/admin/users` (or the admin dashboard) to review all accounts, optionally including suspended users.
- **Identity verification**: Set `id_verified` via `PATCH /api/admin/users/:id/verify` to confirm submitted credentials once reviewed.
- **Account suspension**: Use `PATCH /api/admin/users/:id/suspension` with `{ "suspend": true, "reason": "..." }` to ban abusive users; suspended accounts cannot log in.
- **Complaint handling**: View all submitted complaints at `/api/complaints` and update their status/resolution notes; non-admins only see their own submissions.
- **Data hygiene**: Leverage the existing `/api/admin/purge` endpoint for catastrophic resets in lower environments. Never run in production without a full backup.
- **Confidentiality guardrails**: Client–attorney case files and documents are not available to admins. Only assigned lawyers, clients, and courts can read case details or download evidence. Request sanitized exports from responsible parties if audit evidence is needed.

## Complaint Workflow
1. Any authenticated user can submit a complaint through `POST /api/complaints` with a subject, description, and optional target user.
2. Administrators review complaints, update their status (`open`, `in_review`, `resolved`, `rejected`), and add resolution notes.
3. Resolved complaints remain archived for audit purposes.

## Troubleshooting
- For database issues, check MongoDB status
- For server errors, review logs in the backend directory

## Help
For more help, click the help icon (?) in the app or visit the FAQ.
