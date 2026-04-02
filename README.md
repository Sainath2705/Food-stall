# Stall 42 Food Ordering App

This repository contains a food stall ordering website for a short college event. Students scan a QR code, browse the menu, add items to their cart, submit an order, pay using your UPI QR, and receive an order token. Stall staff open a lightweight admin dashboard to verify UPI payments and move orders through the queue.

## Stack

- Node.js + Express
- Vanilla HTML, CSS, and JavaScript
- PostgreSQL
- Server-generated UPI QR codes

## Run Locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` if needed.
3. Keep `UPI_ID=sainathsherikar27@oksbi`.
4. Add `DATABASE_URL` if you want PostgreSQL persistence.
5. Run the SQL inside `database.sql` if you are using PostgreSQL.
6. Start the server with `npm run dev`.
7. Open `http://localhost:3000`.

## Product Flow

1. Student scans the stall QR and opens the menu.
2. Student adds items and fills pickup details.
3. The backend creates an order with `pending` payment state.
4. The checkout shows Google Pay and PhonePe styled QR cards generated from your UPI ID.
5. The student pays and taps `I Have Paid`.
6. The order moves to payment submitted state.
7. Stall staff verify the incoming UPI payment and mark the order as `paid`.
8. Staff continue updating it to `preparing`, `ready`, and `completed`.

## Pages

- `/` customer menu and cart
- `/success.html` order submitted / payment confirmation page
- `/admin.html` stall dashboard

## API Routes

- `GET /api/menu`
- `POST /api/checkout`
- `GET /api/upi/qr`
- `POST /api/orders/:publicId/confirm-payment`
- `GET /api/orders/:publicId`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:publicId`

## Environment Variables

Create a `.env` file with the following values:

```bash
PORT=3000
APP_NAME=Stall 42
DATABASE_URL=
UPI_ID=sainathsherikar27@oksbi
UPI_NAME=Sainath Sherikar
ADMIN_ACCESS_KEY=stall42-admin
```

## Database

PostgreSQL is the recommended database for this app. Supabase Postgres is a good hosted option if you want a quick setup, but local PostgreSQL also works.

Tables used:

- `categories`
- `menu_items`
- `orders`
- `order_items`
- `payments`

The SQL setup lives in the root `database.sql` file.

## Root Files

- `server.js` Express server, order APIs, UPI QR generation, and admin queue logic
- `index.html` customer menu page
- `script.js` customer cart, order creation, and UPI payment submission logic
- `success.html` post-payment-submission screen
- `success.js` success page data loading
- `admin.html` stall staff dashboard
- `admin.js` live order polling and status updates
- `styles.css` shared visual system for customer and admin pages
- `.env.example` runtime configuration template
- `.env` local development configuration
- `database.sql` PostgreSQL schema and seed menu data

## Notes

- If `DATABASE_URL` is missing, the app runs in local in-memory demo mode so you can still test the customer flow and the admin dashboard.
- The admin key defaults to `stall42-admin` for local development unless you override it.
- This version does not auto-verify payments with a gateway. Payment confirmation is manual through the admin dashboard because the payment mode is your own UPI QR.
- I could not run `npm install` or boot the server in this environment because command execution is blocked here.
- I replaced the gateway flow with generated QR-only payment cards based on your UPI ID. If you want the exact screenshot crops from the images you sent, drop those image files into the repo and I can swap them in directly.
- I removed the old root-level Next.js config files, but some nested scaffold folders from the first pass may still remain because nested-folder edits are unreliable in this environment.

## Change Log

### 2026-03-31

1. Created `README.md`.
2. Added the initial project brief, stack choice, page plan, environment variable list, and the first running change log entry.
3. Added the base Next.js project files: `package.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `postcss.config.mjs`, and `tailwind.config.ts`.
4. Added the shared app shell files: `app/layout.tsx` and `app/globals.css`.
5. Added environment, utility, fallback menu, and shared type helpers under `lib/`.
6. Added the first Supabase SQL setup files: `supabase/schema.sql` and `supabase/seed.sql`.
7. Pivoted the runnable app architecture to a simpler single-folder `Express + PostgreSQL + Razorpay` setup because nested file edits are currently unreliable in this environment.
8. Replaced the root `package.json` scripts and dependencies to support the Express server implementation.
9. Added `.env.example` for runtime configuration.
10. Added `database.sql` with schema, triggers, and seed menu data for the food stall app.
11. Added `server.js` with menu APIs, checkout creation, Razorpay verification, webhook handling, order fetch, and admin order update routes.
12. Added `index.html`, `styles.css`, and `script.js` for the customer-facing ordering flow with categories, cart state, checkout modal, and Razorpay launch.
13. Added `success.html` and `success.js` for the post-payment confirmation page and order-token lookup flow.
14. Added `admin.html` and `admin.js` for the stall-side dashboard with live polling and order status updates.
15. Updated the README with local setup steps, route inventory, root file map, and current environment limitations.
16. Fixed the success page mobile layout so pickup instructions remain visible on smaller screens.
17. Hardened the server catch-all route to avoid wildcard routing issues across Express versions.
18. Moved Razorpay raw-body parsing onto the webhook route itself so signature verification was less fragile.
19. Locked down file serving so the server only exposed the intended public pages and frontend assets.
20. Normalized webhook signature headers so Razorpay verification was more robust across Node header shapes.
21. Made PostgreSQL SSL conditional so the same server worked with both Supabase-hosted databases and local PostgreSQL.
22. Added a local demo mode so the app could create in-memory orders and keep the admin dashboard usable even without a configured database.
23. Added a demo checkout fallback so local testing still worked when Razorpay keys were not configured.
24. Added a default local admin key (`stall42-admin`) to make the admin dashboard usable before `.env` was fully set up.
25. Extended admin status updates to work in demo mode too, so the full stall queue flow could be tested locally without PostgreSQL.
26. Updated `.env.example` to include the default local admin key so the demo dashboard setup was clearer.
27. Added a local `.env` file with the default demo admin key so the admin panel could run without extra setup.
28. Replaced the Razorpay dependency with a server-side QR generation dependency.
29. Updated `.env` and `.env.example` to use your UPI ID (`sainathsherikar27@oksbi`) and payee name.
30. Rebuilt `server.js` around a manual UPI payment flow with QR generation, payment submission, and admin verification.
31. Reworked `index.html` and `script.js` so checkout now creates an order, shows Google Pay and PhonePe QR cards, and submits manual payment confirmation.
32. Updated `styles.css` with the new UPI payment step, QR card, and payment-detail styles.
33. Reworked `success.html` and `success.js` so the success screen reflects manual UPI verification instead of gateway-confirmed payment.
34. Reworked `admin.html` and `admin.js` so the stall dashboard focuses on verifying UPI payments and then moving orders through the queue.
35. Updated this README so the stack, setup, routes, and behavior now match the UPI QR payment flow.
36. Documented the limitation that the exact attached QR screenshots were not directly extractable into repo assets from this environment, so the current build uses generated QR-only cards based on your UPI ID.
37. Updated `database.sql` so fresh payment records default to the new `upi_qr` provider instead of the old gateway default.
38. Removed temporary workspace check files that were no longer needed.
39. Removed old gateway-specific order columns from the fresh SQL schema so the setup better matches the new UPI-only payment flow.
40. Removed the unused root-level Next.js config files so the project structure matches the current Express app more closely.
41. Fixed the checkout modal layout so the payment step can scroll properly on smaller screens and shorter viewports.
