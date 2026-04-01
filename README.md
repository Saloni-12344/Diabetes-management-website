# GlucoFamily

A family-shared diabetes management app. An **Owner** logs glucose, insulin, and meals; invited **Viewers** (family members) monitor the owner's data in real time.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite |
| Backend | Node.js · Express · TypeScript |
| Database | PostgreSQL (via Homebrew) · Prisma ORM |
| Auth | JWT · bcryptjs |
| Real-time | Socket.IO |
| Charts | Recharts |

---

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL 14** — installed via Homebrew
  ```bash
  brew install postgresql@14
  brew services start postgresql@14
  ```

---

## Local Setup

```bash
git clone https://github.com/Saloni-12344/Diabetes-management-website.git
cd Diabetes-management-website
npm install          # installs root + all workspaces
```

### 1 — Create the database

```bash
psql -U $(whoami) postgres -c "CREATE DATABASE glucofamily;"
```

### 2 — Configure the server

Create `server/.env`:

```env
SERVER_PORT=5001
DATABASE_URL="postgresql://<your-mac-username>@localhost:5432/glucofamily"
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173

# Optional — Gemini photo analysis for Mom's Kitchen
# GEMINI_API_KEY=your_key_from_aistudio.google.com

# Optional — Resend for real invite emails
# RESEND_API_KEY=your_key_from_resend.com
```

> Replace `<your-mac-username>` with the output of `whoami`.

### 3 — Push the database schema

```bash
cd server
npx prisma db push
cd ..
```

### 4 — Start the servers

In two separate terminals:

```bash
# Terminal 1 — backend (hot-reload)
npm run dev:server

# Terminal 2 — frontend (hot-reload)
npm run dev:client
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:5001/health

---

## Project Structure

```
diabetes-app/
├── client/          # React + Vite frontend
│   └── src/
│       ├── pages/   # Dashboard, Glucose, Insulin, Meals, MomsKitchen, Family, Alerts, History
│       └── lib/     # authFetch utility
├── server/          # Express + Prisma backend
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       ├── lib/     # Prisma client, Socket.IO
│       └── utils/
└── package.json     # Root workspace config
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register (role: `owner` \| `viewer`) |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Current user (protected) |
| POST | `/api/auth/forgot-password` | Generate reset code |
| POST | `/api/auth/reset-password` | Reset with code |

### Health data (all protected, owner-scoped)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/glucose` | Log a glucose reading |
| GET | `/api/glucose?filter=7d` | List readings (filters: `today`, `7d`, `30d`) |
| DELETE | `/api/glucose/:id` | Delete a reading |
| POST | `/api/insulin` | Log an insulin dose |
| GET | `/api/insulin?filter=today` | List doses |
| DELETE | `/api/insulin/:id` | Delete a dose |
| POST | `/api/meals` | Log a meal |
| GET | `/api/meals?filter=today` | List meal logs |
| DELETE | `/api/meals/:id` | Delete a meal log |

### Food Library (Mom's Kitchen)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/food-library` | List family's saved dishes |
| POST | `/api/food-library` | Save a new dish |
| PUT | `/api/food-library/:id` | Update a dish |
| DELETE | `/api/food-library/:id` | Remove a dish |

### Family

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/family/invite` | Invite by email (creates PendingInvite if not yet registered) |
| POST | `/api/family/accept/:inviteId` | Accept an invite |
| GET | `/api/family/mine` | List members / my membership |
| DELETE | `/api/family/member/:memberUserId` | Remove a member (owner only) |

### Viewer

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/viewer/summary` | Owner's live health summary (viewer only) |

### Alerts & History

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts` | List alerts |
| GET | `/api/alerts/unread-count` | Unread badge count |
| PATCH | `/api/alerts/:id/read` | Mark one read |
| POST | `/api/alerts/mark-all-read` | Mark all read |
| GET | `/api/history` | Full log history |

---

## Family Invite Flow

1. Owner enters a viewer's email in the **Family** tab and clicks **Send Invite**.
2. If the viewer already has an account, a `FamilyMember` record is created immediately.
3. If not, a `PendingInvite` is stored. When the viewer registers with that email address, they are automatically linked to the family.
4. The viewer accepts the invite from their own Family tab.
5. Once accepted, the Viewer Dashboard shows the owner's live data.

> **Note:** No email is sent automatically yet. Share the invite by messaging the viewer their email address and asking them to register.

---

## Available Scripts

```bash
# From the repo root:
npm run dev:client        # Start Vite dev server
npm run dev:server        # Start Express dev server (tsx watch)
npm run build             # Build both client and server

# From server/:
npm run build             # tsc — must exit 0 before deploying
npm run lint              # ESLint 9 flat config
npx prisma studio         # Visual DB browser
npx prisma db push        # Sync schema → DB (dev)

# From client/:
npm run build             # Vite production build
npm run lint              # ESLint 9 flat config
npm run preview           # Preview production build locally
```

---

## Features

- **Glucose logging** — manual entry with unit support (mg/dL / mmol/L), 7-day trend chart
- **Insulin logging** — fast/slow-acting, idempotency-key deduplication
- **Meal logging** — carbs, protein, fat, calories; daily macro pie chart
- **Mom's Kitchen** — family food library for quick meal logging from saved dishes
- **Real-time alerts** — Socket.IO pushes critical glucose alerts to all family connections
- **Viewer Dashboard** — live owner health summary (last glucose, trend, last meal, last insulin, today's counts)
- **Role-based access** — Owners manage data; Viewers read-only
- **Pending invite system** — Invite unregistered users; they auto-link on registration
