import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('sqlite.db'),
  INTEGRITY_MODE: z.enum(['demo', 'live']).default('demo'),
  PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  AI_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  AI_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Returns validated environment variables, dynamically reflecting runtime process.env
 * updates while providing strict schema bounds and backward-compatibility.
 */
export function getEnv(): Env {
  const rawPaypalEnv = process.env.PAYPAL_ENV || (process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox');
  return EnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    INTEGRITY_MODE: process.env.INTEGRITY_MODE || 'demo',
    PAYPAL_ENV: rawPaypalEnv,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
    AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
    AI_MODEL: process.env.AI_MODEL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL,
  });
}

export const env = getEnv();
