import Stripe from 'stripe';

export function createStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    timeout: 15_000,
    maxNetworkRetries: 0,
  });
}

export async function readStripeLivemode(secretKey: string): Promise<boolean> {
  const stripe = createStripe(secretKey);
  const balance = await stripe.balance.retrieve();
  return balance.livemode;
}
