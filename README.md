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
