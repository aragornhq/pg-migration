import { Client } from 'pg';

const getSslConfig = () => {
  const value = process.env.PG_USE_SSL?.toLowerCase();

  if (value === 'true' || value === '1' || value === 'require') {
    return { rejectUnauthorized: false };
  }

  return undefined;
};

const client = new Client({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: getSslConfig(),
});

let connected = false;

const ensureConnected = async () => {
  if (!connected) {
    await client.connect();
    connected = true;
  }
};

export const postgres = {
  query: async (text: string, params?: any[]) => {
    await ensureConnected();
    return client.query(text, params);
  },
  close: async () => {
    if (connected) {
      await client.end();
      connected = false;
    }
  },
};
