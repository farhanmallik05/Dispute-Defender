/**
 * Real SQLite persistence using Node's built-in synchronous SQLite driver.
 *
 * Node 24 can crash while finalizing better-sqlite3 statements, so this module
 * keeps the application's small Drizzle-shaped repository interface but uses
 * the built-in SQLite engine underneath. Data is still stored in a WAL-backed
 * SQLite database on disk; this is not an in-memory or JSON test double.
 */

import fs from 'fs';
import path from 'path';
import * as schema from './schema';

// @types/node 20 predates node:sqlite, while the runtime used by this project
// provides it. Keep the runtime import local until the type package catches up.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (filename: string) => any;
};

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'sqlite.db');
if (dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
}

const sqlite = new DatabaseSync(dbPath);
sqlite.exec('PRAGMA busy_timeout = 10000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
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
    event_id TEXT,
    payload TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    received_at TEXT NOT NULL
  );
`);

const columnsFor = (table: string): Set<string> => new Set(
  (sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
    .map(column => column.name)
);

if (!columnsFor('audit_logs').has('event_id')) {
  sqlite.exec('ALTER TABLE audit_logs ADD COLUMN event_id TEXT');
}
sqlite.exec('CREATE INDEX IF NOT EXISTS audit_logs_event_id_idx ON audit_logs(event_id)');

type TableKey = 'disputes' | 'dispute_contexts' | 'triage_decisions' | 'audit_logs' | 'webhook_events';
type Table = Record<string | symbol, any>;

const tableName = (table: Table): TableKey => {
  const name = table[Symbol.for('drizzle:Name')];
  if (name === 'dispute_contexts') return 'dispute_contexts';
  if (name === 'triage_decisions') return 'triage_decisions';
  if (name === 'audit_logs') return 'audit_logs';
  if (name === 'webhook_events') return 'webhook_events';
  return 'disputes';
};

const tableColumns = (table: Table): Record<string, any> => {
  const columns = table[Symbol.for('drizzle:Columns')] || {};
  return columns;
};

const physicalColumn = (column: any): string => column.name;
const quote = (value: string): string => `"${value.replace(/"/g, '""')}"`;

function columnForTable(table: Table, physicalName: string): any {
  return Object.values(tableColumns(table)).find(column => column.name === physicalName);
}

function parseWhere(condition: any): { column: any; value: any } | null {
  const chunks = condition?.queryChunks;
  if (!Array.isArray(chunks)) return null;
  const column = chunks.find((chunk: any) => chunk?.table && chunk?.name);
  const parameter = chunks.find((chunk: any) => (
    chunk?.value !== undefined &&
    !chunk?.table &&
    (typeof chunk.value === 'string' || typeof chunk.value === 'number' || typeof chunk.value === 'boolean' || chunk.value === null)
  ));
  return column && parameter ? { column, value: parameter.value } : null;
}

function parseJoin(condition: any): { left: any; right: any } | null {
  const chunks = condition?.queryChunks;
  if (!Array.isArray(chunks)) return null;
  const columns = chunks.filter((chunk: any) => chunk?.table && chunk?.name);
  return columns.length >= 2 ? { left: columns[0], right: columns[1] } : null;
}

function columnSql(column: any, aliases: Map<string, string>): string {
  const name = tableName(column.table as Table);
  return `${aliases.get(name) || 't0'}.${quote(physicalColumn(column))}`;
}

function mapRow(row: Record<string, any>, table: Table): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [property, column] of Object.entries(tableColumns(table))) {
    result[property] = row[physicalColumn(column)];
  }
  return result;
}

function selectedColumns(fields: Record<string, any>, aliases: Map<string, string>): string {
  return Object.entries(fields)
    .map(([alias, column]) => `${columnSql(column, aliases)} AS ${quote(alias)}`)
    .join(', ');
}

