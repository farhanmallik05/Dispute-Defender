/**
 * Database Client Initialization (SQLite + Drizzle ORM)
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'sqlite.db');

// Initialize SQLite connection with WAL mode for high performance
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

// Ensure tables exist on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    due_date TEXT,
    life_cycle_stage TEXT NOT NULL,
    transaction_id TEXT,
    allowed_options TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dispute_contexts (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL REFERENCES disputes(id),
    order_data TEXT,
    tracking_data TEXT,
    buyer_messages TEXT,
    redacted_context TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS triage_decisions (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL REFERENCES disputes(id),
    recommendation TEXT NOT NULL,
    confidence_score INTEGER NOT NULL,
    summary_reason TEXT NOT NULL,
    evidence_checklist TEXT NOT NULL,
    draft_notes TEXT NOT NULL,
    merchant_edited_notes TEXT,
    evidence_type_required TEXT NOT NULL,
    status TEXT NOT NULL,
    approved_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };

export function closeDatabase(): void {
  sqlite.close();
}
