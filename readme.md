# backendsw - Run Guide

## Local (recommended)

```powershell
cd C:\Users\Home\Desktop\smartwebifysite\backendsw
npm install
```

Start MySQL + Redis if not already running:

```powershell
docker run -d --name backendsw-mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=backendsw -p 3306:3306 mysql:8.0
docker run -d --name backendsw-redis -p 6379:6379 redis:7
```

Create env files (the `dev` script expects `.env.local`):

```powershell
Copy-Item .env.example .env -Force
Copy-Item .env .env.local -Force
```

Set at least these values in `.env` and `.env.local`:

- `DATABASE_URL="mysql://root:password@localhost:3306/backendsw"`
- `REDIS_URL="redis://127.0.0.1:6379"`
- `PORT="3000"`
- `JWT_SECRET="replace-with-strong-secret"`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

Initialize Prisma and run:

```powershell
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

Optional worker (second terminal):

```powershell
cd C:\Users\Home\Desktop\smartwebifysite\backendsw
npm run dev:worker
```

Health check:

- `http://localhost:3000/api`

## Docker Compose

Create `backendsw/.env.docker` with:

- `DATABASE_URL=mysql://root:password@host.docker.internal:3306/backendsw`
- `REDIS_URL=redis://redis:6379`
- `PORT=3000`
- `JWT_SECRET=...`
- Cloudinary vars

Then run:

```powershell
cd C:\Users\Home\Desktop\smartwebifysite\backendsw
docker compose up --build api

Start everything :

```powershell
docker compose up -d
```

Note: with the current `entrypoint.sh`, a single container already starts both API and worker, so use the `api` service only to avoid duplicate workers.

Rebuild + start:

```powershell
docker compose down
docker compose up -d --build
docker compose ps -a
docker compose logs -f api
docker compose logs -f worker
