/**
 * Ambient types for Supabase Edge (Deno) when TypeScript is driven by the Next.js
 * workspace (no Deno LSP). Not used at runtime.
 * From `functions/<name>/index.ts` use: /// <reference path="../../_shared/edge-ambient.d.ts" />
 */
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

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
      error: { message: string } | null;
    }>;
  };
}
