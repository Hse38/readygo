# ReadyGo

ReadyGo is a mobile app that helps you plan events, manage checklists, and get travel-time insights — backed by a Node.js API.

## Monorepo structure

```
readygo/
├── apps/
│   ├── mobile/    Expo (React Native) app
│   └── backend/   Express + TypeScript API
└── packages/
    └── types/     Shared TypeScript types
```

## Prerequisites

- Node.js 18+
- PostgreSQL (for the backend)
- Expo Go or a simulator/device (for mobile)

## Setup

From the repository root:

```bash
npm install
```

Configure each app:

- **Backend:** copy `apps/backend/.env.example` to `apps/backend/.env` and set `DATABASE_URL`, `JWT_SECRET`, and OAuth client IDs.
- **Mobile:** follow any env setup in `apps/mobile` as needed for your environment.

Install workspace dependencies (hoisted from root):

```bash
cd apps/backend && npm run prisma:generate
```

## Run

**Mobile only:**

```bash
npm run dev:mobile
```

**Backend only:**

```bash
npm run dev:backend
```

**Both at once:**

```bash
npm run dev
```

- Mobile: Expo dev server (default Expo port).
- Backend: API on `http://localhost:3000` (see `PORT` in backend `.env`).

## Health check

With the backend running:

```bash
curl http://localhost:3000/health
```

Expected: `{ "status": "ok" }`
