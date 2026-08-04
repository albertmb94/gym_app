import { z } from 'zod';

const baseSchema = z.object({
  ALLOWED_ORIGIN: z.string().optional(),
  NODE_ENV: z.string().default('development'),
  API_MAX_BODY_MB: z.string().default('2').transform((v) => Math.max(1, parseInt(v, 10) || 2)),
  SYNC_RATE_LIMIT_PER_MIN: z.string().default('60').transform((v) => Math.max(1, parseInt(v, 10) || 60)),
  AUTH_RATE_LIMIT_PER_MIN: z.string().default('10').transform((v) => Math.max(1, parseInt(v, 10) || 10)),
});

export type Env = z.infer<typeof baseSchema> & {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  dbConfigured: boolean;
};

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const url = process.env.TURSO_DATABASE_URL?.trim() ?? '';
  const token = process.env.TURSO_AUTH_TOKEN?.trim() ?? '';
  cached = {
    ...parsed.data,
    TURSO_DATABASE_URL: url,
    TURSO_AUTH_TOKEN: token,
    dbConfigured: Boolean(url && token),
  };
  return cached;
}

export class DbNotConfiguredError extends Error {
  constructor() {
    super('Database is not configured: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel environment variables');
    this.name = 'DbNotConfiguredError';
  }
}