import { z } from 'zod';

const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1, 'TURSO_DATABASE_URL is required'),
  TURSO_AUTH_TOKEN: z.string().min(1, 'TURSO_AUTH_TOKEN is required'),
  ALLOWED_ORIGIN: z.string().optional(),
  NODE_ENV: z.string().default('development'),
  API_MAX_BODY_MB: z.string().default('2').transform((v) => Math.max(1, parseInt(v, 10) || 2)),
  SYNC_RATE_LIMIT_PER_MIN: z.string().default('60').transform((v) => Math.max(1, parseInt(v, 10) || 60)),
  AUTH_RATE_LIMIT_PER_MIN: z.string().default('10').transform((v) => Math.max(1, parseInt(v, 10) || 10)),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}