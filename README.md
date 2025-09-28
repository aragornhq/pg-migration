# @aragornhq/pg-migration

> ⚔️ Production-grade CLI for managing PostgreSQL schema migrations with raw SQL, rollback, integrity tracking, strict mode, and GitHub automation.

---

## 🚀 Features

- ✅ Native [PostgreSQL](https://www.postgresql.org/) support using [`pg`](https://www.npmjs.com/package/pg)
- ✅ Fully typed CLI (TypeScript)
- ✅ Supports `migration:create`, `migration:up`, `migration:down`
- ✅ Rollback support using `-- ROLLBACK BELOW --` separator
- ✅ SHA-256 hash tracking for applied migrations
- ✅ Enforced one-statement-per-file (recommended)
- ✅ Optional config via `pg-migration.json`
- ✅ Migrations run inside a single transaction for atomicity
- ✅ `schema:dump` command to export an existing database schema with rerunnable output

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

2. The CLI needs access to [`pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html). A cross-platform copy is bundled
   via the [`pg-dump-restore-nodejs`](https://www.npmjs.com/package/pg-dump-restore-nodejs) dependency and will be used
   automatically. If you prefer to use a system-installed binary, make sure it is available on your `PATH` or point the CLI to it
   with the `PG_DUMP_PATH` environment variable or `pgDumpPath` in `pg-migration.json`.

3. Specify where your migration files live via a `pg-migration.json` file:

```json
{
  "path": "db/migrations",
  "pgDumpPath": "/usr/lib/postgresql/16/bin/pg_dump"
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
- `schema:dump --output=schema.sql` – export the current database schema using `pg_dump`. The dump uses `CREATE OR REPLACE` and `IF NOT EXISTS` statements so it can be safely rerun without dropping existing objects.

Each file should contain your SQL up statement followed by `-- ROLLBACK BELOW --` and the down statement. Only one SQL statement per section is enforced.

```sql
-- 20250101_create_table.sql
CREATE TABLE example (id SERIAL PRIMARY KEY);

-- ROLLBACK BELOW --
DROP TABLE example;
```

Applied migrations are recorded in a `migrations` table together with a SHA‑256 hash. If a hash changes, the run fails to prevent drift.
