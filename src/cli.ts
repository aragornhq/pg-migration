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
      const resolvedOutput = path.resolve(process.cwd(), output);
      const outputDir = path.dirname(resolvedOutput);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const { spawnSync } = await import('child_process');
      const pgEnv = { ...process.env } as NodeJS.ProcessEnv;
      if (process.env.PG_PASSWORD) {
        pgEnv.PGPASSWORD = process.env.PG_PASSWORD;
      }

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
          resolvedOutput,
        ],
        {
          env: pgEnv,
          stdio: ['inherit', 'pipe', 'pipe'],
        },
      );

      if (result.stdout?.length) process.stdout.write(result.stdout);
      if (result.stderr?.length) process.stderr.write(result.stderr);

      if (result.error) {
        throw result.error;
      }

      if (result.status !== 0) {
        const stderr = result.stderr?.toString().trim();
        const message = stderr
          ? `pg_dump failed with exit code ${result.status}: ${stderr}`
          : `pg_dump failed with exit code ${result.status}`;
        throw new Error(message);
      }

      let sql = fs.readFileSync(resolvedOutput, 'utf8');
      const replacements: [RegExp, string][] = [
        [/^CREATE TABLE /gm, 'CREATE TABLE IF NOT EXISTS '],
        [/^CREATE SEQUENCE /gm, 'CREATE SEQUENCE IF NOT EXISTS '],
        [/^CREATE UNIQUE INDEX /gm, 'CREATE UNIQUE INDEX IF NOT EXISTS '],
        [/^CREATE INDEX /gm, 'CREATE INDEX IF NOT EXISTS '],
        [/^CREATE VIEW /gm, 'CREATE OR REPLACE VIEW '],
        [/^CREATE FUNCTION /gm, 'CREATE OR REPLACE FUNCTION '],
        [/^CREATE PROCEDURE /gm, 'CREATE OR REPLACE PROCEDURE '],
        [/^CREATE TYPE /gm, 'CREATE TYPE IF NOT EXISTS '],
        [/^CREATE SCHEMA /gm, 'CREATE SCHEMA IF NOT EXISTS '],
      ];
      for (const [pattern, replacement] of replacements) {
        sql = sql.replace(pattern, replacement);
      }
      sql = sql.replace(
        /CREATE TRIGGER[^;]+;/g,
        (m) =>
          `DO $$ BEGIN\n${m}\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;`,
      );
      fs.writeFileSync(resolvedOutput, sql);
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