export const db = {
  select: (fields?: Record<string, any>) => {
    let source: Table;
    let joins: Array<{ table: Table; condition: any }> = [];
    let where: any;
    let order: any;
    let limit: number | undefined;

    const builder: any = {
      from(table: Table) { source = table; return builder; },
      leftJoin(table: Table, condition: any) { joins.push({ table, condition }); return builder; },
      where(condition: any) { where = condition; return builder; },
      orderBy(condition: any) { order = condition; return builder; },
      limit(count: number) { limit = count; return builder; },
      get: async () => (await builder.execute())[0] || null,
      then: <TResult1 = any[], TResult2 = never>(
        onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
      ): Promise<TResult1 | TResult2> => {
        return builder.execute().then(onfulfilled, onrejected);
      },
      execute: async () => {
        const aliases = new Map<string, string>([[tableName(source), 't0']]);
        joins.forEach((join, index) => aliases.set(tableName(join.table), `t${index + 1}`));
        const from = `${tableName(source)} t0`;
        const joinSql = joins.map((join, index) => {
          const parsed = parseJoin(join.condition);
          const alias = `t${index + 1}`;
          if (!parsed) throw new Error('Unsupported join condition');
          return `LEFT JOIN ${tableName(join.table)} ${alias} ON ${columnSql(parsed.left, aliases)} = ${columnSql(parsed.right, aliases)}`;
        }).join(' ');
        const selectSql = fields ? selectedColumns(fields, aliases) : 't0.*';
        const params: any[] = [];
        const whereSql = parseWhere(where);
        const whereClause = whereSql
          ? ` WHERE ${columnSql(whereSql.column, aliases)} = ?` 
          : '';
        if (whereSql) params.push(whereSql.value);
        let orderClause = '';
        if (order) {
          const chunks = order.queryChunks || [];
          const column = chunks.find((chunk: any) => chunk?.table && chunk?.name);
          if (column) orderClause = ` ORDER BY ${columnSql(column, aliases)}${chunks.some((chunk: any) => String(chunk?.value || '').includes('desc')) ? ' DESC' : ''}`;
        }
        const limitClause = limit === undefined ? '' : ` LIMIT ${Math.max(0, Math.floor(limit))}`;
        const rows = sqlite.prepare(`SELECT ${selectSql} FROM ${from} ${joinSql}${whereClause}${orderClause}${limitClause}`).all(...params) as Array<Record<string, any>>;
        return fields ? rows : rows.map(row => mapRow(row, source));
      }
    };
    return builder;
  },

  insert: (table: Table) => {
    const name = tableName(table);
    return {
      values: (data: Record<string, any>) => {
        let conflict: { target?: any; set?: Record<string, any>; nothing?: boolean } = {};
        let returningFields: Record<string, any> | undefined;
        const operation: any = {
          onConflictDoUpdate(config: { target: any; set: Record<string, any> }) { conflict = config; return operation; },
          onConflictDoNothing() { conflict = { nothing: true }; return operation; },
          returning(fields: Record<string, any>) { returningFields = fields; return operation; },
          then: <TResult1 = any[], TResult2 = never>(
            onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
          ): Promise<TResult1 | TResult2> => {
            try {
              const columns = Object.keys(data).map(property => physicalColumn(tableColumns(table)[property]));
              const values = Object.keys(data).map(property => data[property] === undefined ? null : data[property]);
              const placeholders = columns.map(() => '?').join(', ');
              let sql = `INSERT INTO ${name} (${columns.map(quote).join(', ')}) VALUES (${placeholders})`;
              if (conflict.nothing) sql += ' ON CONFLICT DO NOTHING';
              if (conflict.target && conflict.set) {
                const target = physicalColumn(conflict.target);
                const assignments = Object.keys(conflict.set).map(property => `${quote(physicalColumn(tableColumns(table)[property]))} = ?`);
                sql += ` ON CONFLICT (${quote(target)}) DO UPDATE SET ${assignments.join(', ')}`;
                values.push(...Object.keys(conflict.set).map(property => conflict.set?.[property] === undefined ? null : conflict.set?.[property]));
              }
              const statement = sqlite.prepare(sql);
              const result = statement.run(...values);
              const output = returningFields
                ? [returningFields].map(fields => Object.fromEntries(Object.entries(fields).map(([key, column]) => [key, result.lastInsertRowid || data[(column as any).name]])))
                : [];
              return Promise.resolve(output).then(onfulfilled, onrejected);
            } catch (error) { return Promise.reject(error).then(onfulfilled, onrejected); }
          }
        };
        return operation;
      }
    };
  },

  update: (table: Table) => ({
    set: (data: Record<string, any>) => ({
      where: (condition: any) => ({
        then: <TResult1 = void, TResult2 = never>(
          onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
        ): Promise<TResult1 | TResult2> => {
          try {
            const parsed = parseWhere(condition);
            if (!parsed) throw new Error('An update requires an equality predicate.');
            const columns = tableColumns(table);
            const assignments = Object.keys(data).map(property => `${quote(physicalColumn(columns[property]))} = ?`).join(', ');
            const values = [
              ...Object.keys(data).map(property => data[property] === undefined ? null : data[property]),
              parsed.value === undefined ? null : parsed.value
            ];
            sqlite.prepare(`UPDATE ${tableName(table)} SET ${assignments} WHERE ${quote(physicalColumn(parsed.column))} = ?`).run(...values);
            return Promise.resolve().then(onfulfilled, onrejected);
          } catch (error) { return Promise.reject(error).then(onfulfilled, onrejected); }
        }
      })
    })
  }),

  delete: (table: Table) => ({
    where: (condition: any) => ({
      then: <TResult1 = void, TResult2 = never>(
        onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
      ): Promise<TResult1 | TResult2> => {
        try {
          const parsed = parseWhere(condition);
          if (!parsed) throw new Error('A delete requires an equality predicate.');
          sqlite.prepare(`DELETE FROM ${tableName(table)} WHERE ${quote(physicalColumn(parsed.column))} = ?`).run(parsed.value);
          return Promise.resolve().then(onfulfilled, onrejected);
        } catch (error) { return Promise.reject(error).then(onfulfilled, onrejected); }
      }
    })
  })
};

export { sqlite };

export function closeDatabase(): void {
  // DatabaseSync does not require explicit close for process-owned handles.
  // Avoid forcing native teardown while async test promises are still draining.
}
