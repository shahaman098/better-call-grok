import { runDoctor } from './doctor.js';
import { liveStripeKeyError } from '../integrations/stripe-key.js';
import { loadEnv } from '../lib/env.js';
import { printError, printOk } from '../lib/output.js';
import { redact } from '../lib/redact.js';

loadEnv();

const liveKey = liveStripeKeyError(process.env.STRIPE_SECRET_KEY);
if (liveKey) {
  printError(liveKey.code, liveKey.message);
  process.exit(1);
}

const command = process.argv[2];

try {
  if (command === 'doctor') {
    const result = await runDoctor();
    if (result.ok) {
      printOk(result.data);
      process.exit(0);
    }
    printError(result.code, result.message);
    process.exit(1);
  }

  printError(
    'UNKNOWN_COMMAND',
    command
      ? `Unknown command "${command}". Available in this build: doctor`
      : 'Usage: bcg doctor',
  );
  process.exit(1);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unexpected failure';
  const secrets = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.STRIPE_SECRET_KEY,
    process.env.XAI_API_KEY,
  ].filter((value): value is string => typeof value === 'string');
  printError('INTERNAL', redact(message, secrets));
  process.exit(1);
}
