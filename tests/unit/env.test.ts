import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadEnv, parseEnv } from '../../src/lib/env.js';

describe('parseEnv', () => {
  it('keeps quoted values and skips comments', () => {
    const parsed = parseEnv(`
# comment
STRIPE_SECRET_KEY="sk_test_example"
EMPTY=
NAME='Andrew'
not a pair
`);
    expect(parsed.STRIPE_SECRET_KEY).toBe('sk_test_example');
    expect(parsed.EMPTY).toBe('');
    expect(parsed.NAME).toBe('Andrew');
    expect(parsed['not']).toBeUndefined();
  });
});

describe('loadEnv', () => {
  it('does not override variables already set', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'bcg-env-'));
    writeFileSync(path.join(dir, '.env'), 'STRIPE_SECRET_KEY=sk_test_from_file\nXAI_API_KEY=from-file\n');
    const env: NodeJS.ProcessEnv = { STRIPE_SECRET_KEY: 'sk_test_already' };
    loadEnv({ cwd: dir, home: path.join(dir, 'no-home'), env });
    expect(env.STRIPE_SECRET_KEY).toBe('sk_test_already');
    expect(env.XAI_API_KEY).toBe('from-file');
  });

  it('fills gaps from ~/.bcg/.env after the project .env', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'bcg-home-'));
    const cwd = path.join(root, 'project');
    const home = path.join(root, 'home');
    mkdirSync(cwd);
    mkdirSync(path.join(home, '.bcg'), { recursive: true });
    writeFileSync(path.join(cwd, '.env'), 'SUPABASE_URL=https://local.example\n');
    writeFileSync(path.join(home, '.bcg', '.env'), 'SUPABASE_URL=https://home.example\nXAI_API_KEY=from-home\n');
    const env: NodeJS.ProcessEnv = {};
    loadEnv({ cwd, home, env });
    expect(env.SUPABASE_URL).toBe('https://local.example');
    expect(env.XAI_API_KEY).toBe('from-home');
  });
});
