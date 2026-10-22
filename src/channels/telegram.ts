const TELEGRAM_GET_ME = 'https://api.telegram.org';

export async function telegramGetMe(token: string): Promise<{ username: string }> {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error('TELEGRAM_BOT_TOKEN is not a Telegram bot token');
  }
  const response = await fetch(`${TELEGRAM_GET_ME}/bot${token}/getMe`, {
    method: 'GET',
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Telegram getMe returned HTTP ${response.status}`);
  }
  if (!isGetMeOk(body)) {
    const description = isTelegramError(body) ? body.description : `HTTP ${response.status}`;
    throw new Error(`Telegram getMe failed: ${description}`);
  }
  return { username: body.result.username };
}

function isGetMeOk(value: unknown): value is { ok: true; result: { username: string } } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as { ok?: unknown; result?: { username?: unknown } };
  return record.ok === true && typeof record.result?.username === 'string';
}

function isTelegramError(value: unknown): value is { description: string } {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as { description?: unknown }).description === 'string';
}
