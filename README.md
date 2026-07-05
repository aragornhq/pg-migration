# @aragornhq/pg-migration

> ⚔️ Production-grade CLI for managing PostgreSQL schema migrations with raw SQL, rollback, integrity tracking, strict mode, and GitHub automation.

---

## 🚀 Features

- ✅ Native [PostgreSQL](https://www.postgresql.org/) support using [`pg`](https://www.npmjs.com/package/pg)
- ✅ Fully typed CLI (TypeScript)
- ✅ Supports `migration:create`, `migration:up`, `migration:down`
- ✅ Rollback support using `-- ROLLBACK BELOW --` separator
- ✅ SHA-256 hash tracking for applied migrations
- ✅ Multiple statements per migration (up and rollback) in a single file
- ✅ Optional config via `pg-migration.json`
- ✅ Migrations run inside a single transaction for atomicity

---

## 📦 Installation

```bash
npm install --save-dev @aragornhq/pg-migration
```

## 🔧 Setup

1. Set the PostgreSQL connection using environment variables:

```bash
PG_HOST=localhost
PG_PORT=5432
PG_DB=postgres
PG_USER=postgres
PG_PASSWORD=password
PG_USE_SSL=false
```

Set `PG_USE_SSL=true` (or `1` / `require`) for hosted PostgreSQL providers that require encrypted connections. If PostgreSQL reports `no pg_hba.conf entry ... SSL off`, SSL is required for that connection and this variable should be enabled.


2. Specify where your migration files live via a `pg-migration.json` file:

```json
{
  "path": "db/migrations"
}
```

Create the folder if it does not already exist.

## 🛠️ Usage

Run the CLI with `npx` or via an npm script. The executable name is `pg-migrate`:

```bash
npx pg-migrate <command> [options]
```

### Commands

- `migration:create <name> --path=<folder>` – create a timestamped migration file. The `--path` option is optional when the path is defined in `pg-migration.json`.
- `migration:up --path=<folder>` – apply all pending migrations.
- `migration:dry-run --path=<folder>` – run migrations in a transaction and roll back for validation.
- `migration:down --file=<filename.sql> --path=<folder>` – roll back a single migration.

Each file should contain your SQL up section followed by `-- ROLLBACK BELOW --` and the down section. Multiple statements are allowed in both sections and will be run sequentially.

```sql
-- 20250101_create_table.sql
CREATE TABLE example (id SERIAL PRIMARY KEY);
CREATE INDEX idx_example_id ON example (id);

-- ROLLBACK BELOW --
DROP INDEX idx_example_id;
DROP TABLE example;
```

Applied migrations are recorded in a `migrations` table together with a SHA‑256 hash. If a hash changes, the run fails to prevent drift.
