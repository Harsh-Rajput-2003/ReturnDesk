# ReturnDesk — Return Request Management System

ReturnDesk lets a support team create customer return requests, move them through a
review workflow, record a resolution (refund, replacement or store credit), keep an activity
timeline, and search / filter / sort a paginated dashboard. All data lives in **PostgreSQL**.

**Stack:** Next.js (App Router) · React · JavaScript · Tailwind CSS · Next.js Route Handlers ·
PostgreSQL via `pg` · REST APIs.

---

## 1. Before you start

- **Node.js 18.17 or newer** and npm (check with `node -v`).
- **A PostgreSQL 12+ database.** Pick ONE:
  - **Option A — local:** install PostgreSQL on your PC (https://www.postgresql.org/download/windows/).
  - **Option B — hosted (no install):** create a free database on [Neon](https://neon.tech)
    or [Supabase](https://supabase.com) and copy its connection string.

> **OneDrive tip:** your folder is inside OneDrive. `node_modules` has tens of thousands of small
> files and OneDrive may slow down or lock them. If `npm install` is slow or throws `EPERM`
> errors, pause OneDrive syncing while you install, or keep the project outside OneDrive
> (e.g. `C:\Projects\ReturnDesk`).

## 2. Set up (Windows PowerShell)

**Step 1 — Extract.** Right-click the ZIP → *Extract All…* → extract into
`C:\Users\sande\OneDrive\Desktop\ReturnDesk`. Make sure `package.json` sits directly inside
that folder (not inside a second `ReturnDesk` folder).

**Step 2 — Open in VS Code.**

```powershell
cd C:\Users\sande\OneDrive\Desktop\ReturnDesk
code .
```

Open the VS Code terminal with **Ctrl + `** (it uses PowerShell on Windows).

**Step 3 — Install dependencies.**

```powershell
npm install
```

**Step 4 — Create the database.**

*Option A (local PostgreSQL).* Replace `16` with your installed version and enter the password
you chose during installation when asked:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE returndesk;"
```

(Or open **pgAdmin** → right-click *Databases* → *Create* → *Database…* → name it `returndesk`.)

*Option B (hosted).* Nothing to create — just copy the connection string from the provider.

**Step 5 — Configure `.env.local`.** All scripts and the app read this one file.

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Set `DATABASE_URL`:

| Where is your database? | Example `DATABASE_URL` |
| --- | --- |
| Local | `postgresql://postgres:YOUR_PASSWORD@localhost:5432/returndesk` |
| Neon / Supabase / hosted | `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require` |

If your password has special characters (`@ : / # ?`), URL-encode them (`@` → `%40`).
`.env.local` is git-ignored, so your password is never committed.

**Step 6 — Create the tables.**

```powershell
npm run db:setup
```

You should see `Database schema is ready.` It is safe to run again.

**Step 7 — Insert sample data (32 requests).**

```powershell
npm run db:seed
```

> ⚠️ The seed script **clears both tables first**, so you can run it repeatedly, but it deletes
> any requests you created. To rebuild everything from scratch: `npm run db:reset`.

**Step 8 — Start the app.**

```powershell
npm run dev
```

**Step 9 — Open** http://localhost:3000

## 3. How to test the main features

1. **Dashboard** — four cards (Active, Open, In Review, Completed), a table, search, filters, sort, paging.
2. **Create** — click *Create Request*. Submit it empty to see validation errors. Try an invalid
   email or quantity `0`. Create a valid one and see it appear at the top.
3. **Duplicates** — create another request with the same order number + item name → blocked.
   (Upper/lower case doesn't matter.) Once the first request is *Rejected* or *Completed*, or
   deleted, the same order + item is allowed again.
4. **Workflow** — open a request. Only legal buttons are shown:
   `Open → In Review → Approved / Rejected`, `Approved → Completed`.
   Rejected and Completed are final.
5. **Resolution** — *Approve…* requires Refund (amount > 0), Replacement or Store Credit (no amount).
6. **Locking** — *Edit details* is available only for Open / In Review requests.
7. **Notes** — add notes in any status; they show oldest-first and cannot be edited or deleted.
8. **Soft delete** — *Delete* appears only for Open / Rejected requests. The row stays in PostgreSQL
   with a `deleted_at` time but disappears from the dashboard and counts.
9. **Mobile** — press **F12** → device toolbar → set width to **375**.

### Automatic API test

With the app running (`npm run dev`), open a **second** terminal:

```powershell
npm run test:api
```

It sends real HTTP requests and checks validation, every allowed/forbidden transition, resolution
rules, duplicate prevention (including 6 simultaneous creates), edit locking, notes in every
status, soft delete, search, filters, sorting and pagination. It prints PASS/FAIL for each check.

Also useful: `npm run lint` and `npm run build`.

## 4. API reference

All responses are JSON: `{ "success": true, "data": ... }` or
`{ "success": false, "error": { "message": "...", "details": { "field": "..." } } }`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/requests` | List. Query: `search`, `status`, `reason`, `sort` (`newest`/`oldest`), `page`, `page_size` (1–50) |
| POST | `/api/requests` | Create (`customer_name`, `customer_email`, `order_number`, `item_name`, `quantity`, `return_reason`) |
| GET | `/api/requests/:id` | Details + notes (oldest first) |
| PATCH | `/api/requests/:id` | Edit details (Open / In Review only) |
| PATCH | `/api/requests/:id/transition` | `{ "status": "Approved", "resolution": "Refund", "refund_amount": 25.5 }` |
| POST | `/api/requests/:id/notes` | `{ "note_text": "..." }` (optional `author_label`) |
| DELETE | `/api/requests/:id` | Soft delete (Open / Rejected only) |
| GET | `/api/stats` | Dashboard counts |

Status codes: `200` OK, `201` created, `400` validation error, `404` not found,
`409` business-rule conflict (invalid transition, duplicate, locked, not deletable), `500` unexpected.

## 5. How the business rules are enforced

| Rule | Where |
| --- | --- |
| Allowed transitions | `ALLOWED_TRANSITIONS` in `src/lib/constants.js`, checked in `transitionRequest()` while the row is locked (`FOR UPDATE`) |
| Resolution / refund | `validateTransition()` + the `chk_refund_rules` and `chk_status_resolution` database constraints |
| One active request per order + item | PostgreSQL **partial unique index** `uniq_active_order_item` (ignores Rejected, Completed and deleted rows) — safe even with simultaneous requests |
| Edit lock / delete eligibility | `updateRequest()` / `softDeleteRequest()` on the server |
| Append-only notes | No edit/delete API, plus a database trigger that blocks `UPDATE` and `DELETE` on notes |
| SQL injection | Parameterized queries; sort column chosen from a whitelist; `LIKE` wildcards escaped |

Dashboard "Active requests" = Open + In Review + Approved (the same meaning of *active* used by the duplicate rule).

## 6. Project structure

```
scripts/        schema.sql, setup-db.js, seed.js, api-smoke-test.js
src/app/        layout.js, page.js, globals.css, api/ (route handlers)
src/lib/        db.js (pool), requests.js (SQL + rules), validation.js, constants.js, api.js, client-api.js, format.js
src/components/ Dashboard, RequestTable, RequestDetails, RequestForm, Filters, Pagination, Timeline, ...
```

## 7. Push to GitHub

1. Create an empty repository on https://github.com/new (do not add a README).
2. In PowerShell inside the project folder:

```powershell
git init
git add .
git status
git commit -m "Initial commit: ReturnDesk"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ReturnDesk.git
git push -u origin main
```

Run `git status` before committing and confirm `.env.local` is **not** listed
(it is covered by `.gitignore`).

## 8. Deploy (Vercel + Neon)

1. Create a free Neon project (https://neon.tech) and copy the connection string (it ends in `?sslmode=require`).
2. Create the tables in that database from your PC: put the Neon string in `.env.local` as `DATABASE_URL`,
   then run `npm run db:setup` (and optionally `npm run db:seed`). Don't forget to switch
   `.env.local` back to your local database afterwards if you still want it.
3. Push the code to GitHub (section 7).
4. At https://vercel.com choose **Add New → Project**, import the repository.
5. Under **Environment Variables** add `DATABASE_URL` with the Neon string.
6. Click **Deploy**. Vercel gives you a public URL.

## 9. Troubleshooting

| Message | Fix |
| --- | --- |
| `DATABASE_URL is missing` | You haven't created `.env.local` (Step 5). |
| `password authentication failed` | Wrong password in `DATABASE_URL`. |
| `database "returndesk" does not exist` | Do Step 4. |
| `relation "return_requests" does not exist` | Run `npm run db:setup`. |
| `ECONNREFUSED 127.0.0.1:5432` | Local PostgreSQL isn't running (start the *postgresql* service) or the port differs. |
| `SSL/TLS required` (hosted DB) | Add `?sslmode=require` to the end of `DATABASE_URL`. |
| Dashboard shows an error banner | Look at the terminal running `npm run dev` for the real error (the browser never shows internals). |
| Changed `.env.local` but nothing changed | Stop (`Ctrl+C`) and restart `npm run dev`. |
