export function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) {
    const trimmed = secret.trim();
    if (trimmed.length < 8) continue;
    out = out.split(trimmed).join('[redacted]');
  }
  return out;
}
