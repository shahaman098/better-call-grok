import { describe, expect, it } from 'vitest';
import { runDoctor } from '../../src/cli/doctor.js';

describe('bcg doctor', () => {
  it('fails closed when credentials are absent and does not call the network', async () => {
    const result = await runDoctor({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('DOCTOR_FAILED');
    expect(result.message).toContain('supabase:');
    expect(result.message).toContain('telegram:');
    expect(result.message).toContain('stripe:');
    expect(result.message).toContain('xai:');
  });

  it('rejects a non-https Supabase URL and a non-test Stripe key without a request', async () => {
    const result = await runDoctor({
      SUPABASE_URL: 'http://example.test',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-example',
      TELEGRAM_BOT_TOKEN: '',
      STRIPE_SECRET_KEY: 'rk_test_example',
      XAI_API_KEY: '',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('https URL');
    expect(result.message).toContain('sk_test_');
    expect(result.message).not.toContain('service-role-example');
    expect(result.message).not.toContain('rk_test_example');
  });
});
