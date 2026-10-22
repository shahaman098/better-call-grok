export type OkBody<T> = { ok: true; data: T };
export type ErrorBody = { ok: false; error: { code: string; message: string } };

export function printOk<T>(data: T): void {
  const body: OkBody<T> = { ok: true, data };
  process.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
}

export function printError(code: string, message: string): void {
  const body: ErrorBody = { ok: false, error: { code, message } };
  process.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
}
