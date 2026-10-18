import fs from 'fs';
import path from 'path';
import mysql, { type ConnectionOptions, type Pool, type PoolConnection } from 'mysql2/promise';

// Project root is two levels above src/config (or dist/config).
const projectRoot = path.join(__dirname, '..', '..');
const caPath = path.resolve(projectRoot, process.env.DB_SSL_CA || 'ca.pem');

if (!fs.existsSync(caPath)) {
  throw new Error(`Database CA certificate not found at ${caPath}`);
}

export const connectionOptions: ConnectionOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'learning_desk',
  ssl: {
    ca: fs.readFileSync(caPath),
    rejectUnauthorized: true,
  },
};

const pool = mysql.createPool({
  ...connectionOptions,
  waitForConnections: true,
  connectionLimit: 10,
});

/** Either the pool or a connection inside a transaction. */
export type Queryable = Pool | PoolConnection;

/** Fails fast if the database is unreachable or the certificate is rejected. */
export async function verifyConnection(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

/** Runs `work` in a transaction, committing on success and rolling back on error. */
export async function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export default pool;
