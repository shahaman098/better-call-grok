import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { liveStripeKeyError } from '../../src/integrations/stripe-key.js';

const require = createRequire(import.meta.url);

function runBcg(args: string[], env: NodeJS.ProcessEnv) {
  const tsxCli = require.resolve('tsx/cli');
  return spawnSync(process.execPath, [tsxCli, path.join(process.cwd(), 'src/cli/index.ts'), ...args], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });
}

describe('live Stripe keys', () => {
  it('rejects sk_live_ and rk_live_ including surrounding space', () => {
    expect(liveStripeKeyError('sk_live_example')?.code).toBe('LIVE_STRIPE_KEY');
    expect(liveStripeKeyError('  rk_live_example')?.code).toBe('LIVE_STRIPE_KEY');
    expect(liveStripeKeyError('sk_test_example')).toBeNull();
    expect(liveStripeKeyError(undefined)).toBeNull();
  });

  it('T12 exits before any command when the env key is live', () => {
    for (const key of ['sk_live_not_a_real_key', 'rk_live_not_a_real_key']) {
      const result = runBcg(['doctor'], { ...process.env, STRIPE_SECRET_KEY: key });
      expect(result.status).toBe(1);
      const body = JSON.parse(result.stdout) as { ok: boolean; error: { code: string; message: string } };
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('LIVE_STRIPE_KEY');
      expect(result.stdout).not.toContain(key);
      expect(result.stderr).not.toContain(key);
    }
  });

  it('lets a test key reach command dispatch', () => {
    const result = runBcg(['not-a-command'], {
      ...process.env,
      STRIPE_SECRET_KEY: 'sk_test_example',
    });
    expect(result.status).toBe(1);
    const body = JSON.parse(result.stdout) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('UNKNOWN_COMMAND');
  });
});
