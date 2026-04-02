# Stall 42 Food Ordering App

Food stall ordering website for a short college event. Students open the menu, place an order, pay with your UPI QR, and staff manage the queue from a simple admin page.

## Stack

- Node.js + Express
- Vanilla HTML, CSS, and JavaScript
- Supabase-hosted PostgreSQL
- Server-generated UPI QR codes
- Vercel deployment

## Pages

- `/` customer menu
- `/success.html` payment-submitted screen
- `/admin.html` stall dashboard

Frontend files live in `public/` so Vercel can serve them directly.

## API Routes

- `GET /api/health`
- `GET /api/menu`
- `POST /api/checkout`
- `GET /api/upi/qr`
- `POST /api/orders/:publicId/confirm-payment`
- `GET /api/orders/:publicId`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:publicId`

## Supabase Setup

1. Create a new Supabase project.
2. Open the SQL Editor in Supabase.
3. Run the SQL from `database.sql`.
4. In Supabase, open `Connect` for the database and copy the Transaction Pooler connection string.
5. Set that connection string as `SUPABASE_DB_URL` in Vercel and in your local `.env`.

## Environment Variables

Use this shape for local development and Vercel:

```bash
PORT=3000
APP_NAME=Stall 42
SUPABASE_DB_URL=postgresql://postgres.[YOUR-PROJECT-REF]:YOUR-PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
UPI_ID=sainathsherikar27@oksbi
UPI_NAME=Sainath Sherikar
ADMIN_ACCESS_KEY=stall42-admin
```

`DATABASE_URL` is still accepted as a fallback, but `SUPABASE_DB_URL` is now the preferred variable for this project.

## Run Locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Add your Supabase pooled connection string to `SUPABASE_DB_URL`.
4. Start the app with `npm run dev`.
5. Open `http://localhost:3000`.

## Deploy To Vercel

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add these environment variables in Vercel: `SUPABASE_DB_URL`, `APP_NAME`, `UPI_ID`, `UPI_NAME`, and `ADMIN_ACCESS_KEY`.
4. Redeploy. If an older broken Express bundle was cached, trigger the redeploy with the build cache cleared.

The app now targets Supabase instead of a local-only PostgreSQL setup, exports the Express app in a Vercel-friendly way, keeps demo mode limited to local development only, and uses `public/` for frontend assets to match Vercel’s Express guidance.
