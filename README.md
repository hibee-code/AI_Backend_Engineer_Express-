# AI_Backend_Engineer_Express-

AI Backend Engineering class practice to Capstone project

## Stack

Express 5 · TypeScript · Prisma 7 (PostgreSQL via `@prisma/adapter-pg`) · zod · JWT + bcrypt · pino

Requires a local PostgreSQL server (no Docker).

## Getting started

```bash
cp .env.example .env        # then set JWT_SECRET (openssl rand -hex 32)
npm install                 # also runs `prisma generate`
npm run db:migrate          # create/apply migrations
npm run dev                 # http://localhost:3000
```

## Scripts

| Script                          | Purpose                       |
| ------------------------------- | ----------------------------- |
| `dev`                           | Run with reload (tsx watch)   |
| `build` / `start`               | Compile to `dist/` and run it |
| `typecheck` / `lint` / `format` | tsc, ESLint, Prettier         |
| `test`                          | Vitest + supertest (`tests/`) |
| `db:migrate` / `db:studio`      | Local database helpers        |

## Architecture

`routes → controllers → services → repositories → prisma`

- **routes/** mount middleware and map URLs to controllers
- **controllers/** own the request schemas (zod) and translate HTTP to service calls
- **services/** hold business logic and throw `AppError` for expected failures
- **repositories/** are the only layer that touches Prisma
- The Prisma client is generated into `src/generated/prisma` (gitignored)

## Endpoints

| Method      | Path                                    | Auth               |
| ----------- | --------------------------------------- | ------------------ |
| GET         | `/health`                               | none               |
| POST        | `/api/auth/register`, `/api/auth/login` | none               |
| GET         | `/api/auth/me`                          | JWT                |
| GET, POST   | `/api/documents`                        | JWT                |
| GET, DELETE | `/api/documents/:id`                    | JWT (owner only)   |
| GET         | `/api/chat/history`                     | JWT                |
| POST        | `/api/chat`                             | JWT                |
| GET         | `/api/admin/users`, `/api/admin/stats`  | JWT + `ADMIN` role |
