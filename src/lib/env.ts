import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function parseEnv(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!ENV_KEY.test(key)) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

export function loadEnv(options?: {
  cwd?: string;
  home?: string;
  env?: NodeJS.ProcessEnv;
}): void {
  const env = options?.env ?? process.env;
  const cwd = options?.cwd ?? process.cwd();
  const home = options?.home ?? os.homedir();
  const files = [path.join(cwd, '.env'), path.join(home, '.bcg', '.env')];

  for (const file of files) {
    let contents: string;
    try {
      contents = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const [key, value] of Object.entries(parseEnv(contents))) {
      if (env[key] === undefined || env[key] === '') {
        env[key] = value;
      }
    }
  }
}
