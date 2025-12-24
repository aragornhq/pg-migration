import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MigrationFile } from './types';

export function getMigrationFiles(dir: string): MigrationFile[] {
  const splitStatements = (sqlSection?: string) =>
    sqlSection
      ?.split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((filename) => {
      const filePath = path.join(dir, filename);
      const raw = fs.readFileSync(filePath, 'utf8');
      const [upSql, downSql] = raw.split(/--\s*ROLLBACK BELOW\s*(?:--)?/i);
      const hash = crypto.createHash('sha256').update(raw).digest('hex');
      return {
        filename,
        upSql: splitStatements(upSql) ?? [],
        downSql: splitStatements(downSql),
        hash,
      };
    });
}
