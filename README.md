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
