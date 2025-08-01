import { Client } from 'pg';

const client = new Client({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: process.env.PG_USE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

client.connect();

export const postgres = {
  query: (text: string, params?: any[]) => client.query(text, params),
};
