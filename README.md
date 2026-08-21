# SkyView Cleaning Services

Booking site for a house-cleaning business, built with Next.js (App Router) and Prisma/Postgres. Customers submit a booking through a modal on the homepage; the booking is stored in the database and the admin is notified over WhatsApp (Twilio). Admins manage bookings and staff accounts from `/admin`.

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Prisma** ORM with **PostgreSQL** (hosted on Neon)
- **Tailwind CSS**
- **Twilio WhatsApp Business API** for admin booking notifications
- Deployed on **Vercel**

## Project layout

- `src/app/` — pages, layouts, and API routes (`src/app/api/**/route.ts`)
- `src/app/components/` — client components (booking modal, admin dashboard, login, etc.)
- `src/lib/` — shared server/client modules: `prisma.ts` (Prisma client singleton), `whatsapp.ts` (Twilio WhatsApp service), `tokenUtils.ts` (admin session token helpers)
- `prisma/` — schema and migrations

## Environment variables

Set these in `.env` locally and in your deployment platform's dashboard (never commit real values):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number, e.g. `whatsapp:+14155238886` |
| `ADMIN_WHATSAPP_PHONE` | Number that receives new-booking notifications, e.g. `whatsapp:+91...` |
| `TWILIO_TEMPLATE_CONTENT_SID` | ContentSid of the approved WhatsApp template used for the admin notification |

## Local development

```bash
npm install
npx prisma generate
npx prisma migrate dev   # applies schema, creates the local dev database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Prisma

```bash
npx prisma generate       # regenerate client after a schema change
npx prisma migrate dev    # create/apply a migration in development
npx prisma migrate deploy # apply migrations in production
npx prisma studio         # browse the database
```

## Twilio WhatsApp template

Admin notifications are sent via a Twilio Content Template (`TWILIO_TEMPLATE_CONTENT_SID`). To set one up:

1. Twilio Console → Messaging → Content Editor → create a template with variables for name, service, date, and time (`{{1}}`–`{{4}}`).
2. Copy the resulting ContentSid into `TWILIO_TEMPLATE_CONTENT_SID`.
3. In sandbox mode, the recipient number must first join the sandbox by sending `join <sandbox-code>` to the Twilio WhatsApp number.
4. For production, you need an approved WhatsApp Business API sender and approved templates (sandbox numbers/templates won't work).

## Deployment

The app deploys to Vercel (`vercel.json` sets the build/install commands and API function timeout). Environment variables must be set in the **Vercel dashboard** — do not add secrets to `vercel.json` or commit them anywhere in the repo.

```bash
vercel --prod
npx prisma migrate deploy   # after deploying, apply any pending migrations
```
