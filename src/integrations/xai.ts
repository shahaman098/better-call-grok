const XAI_MODELS_URL = 'https://api.x.ai/v1/models';

export async function countXaiModels(apiKey: string): Promise<number> {
  const response = await fetch(XAI_MODELS_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`xAI models request failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  const body: unknown = JSON.parse(text);
  if (!isModelList(body)) {
    throw new Error('xAI models response was not a list');
  }
  return body.data.length;
}

function isModelList(value: unknown): value is { object: 'list'; data: unknown[] } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as { object?: unknown; data?: unknown };
  return record.object === 'list' && Array.isArray(record.data);
}
