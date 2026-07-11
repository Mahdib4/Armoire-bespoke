# Armoire Bespoke

A premium, animation-rich storefront for **Armoire Bespoke** (made-to-measure tailoring), with a
full admin panel, custom/ready-made product flows, cart & checkout, and automated order emails.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Prisma · Tailwind v4**, and
**Three.js / GSAP / Lenis / Anime.js / Atropos** for the luxury motion layer.

---

## Stack

- **Database:** Neon (PostgreSQL) via Prisma.
- **Object storage:** Cloudflare R2 (S3-compatible) for admin uploads and (optionally) all media.
- **App:** Next.js 16 on Vercel.

## Quick start

1. Create a **Neon** project and copy both connection strings into `.env`
   (`DATABASE_URL` = the `-pooler` string, `DIRECT_URL` = the direct string). See `.env.example`.
2. (Optional for local dev) create a **Cloudflare R2** bucket + S3 API token and fill `R2_*` in `.env`.
   If you leave `R2_*` blank, uploads fall back to local `public/uploads`.

```bash
cd armoire-site
npm install
npm run setup     # organize media → transcode videos → db push → seed   (first time only)
npm run dev       # http://localhost:3000
```

`npm run setup` runs, in order:

1. `media:organize` – copies the raw category/product photos, style charts and logos from the
   parent `F:\ArmoireBespoke` folders into `public/media/**` and writes `public/media/manifest.json`.
2. `media:transcode` – converts the `.mov` section videos to web-optimized MP4 + posters using the
   bundled `ffmpeg-static` binary.
3. `prisma db push` – creates the schema in your Neon database (uses `DIRECT_URL`).
4. `db:seed` – populates categories, 26 products, images, customization options, measurements,
   quotes, sections, site settings, and the admin user.

Re-seed anytime with `npm run db:reset`.

> **Local dev DB:** since the database is now Postgres, local dev also needs a Postgres URL. Easiest
> is a free **Neon branch** (branch your prod DB for dev). A local Postgres (`docker run -e
> POSTGRES_PASSWORD=pw -p 5432:5432 postgres`) also works — point `DATABASE_URL`/`DIRECT_URL` at it.

## Admin panel

- URL: **`/admin`** (redirects to `/admin/login`).
- Default credentials come from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) — seeded as
  `admin@armoirebespoke.com` / `armoire2026`. **Change these before going live.**
- Manage: products (images, price, type, description, bespoke options, specs), categories & banners
  (video/image + measurement fields), homepage sections, quotes, site settings (logo, slogan, hero
  video, contact), orders, and the media library.
- When logged in, a floating **Admin bar** appears on the live site with contextual "Edit this
  product / collection / homepage" links.

## Products: Custom vs Ready-Made

Each product has a **type** toggle in the admin:

- **Made-to-Measure (CUSTOM)** – the product page shows the bespoke configurator (fabric, lapel,
  collar, cuff, pocket, vent — only the options assigned to that product) plus measurement inputs.
- **Ready-Made (READYMADE)** – the product page shows a size selector + size chart instead.

All products are seeded as Made-to-Measure by default.

## Order emails (Gmail SMTP)

On a confirmed order, a branded confirmation email is sent to **both the customer and the owner**
(`OWNER_EMAIL`). Configure in `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<16-char Gmail App Password>   # requires 2FA on the Google account
OWNER_EMAIL=owner@example.com
```

If `SMTP_USER` / `SMTP_PASS` are blank, email runs in **preview mode** (logged to the server
console, not sent) so the checkout flow still works end-to-end during development.

## Environment

See `.env.example`. Key vars: `DATABASE_URL` + `DIRECT_URL` (Neon), the `R2_*` set (Cloudflare R2),
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, the `SMTP_*` set, `OWNER_EMAIL`, `NEXT_PUBLIC_SITE_URL`.

## Neon (database) setup

1. Create a project at [neon.tech]. In **Connection Details**, copy the **Pooled** string to
   `DATABASE_URL` and the **Direct** string to `DIRECT_URL` (keep `?sslmode=require`).
2. `npm run db:push` (creates tables via `DIRECT_URL`) then `npm run db:seed`.

The Prisma datasource is `postgresql` with `directUrl` — Prisma uses the pooled URL at runtime and
the direct URL for migrations, which is the recommended Neon + serverless setup.

## Cloudflare R2 (object storage) setup

1. Create an **R2 bucket** (e.g. `armoire-media`). Under the bucket settings, enable **Public
   access** (gives an `https://pub-xxxx.r2.dev` URL) or connect a **custom domain**.
2. Create an **R2 API token** (Account → R2 → *Manage API Tokens*, "Object Read & Write"). It yields
   an **Access Key ID** and **Secret Access Key**.
3. Fill `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PUBLIC_URL`
   (the public bucket / custom-domain URL) in `.env` and in your Vercel env.
4. From then on, **admin uploads go straight to R2** and the DB stores the public R2 URL.
5. *(Optional — move ALL existing media to R2)* after seeding, run:

   ```bash
   npm run media:to-r2
   ```

   This uploads everything under `public/media/**` to R2 and rewrites every `/media/...` URL in the
   database to its absolute R2 URL. After this, the site serves all imagery/video from R2.

`next/image` is already configured to optimize images from `**.r2.dev`, `**.r2.cloudflarestorage.com`,
and your `R2_PUBLIC_URL` host.

## Deploying to Vercel

1. Set all env vars in the Vercel project: `DATABASE_URL`, `DIRECT_URL`, the `R2_*` set, a strong
   `AUTH_SECRET`, the `SMTP_*` values, `OWNER_EMAIL`, `NEXT_PUBLIC_SITE_URL`.
2. Deploy. Run `npm run db:push && npm run db:seed` once (locally against the prod Neon URL, or via a
   one-off job) to initialize the database, then optionally `npm run media:to-r2`.
3. Uploads persist in R2 (Vercel's filesystem is read-only), and the database lives in Neon — both
   fully external, so the serverless deployment is stateless.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / serve |
| `npm run setup` | Full first-time setup (media + db + seed) |
| `npm run db:push` / `db:seed` / `db:reset` | Push schema / seed / wipe+reseed (Neon) |
| `npm run media:organize` / `media:transcode` | Re-run the local asset pipeline |
| `npm run media:to-r2` | Upload `public/media` to R2 + rewrite DB URLs |

## Tech notes

- **Motion**: Lenis smooth scroll wired into GSAP ScrollTrigger (reveals + parallax), Three.js
  gold-dust WebGL layer on the hero & fabric sections, Atropos 3D-tilt product cards, Anime.js menu
  stagger. All respect `prefers-reduced-motion`.
- **Auth**: `bcryptjs` + `jose` JWT in an httpOnly cookie; `proxy.ts` (Next 16's middleware) guards
  `/admin` and `/api/admin`.
- **Data**: all public pages are `force-dynamic`, so admin edits appear immediately.
