# API Documentation

## Overview
This document describes the main API endpoints for E-Legal Connect, including authentication, user management, case management, document upload, and communication.

## Authentication
- `POST /api/auth/login` — User login
- `POST /api/auth/register` — User registration

## Users
- `GET /api/users` — List all users
- `PATCH /api/users/:id/role` — Change user role

## Cases
- `GET /api/cases` — List all cases
- `PATCH /api/cases/:id` — Update case status

## Documents
- `POST /api/documents/:caseId` — Upload document to a case
- `GET /api/documents/:caseId` — List documents for a case
- `GET /api/documents/download/:id` — Download a document

## Communication
- `GET /api/communication/messages` — List messages
- `POST /api/communication/messages` — Send message

## Reports
- `GET /api/reports` — System reports

## Data Formats
- All endpoints use JSON for request and response bodies unless uploading files (multipart/form-data).

## Authentication
- All endpoints require a Bearer token in the `Authorization` header.

For more details, see the backend code or contact the system administrator.
