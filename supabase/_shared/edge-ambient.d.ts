/**
 * Ambient types for Supabase Edge (Deno) when TypeScript is driven by the Next.js
 * workspace (no Deno LSP). Not used at runtime.
 * From `functions/<name>/index.ts` use: /// <reference path="../../_shared/edge-ambient.d.ts" />
 */
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

type DbError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

/** PostgREST select chain after `.from().select(...)` */
interface EdgeSelectFilterBuilder {
  eq(column: string, value: unknown): EdgeSelectFilterBuilder;
  limit(
    n: number
  ): Promise<{ data: unknown[] | null; error: DbError }>;
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: DbError }>;
}

interface EdgeInsertBuilder extends PromiseLike<{ data: unknown; error: DbError }> {
  select(_columns: string): Promise<{ data: unknown; error: DbError }>;
}

declare module "npm:@supabase/supabase-js@2" {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: {
      auth?: { persistSession?: boolean; autoRefreshToken?: boolean };
    }
  ): {
    rpc(
      fn: string,
      args?: Record<string, unknown>
    ): Promise<{
      data: unknown;
      error: DbError;
    }>;
    from(table: string): {
      select(columns: string): EdgeSelectFilterBuilder;
      insert(values: Record<string, unknown>): EdgeInsertBuilder;
    };
  };
}
