export const LIVE_STRIPE_KEY = 'LIVE_STRIPE_KEY';

export function liveStripeKeyError(key: string | undefined): { code: string; message: string } | null {
  if (key === undefined) return null;
  const trimmed = key.trim();
  if (trimmed.startsWith('sk_live_') || trimmed.startsWith('rk_live_')) {
    return {
      code: LIVE_STRIPE_KEY,
      message: 'Refusing to start because STRIPE_SECRET_KEY is a live key',
    };
  }
  return null;
}
