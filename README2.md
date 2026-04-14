# Smart Campus Service Portal - Complete Explanation

This document explains the project in detail so you can present it clearly.

## 1) Project Goal

The Smart Campus Service Portal is a full stack web app where:

- Students submit campus service tickets (maintenance, IT, hostel, etc.).
- Staff/Admin manage ticket status.
- Staff/Admin publish announcements.
- Everyone can view announcements.

It demonstrates:

- Authentication and authorization
- REST API design
- Role-based access control
- Frontend-backend integration
- State management in React

## 2) Tech Stack

### Backend

- Node.js + Express
- JSON file storage (`db.json`) for easy local running
- JWT for login sessions
- bcrypt for password hashing

### Frontend

- React (Vite)
- React Router for routes
- Axios for API requests

## 3) Folder Structure

```text
FSD/
  backend/
    src/
      data/
        db.json
        store.js
      middleware/
        auth.js
      routes/
        auth.routes.js
        tickets.routes.js
        announcements.routes.js
        dashboard.routes.js
      index.js
  frontend/
    src/
      pages/
        LoginPage.jsx
        RegisterPage.jsx
        DashboardPage.jsx
      api.js
      App.jsx
      main.jsx
      styles.css
```

## 4) Backend Explained

### `backend/src/index.js`

- Creates Express app.
- Enables `cors()` so frontend can call backend from another port.
- Enables `express.json()` to read JSON body from requests.
- Registers route groups:
  - `/api/auth`
  - `/api/tickets`
  - `/api/announcements`
  - `/api/dashboard`
- Starts server on `PORT`.

### `backend/src/data/store.js`

- Reads and writes the `db.json` file.
- `readDb()` returns JS object from file.
- `writeDb(data)` saves object back to file.

This acts like a lightweight local database.

### `backend/src/middleware/auth.js`

- `requireAuth`:
  - Reads `Authorization: Bearer <token>`.
  - Verifies token with `JWT_SECRET`.
  - If valid, attaches decoded user to `req.user`.
  - If invalid/missing, returns `401`.
- `requireRole(...roles)`:
  - Checks if logged-in user role is allowed.
  - If not allowed, returns `403`.

### `backend/src/routes/auth.routes.js`

- `POST /register`:
  - Validates input.
  - Checks if email exists.
  - Hashes password using bcrypt.
  - Saves user in `db.json`.
- `POST /login`:
  - Validates credentials.
  - Compares password hash.
  - Returns JWT token and user object.
- `GET /me`:
  - Protected route.
  - Returns current decoded user from token.

### `backend/src/routes/tickets.routes.js`

- `GET /tickets`:
  - Student: only own tickets.
  - Staff/Admin: all tickets.
- `POST /tickets`:
  - Any logged-in user can create ticket.
- `PATCH /tickets/:id/status`:
  - Only staff/admin can update status.
- `POST /tickets/:id/comments`:
  - Adds comment to ticket.
  - Students can comment only on their own tickets.

### `backend/src/routes/announcements.routes.js`

- `GET /announcements`: public list for all users.
- `POST /announcements`: only staff/admin can create.

### `backend/src/routes/dashboard.routes.js`

- `GET /dashboard/stats` gives summary counts:
  - Total tickets
  - Open, in progress, resolved
  - Total announcements
- Student sees their own ticket stats.
- Staff/Admin see global stats.

## 5) Frontend Explained

### `frontend/src/main.jsx`

- Entry point of React app.
- Wraps app inside `BrowserRouter` to enable page routing.
- Loads global stylesheet.

### `frontend/src/api.js`

- Creates Axios instance with backend base URL.
- Uses request interceptor:
  - Reads token from localStorage
  - Automatically adds `Authorization` header to every API call

### `frontend/src/App.jsx`

- Defines app routes:
  - `/login`
  - `/register`
  - `/dashboard`
- Implements protected route logic:
  - If user not authenticated, redirect to login.
- On app load:
  - If token exists, calls `/auth/me` to restore user session.

### `frontend/src/pages/LoginPage.jsx`

- Collects email + password.
- Calls `/auth/login`.
- Saves token to localStorage.
- Saves user in app state.
- Redirects to dashboard.

### `frontend/src/pages/RegisterPage.jsx`

- Collects name, email, password, role.
- Calls `/auth/register`.
- Shows success/error messages.
- Redirects to login after successful registration.

### `frontend/src/pages/DashboardPage.jsx`

- Loads:
  - dashboard stats
  - tickets list
  - announcements
- Includes forms for:
  - creating ticket (all users)
  - creating announcement (staff/admin only)
- Shows ticket action buttons (staff/admin only):
  - mark in progress
  - mark resolved
  - close
- Handles logout by removing token.

### `frontend/src/styles.css`

- Defines layout, cards, forms, buttons, responsive grid.
- Mobile responsive behavior for smaller screens.

## 6) Full Request-Response Flow (Important for Viva)

1. User logs in from React page.
2. Frontend sends email/password to backend `/api/auth/login`.
3. Backend verifies password and sends JWT token.
4. Frontend stores token in localStorage.
5. Future API calls automatically include token header via Axios interceptor.
6. Backend `requireAuth` middleware verifies token and allows request.
7. Protected routes perform role checks using `requireRole`.

## 7) Security Concepts Used

- Passwords are hashed (`bcrypt`) and never stored as plain text.
- JWT protects private endpoints.
- Role checks block unauthorized actions.
- Input validation returns proper HTTP status codes.

## 8) How to Explain "Every Line" Strategy to Teacher

Use this sequence while presenting each file:

1. Explain imports (why each package is needed).
2. Explain variables/constants.
3. Explain each function:
   - Input
   - Logic
   - Output
4. Explain route + middleware order.
5. Explain error handling and status codes.
6. Explain how frontend and backend connect.

This README gives the conceptual mapping for that explanation.

## 9) Suggested Future Improvements

- Move from JSON file to MongoDB or PostgreSQL.
- Add form validation libraries.
- Add unit/integration tests.
- Add pagination and search on tickets.
- Add attachments for service requests.
