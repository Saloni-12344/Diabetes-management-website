## Progress (Day 1–3)

### Day 1: Project Foundation
- Monorepo setup with 3 apps:
  - `client` (React + TypeScript)
  - `server` (Node.js + Express + TypeScript)
  - `worker` (TypeScript starter for background jobs)
- Workspace scripts added at root (`dev:client`, `dev:server`, `dev:worker`)
- Basic lint/format config added (`ESLint`, `Prettier`, `.editorconfig`)

### Day 2: Database Setup
- MongoDB connection integrated with Mongoose
- DB helper created: `server/src/config/db.ts`
- Base models created:
  - `User` model
  - `FamilyMember` model (owner/viewer relationship + unique index)
- Health route improved:
  - `GET /health` returns server + DB status

### Day 3: Auth API (JWT + bcrypt)
- Auth dependencies added (`bcryptjs`, `jsonwebtoken`)
- Auth endpoints implemented:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me` (protected)
- JWT utility and auth middleware added
- Protected route support with `Authorization: Bearer <token>`

### Day 4: Auth UI (frontend)
- Login/Register/Logout UI added
- Connected frontend to auth APIs
- Token persistence in local storage
- Current-user fetch using `/api/auth/me`

### Day 5: Protected Routes + Role Access
- Backend route protection with `requireAuth`
- Role guard support with `requireRole`
- Owner/viewer access boundaries prepared

### Day 6: Family Roles + Invite Flow
- Family APIs added:
  - `POST /api/family/invite`
  - `POST /api/family/accept/:inviteId`
  - `GET /api/family/mine`
  - `DELETE /api/family/member/:memberUserId`
- Owner-only controls for invite/remove

### Day 7: QA + Postman
- Postman collection added for auth + family flow
- End-to-end test order documented (register/login/invite/accept/list/remove)

### Day 8: Glucose API
- Glucose model ready
- API scope planned: create/list/filter by date

### Day 9: Glucose UI
- Glucose dashboard section planned
- Filters planned: `today`, `7d`, `30d`

### Day 10: Insulin API + UI
- Insulin model ready
- API/UI scope planned for manual insulin logging

### Day 11: Food API + Food Log UI
- Meal and food models ready
- API/UI scope planned for meal logging + macros

### Day 12: Personal Food Library CRUD
- Food library model ready
- CRUD scope planned for reusable dish entries

### Day 13: “Mom’s Kitchen” Tab
- Quick-pick saved dish workflow planned
- Family-owner food library pattern defined

### Day 14: QA + API Tests
- Test target: glucose/insulin/food APIs
- Stability and validation checks planned

---
---

## Current Tech Stack
- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database: MongoDB + Mongoose
- Auth: JWT + bcryptjs

---

## Local Setup (Current)
```bash
git clone https://github.com/Saloni-12344/Diabetes-management-website.git
cd Diabetes-management-website
npm install
```

Create `server/.env`:
```env
SERVER_PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/diabetes_app
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

Run:
```bash
npm run dev:server
npm run dev:client
```

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5001/health`

---

## API (Day 3)
### Register
`POST /api/auth/register`
```json
{
  "name": "Saloni",
  "email": "saloni@example.com",
  "password": "password123",
  "role": "owner"
}
```

### Login
`POST /api/auth/login`
```json
{
  "email": "saloni@example.com",
  "password": "password123"
}
```

### Current user (Protected)
`GET /api/auth/me`

Header:
`Authorization: Bearer <token>`
