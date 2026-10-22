import { telegramGetMe } from '../channels/telegram.js';
import { createServiceClient } from '../integrations/supabase.js';
import { readStripeLivemode } from '../integrations/stripe.js';
import { countXaiModels } from '../integrations/xai.js';
import { redact } from '../lib/redact.js';

export type DoctorCheck = {
  name: string;
  ok: boolean;
  detail: string;
  code?: string;
};

export type DoctorResult =
  | { ok: true; data: { checks: DoctorCheck[] } }
  | { ok: false; code: string; message: string };

export async function runDoctor(env: NodeJS.ProcessEnv = process.env): Promise<DoctorResult> {
  const secrets = secretValues(env);
  const checks = await Promise.all([
    checkSupabase(env, secrets),
    checkTelegram(env, secrets),
    checkStripe(env, secrets),
    checkXai(env, secrets),
  ]);

  const supabase = checks.find((check) => check.name === 'supabase');
  if (supabase?.ok) {
    checks.push(await recordDoctorEvent(env, checks, secrets));
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length === 0) {
    return { ok: true, data: { checks: checks.map(publicCheck) } };
  }

  const liveMode = failed.find((check) => check.code === 'LIVE_MODE');
  return {
    ok: false,
    code: liveMode?.code ?? 'DOCTOR_FAILED',
    message: checks.map((check) => `${check.name}: ${check.ok ? 'ok' : check.detail}`).join('; '),
  };
}

function publicCheck(check: DoctorCheck): DoctorCheck {
  return { name: check.name, ok: check.ok, detail: check.detail };
}

async function checkSupabase(env: NodeJS.ProcessEnv, secrets: string[]): Promise<DoctorCheck> {
  const url = env.SUPABASE_URL?.trim() ?? '';
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (url === '' || key === '') {
    return { name: 'supabase', ok: false, detail: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required' };
  }
  if (!isHttpsUrl(url)) {
    return { name: 'supabase', ok: false, detail: 'SUPABASE_URL must be an https URL' };
  }
  try {
    const client = createServiceClient(url, key);
    const { error } = await client.from('customers').select('id').limit(1);
    if (error) {
      return { name: 'supabase', ok: false, detail: redact(error.message, secrets) };
    }
    return { name: 'supabase', ok: true, detail: 'customers readable' };
  } catch (error) {
    return { name: 'supabase', ok: false, detail: redact(errorText(error), secrets) };
  }
}

async function checkTelegram(env: NodeJS.ProcessEnv, secrets: string[]): Promise<DoctorCheck> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  if (token === '') {
    return { name: 'telegram', ok: false, detail: 'TELEGRAM_BOT_TOKEN is required' };
  }
  try {
    const me = await telegramGetMe(token);
    return { name: 'telegram', ok: true, detail: `@${me.username}` };
  } catch (error) {
    return { name: 'telegram', ok: false, detail: redact(errorText(error), secrets) };
  }
}

async function checkStripe(env: NodeJS.ProcessEnv, secrets: string[]): Promise<DoctorCheck> {
  const key = env.STRIPE_SECRET_KEY?.trim() ?? '';
  if (key === '') {
    return { name: 'stripe', ok: false, detail: 'STRIPE_SECRET_KEY is required' };
  }
  if (!key.startsWith('sk_test_')) {
    return { name: 'stripe', ok: false, detail: 'STRIPE_SECRET_KEY must start with sk_test_' };
  }
  try {
    const livemode = await readStripeLivemode(key);
    if (livemode !== false) {
      return {
        name: 'stripe',
        ok: false,
        code: 'LIVE_MODE',
        detail: 'Stripe balance reported livemode true',
      };
    }
    return { name: 'stripe', ok: true, detail: 'test mode' };
  } catch (error) {
    return { name: 'stripe', ok: false, detail: redact(errorText(error), secrets) };
  }
}

async function checkXai(env: NodeJS.ProcessEnv, secrets: string[]): Promise<DoctorCheck> {
  const key = env.XAI_API_KEY?.trim() ?? '';
  if (key === '') {
    return { name: 'xai', ok: false, detail: 'XAI_API_KEY is required' };
  }
  try {
    const count = await countXaiModels(key);
    return { name: 'xai', ok: true, detail: `${count} models` };
  } catch (error) {
    return { name: 'xai', ok: false, detail: redact(errorText(error), secrets) };
  }
}

async function recordDoctorEvent(
  env: NodeJS.ProcessEnv,
  checks: DoctorCheck[],
  secrets: string[],
): Promise<DoctorCheck> {
  const url = env.SUPABASE_URL?.trim() ?? '';
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  try {
    const client = createServiceClient(url, key);
    const { error } = await client.from('events').insert({
      actor: 'System',
      type: 'DOCTOR',
      details_json: {
        checks: checks.map((check) => ({ name: check.name, ok: check.ok })),
      },
    });
    if (error) {
      return { name: 'events', ok: false, detail: redact(error.message, secrets) };
    }
    return { name: 'events', ok: true, detail: 'DOCTOR recorded' };
  } catch (error) {
    return { name: 'events', ok: false, detail: redact(errorText(error), secrets) };
  }
}

function secretValues(env: NodeJS.ProcessEnv): string[] {
  return [
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.TELEGRAM_BOT_TOKEN,
    env.STRIPE_SECRET_KEY,
    env.XAI_API_KEY,
    env.STRIPE_WEBHOOK_SECRET,
    env.TELEGRAM_WEBHOOK_SECRET,
    env.TWILIO_AUTH_TOKEN,
  ].filter((value): value is string => typeof value === 'string' && value.trim() !== '');
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'request failed';
}
