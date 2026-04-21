# Smart Campus Service Portal - Run Guide

This file contains only practical setup and run instructions.

## 1) Prerequisites

- Install Node.js (LTS version recommended, 18+).
- Install VS Code.
- Open folder `C:\FSD` in VS Code.

## 2) Backend Setup

1. Open Terminal 1 in VS Code.
2. Run:

```bash
cd backend
npm install
```

3. Create backend environment file:
   - Copy `backend/.env.example`
   - Rename copied file to `backend/.env`
4. Open `backend/.env` and set:

```env
PORT=5000
JWT_SECRET=your_strong_secret_key_here
ADMIN_EMAIL=admin@campus.local
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Campus Admin
```

5. Start backend server:

```bash
npm run dev
```

Backend runs at `http://localhost:5000`.

## 3) Frontend Setup

1. Open Terminal 2 in VS Code.
2. Run:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at the URL shown by Vite (usually `http://localhost:5173`).

## 4) Use the App

1. Open frontend URL in browser.
2. Register a new user:
   - Role can be `student`, `staff`, or `admin`.
3. Login with that account.
4. Try these features:
   - Create service tickets
   - View ticket list
   - Click any ticket to open the detail modal
   - Add comments (Activity Timeline)
   - Upload attachments to tickets (max 5MB)
   - If role is staff/admin, assign tickets, change priority, update ticket status
   - Notifications panel shows updates when staff assigns/updates tickets
   - Admin Panel (admin only): manage users, roles, enable/disable accounts
   - Analytics tab: resolution time, overdue count, workload

### Demo accounts

- **Admin demo login**:
  - Email: `admin@campus.local`
  - Password: `Admin@123`

## 5) API Quick Test (Optional)

Open `http://localhost:5000/` in browser.
You should see:

```json
{ "message": "Smart Campus Service Portal API is running." }
```

## 6) Common Troubleshooting

- If port 5000 is busy, change `PORT` in `backend/.env` and update `frontend/src/api.js` base URL.
- If backend crashes with `EADDRINUSE` on 5000, kill the process using 5000 and restart backend.
- If `npm install` fails, check internet and Node version.
- If login fails with token error, make sure `JWT_SECRET` exists in `backend/.env` and restart backend.
- If attachment upload fails, verify backend is running and `http://localhost:5000/uploads` is reachable.

## 7) Deployment (Optional)

Quick simplest deployment (recommended for demo):

- **Frontend**: deploy `frontend/` to Vercel/Netlify.
- **Backend**: deploy `backend/` to Render/Railway.
- Update `frontend/src/api.js` `baseURL` to your hosted backend URL.
