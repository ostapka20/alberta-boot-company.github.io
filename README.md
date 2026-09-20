# Alberta Boot Company — Production Database

A simple dark production database for:
- Leather added (SqFt)
- Leather scrap (SqFt)
- Pairs made (separate from leather)
- Daily dashboard totals
- Current leather inventory by leather type
- Search and date/type filters
- Edit/delete records
- Multiple employees using one Supabase/Postgres database

## Stack
Static HTML/CSS/JavaScript + Supabase Postgres/Auth. The Supabase browser client is loaded from CDN.

## Files
- `index.html` — app UI
- `style.css` — dark theme
- `app.js` — application logic
- `config.js` — Supabase URL/key
- `supabase.sql` — database table + RLS policies

## Important security note
Only put the Supabase publishable key in `config.js`. Never put a Supabase service-role/secret key in the website.
