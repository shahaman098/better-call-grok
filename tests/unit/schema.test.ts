import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const TABLES = [
  'customers',
  'suppliers',
  'orders',
  'design_versions',
  'supplier_candidates',
  'negotiations',
  'offers',
  'messages',
  'invoices',
  'events',
  'command_idempotency',
];

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
const migrationSql = readdirSync(migrationDir)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => readFileSync(path.join(migrationDir, name), 'utf8'))
  .join('\n')
  .toLowerCase();

const seedSql = readFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), 'utf8');

describe('schema contract', () => {
  it('enables and forces RLS on every table', () => {
    for (const table of TABLES) {
      expect(migrationSql).toContain(`alter table public.${table} enable row level security`);
      expect(migrationSql).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('keeps offers insert-only and messages idempotent', () => {
    expect(migrationSql).toContain('unique (channel, external_id)');
    expect(migrationSql).toContain('grant select, insert on table public.offers to service_role');
    expect(migrationSql).toContain('prevent_offer_mutation');
    expect(migrationSql).not.toContain('grant select, insert, update, delete on table public.offers');
  });

  it('stores money as bigint and rejects live invoices', () => {
    expect(migrationSql).toContain('typical_unit_price_minor bigint');
    expect(migrationSql).toContain('amount_minor bigint not null');
    expect(migrationSql).toContain('check (livemode = false)');
  });

  it('seeds Andrew, the consenting supplier, and the three fictional suppliers', () => {
    expect(seedSql).toContain("'Andrew'");
    expect(seedSql).toContain("'Friend Prints'");
    expect(seedSql).toContain("'MegaTee Factory (fictional)'");
    expect(seedSql).toContain("'StickerSprint (fictional)'");
    expect(seedSql).toContain("'QuickPrint London (fictional)'");

    const fictional = seedSql.split('(fictional)').slice(1);
    expect(fictional).toHaveLength(3);
    for (const block of fictional) {
      const row = block.split('insert into')[0] ?? block;
      expect(row).toContain("'FICTIONAL'");
      expect(row).toContain('false');
      expect(row).not.toContain('true');
    }
  });
});
