import { postgres } from './client';
import { getMigrationFiles } from './utils';

export class Runner {
  constructor(private readonly migrationsDir: string) {}

  private async ensureTable() {
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        filename TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);
  }

  private async getApplied(): Promise<Map<string, string>> {
    const result = await postgres.query('SELECT filename, hash FROM migrations');
    return new Map(result.rows.map((r: any) => [r.filename, r.hash]));
  }

  async applyMigrations() {
    await this.ensureTable();
    const applied = await this.getApplied();
    const files = getMigrationFiles(this.migrationsDir);

    await postgres.query('BEGIN');
    try {
      for (const file of files) {
        if (!applied.has(file.filename)) {
          console.log(`🚀 Applying ${file.filename}...`);

          if ((file.upSql.match(/;/g) || []).length > 1) {
            throw new Error(
              `❌ Migration ${file.filename} may contain multiple SQL statements. Use 1 per file.`,
            );
          }

          await postgres.query(file.upSql);

          await postgres.query(
            'INSERT INTO migrations (filename, hash) VALUES ($1, $2)',
            [file.filename, file.hash],
          );
        } else if (applied.get(file.filename) !== file.hash) {
          throw new Error(`❌ Hash mismatch: ${file.filename}`);
        }
      }

      await postgres.query('COMMIT');
      console.log('✅ All migrations applied successfully.');
    } catch (err) {
      await postgres.query('ROLLBACK');
      console.error('❌ Migration run failed, rolled back.');
      throw err;
    }
  }

  async rollbackMigration(filename: string) {
    await this.ensureTable();
    const files = getMigrationFiles(this.migrationsDir);
    const file = files.find((f) => f.filename === filename);

    if (!file) throw new Error(`Migration file not found: ${filename}`);
    if (!file.downSql) throw new Error(`No rollback SQL found in ${filename}`);

    console.log(`↩️ Rolling back ${filename}...`);
    await postgres.query(file.downSql);

    await postgres.query('DELETE FROM migrations WHERE filename = $1', [filename]);

    console.log(`✅ Rolled back ${filename}`);
  }
}
