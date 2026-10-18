import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { connectionOptions } from '../config/db';

const migrationsDir = path.join(__dirname, '..', '..', 'db', 'migrations');

/** Applies every db/migrations/*.sql file not yet recorded in schema_migrations, in name order. */
async function migrate(): Promise<void> {
  const connection = await mysql.createConnection({ ...connectionOptions, multipleStatements: true });
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    const [rows] = await connection.query<RowDataPacket[]>('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name as string));

    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      console.log(`Applying ${file}`);
      await connection.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    }
    console.log('Migrations up to date');
  } finally {
    await connection.end();
  }
}

migrate().catch((err: Error) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
