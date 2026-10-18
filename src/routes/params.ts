import type { Request } from 'express';

/** Reads a numeric id from the route params (including params merged from parent routers). */
export function idParam(req: Request, name: string): number | null {
  const value = Number((req.params as Record<string, string | undefined>)[name]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** Trimmed string from a form field, '' when missing. */
export function field(body: Record<string, unknown> | undefined, name: string): string {
  return String(body?.[name] ?? '').trim();
}
