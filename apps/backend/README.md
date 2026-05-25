# ReadyGo Backend

Node.js + Express + TypeScript API for the ReadyGo mobile app.

## Tech stack

- Express 5 + TypeScript
- PostgreSQL via Prisma ORM
- JWT authentication
- dotenv for configuration

## Getting started

```bash
cd readygo-backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## API routes

| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/health` | No | Ready |
| POST | `/auth/apple` | No | Scaffold |
| POST | `/auth/google` | No | Scaffold |
| GET | `/events` | Yes | Scaffold |
| POST | `/events` | Yes | Scaffold |
| GET | `/events/:id` | Yes | Scaffold |
| GET | `/events/:id/checklist` | Yes | Scaffold |
| PUT | `/checklist/:itemId` | Yes | Scaffold |
| GET | `/profile` | Yes | Scaffold |
| POST | `/profile` | Yes | Scaffold |
| GET | `/travel-time` | Yes | Scaffold |

Protected routes require `Authorization: Bearer <token>`.

## Project structure

```
src/
├── controllers/
├── middleware/
├── routes/
├── services/
├── prisma/
├── lib/
├── types/
└── index.ts
```
