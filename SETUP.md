# Closd Voice Dashboard — Setup

## Prerequisites
- Node.js 18+
- npm or pnpm

## Install
```
git clone https://github.com/landonhauser7-sys/closd-voice-dashboard.git
cd closd-voice-dashboard
npm install
```

## Environment
Create `.env.local` in the repo root with these keys (values shared separately):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
TELNYX_API_KEY=
```

## Run dev server
```
npm run dev
```

Dashboard at http://localhost:3000.

## Database schema
Run `db/schema.sql` in the Supabase SQL editor before first use. Schema is idempotent.
