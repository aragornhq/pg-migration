import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Runner } from '../src/runner';
import { postgres } from '../src/client';

jest.mock('../src/client', () => {
  const data: any[] = [];
  return {
    postgres: {
      query: jest.fn((text: string, params?: any[]) => {
        if (text.startsWith('BEGIN') || text.startsWith('COMMIT') || text.startsWith('ROLLBACK')) {
          return Promise.resolve();
        }
        if (text.startsWith('SELECT')) {
          return Promise.resolve({ rows: [...data] });
        }
        if (text.startsWith('INSERT')) {
          data.push({ filename: params![0], hash: params![1] });
          return Promise.resolve();
        }
        if (text.startsWith('DELETE')) {
          const index = data.findIndex((d) => d.filename === params![0]);
          if (index >= 0) data.splice(index, 1);
          return Promise.resolve();
        }
        return Promise.resolve();
      }),
    },
  };
});

describe('Migration Runner', () => {
  const testDir = path.join(__dirname, 'fixtures');
  const runner = new Runner(testDir);
  let expectedHash = '';

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    const file = path.join(testDir, '20250101_test.sql');
    fs.writeFileSync(
      file,
      `CREATE TABLE test (id SERIAL);\n-- ROLLBACK BELOW --\nDROP TABLE test;`
    );
    const raw = fs.readFileSync(file, 'utf8');
    expectedHash = crypto.createHash('sha256').update(raw).digest('hex');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    const file = path.join(testDir, '20250101_test.sql');
    fs.unlinkSync(file);
    fs.rmdirSync(testDir);
  });

  it('applies migrations', async () => {
    await expect(runner.applyMigrations()).resolves.not.toThrow();
    expect(postgres.query).toHaveBeenCalledWith('BEGIN');
    expect(postgres.query).toHaveBeenCalledWith(
      'INSERT INTO migrations (filename, hash) VALUES ($1, $2)',
      ['20250101_test.sql', expectedHash]
    );
    expect(postgres.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back migration', async () => {
    await expect(runner.rollbackMigration('20250101_test.sql')).resolves.not.toThrow();
    expect(postgres.query).toHaveBeenCalledWith(
      'DELETE FROM migrations WHERE filename = $1',
      ['20250101_test.sql']
    );
  });

  it('dry runs migrations', async () => {
    await expect(runner.dryRunMigrations()).resolves.not.toThrow();
    expect(postgres.query).toHaveBeenCalledWith('BEGIN');
    expect(postgres.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
