#!/usr/bin/env ts-node

import { Runner } from './runner';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];
const name = args[1];
const pathArg = args.find((arg) => arg.startsWith('--path='));
const fileArg = args.find((arg) => arg.startsWith('--file='));
const outputArg = args.find((arg) => arg.startsWith('--output='));

const configPath = path.resolve(process.cwd(), 'pg-migration.json');
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : {};
const folderPath = pathArg?.split('=')[1] || config.path;

if (!folderPath) {
  console.error(
    '❌ Error: --path=<folder> is required or must be defined in pg-migration.json',
  );
  process.exit(1);
}

const runner = new Runner(folderPath);

(async () => {
  try {
    if (command === 'migration:create') {
      if (!name) throw new Error('Missing migration name');
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, '')
        .slice(0, 14);
      const filename = `${timestamp}_${name}.sql`;
      const fullDir = path.resolve(folderPath);
      if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
      const filePath = path.join(fullDir, filename);
      fs.writeFileSync(
        filePath,
        `-- ${filename}\n-- SQL up\n\n-- ROLLBACK BELOW --\n-- SQL down\n`,
      );
      console.log(`Created migration: ${filePath}`);
    } else if (command === 'migration:up') {
      await runner.applyMigrations();
    } else if (command === 'migration:dry-run') {
      await runner.dryRunMigrations();
    } else if (command === 'migration:down') {
      const filename = fileArg?.split('=')[1];
      if (!filename) throw new Error('--file=<filename> is required');
      await runner.rollbackMigration(filename);
    } else if (command === 'schema:dump') {
      const output = outputArg?.split('=')[1] || 'schema.sql';
      const { spawnSync } = await import('child_process');
      const result = spawnSync(
        'pg_dump',
        [
          '--schema-only',
          '--no-owner',
          '--no-privileges',
          '-h',
          process.env.PG_HOST || 'localhost',
          '-p',
          process.env.PG_PORT || '5432',
          '-U',
          process.env.PG_USER || 'postgres',
          '-d',
          process.env.PG_DB || 'postgres',
          '-f',
          output,
        ],
        {
          stdio: 'inherit',
          env: { ...process.env, PGPASSWORD: process.env.PG_PASSWORD || '' },
        },
      );

      if (result.status !== 0) {
        throw new Error('pg_dump failed');
      }
      console.log(`Schema dumped to ${output}`);
    } else {
      console.log(
        'Usage:\n  migration:create <name> --path=./migrations\n  migration:up --path=./migrations\n  migration:dry-run --path=./migrations\n  migration:down --file=filename.sql --path=./migrations\n  schema:dump --output=schema.sql',
      );
    }
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
})();
