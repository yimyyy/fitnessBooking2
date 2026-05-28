import { prisma } from '../prisma/client';

// Cast to any until `prisma generate` is re-run after schema migrations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const DEFAULTS: Record<string, string> = {
  cancellationWindowHours: process.env.CANCELLATION_WINDOW_HOURS || '24',
};

/**
 * Retrieves a setting value from the database, falling back to env var / hardcoded default.
 * @param key - The setting key
 * @returns The setting value as a string
 * @example
 * const hours = await getSetting('cancellationWindowHours'); // '24'
 */
export async function getSetting(key: string): Promise<string> {
  const row = await db.appSettings.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? '';
}

/**
 * Upserts a setting value in the database.
 * @param key - The setting key
 * @param value - The new value
 * @example
 * await setSetting('cancellationWindowHours', '48');
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.appSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Returns all settings, merging DB values over defaults.
 * @returns Record of all setting key-value pairs
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.appSettings.findMany();
  const result = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
