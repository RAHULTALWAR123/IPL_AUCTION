/**
 * Structural types for the Supabase JS client used in Edge repos.
 * Kept in sync with `edge-ambient.d.ts` (Next/TS workspace cannot resolve `npm:` imports).
 */

export type EdgeDbError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

export interface EdgeSelectFilterBuilder {
  eq(column: string, value: unknown): EdgeSelectFilterBuilder;
  in(column: string, values: readonly unknown[]): EdgeSelectFilterBuilder;
  order(
    column: string,
    options?: { ascending?: boolean }
  ): EdgeSelectFilterBuilder;
  limit(n: number): Promise<{ data: unknown[] | null; error: EdgeDbError }>;
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: EdgeDbError }>;
}

/** `.update()` / `.delete()` chain — awaitable after `.eq()` / `.in()` filters. */
export interface EdgeModifyFilterBuilder
  extends PromiseLike<{ data: unknown; error: EdgeDbError }> {
  eq(column: string, value: unknown): EdgeModifyFilterBuilder;
  in(column: string, values: readonly unknown[]): EdgeModifyFilterBuilder;
}

export interface EdgeInsertBuilder
  extends PromiseLike<{ data: unknown; error: EdgeDbError }> {
  select(_columns: string): Promise<{ data: unknown; error: EdgeDbError }>;
}

/** Subset of `createClient` return type: repo helpers only need `.from`. */
export type EdgeServiceRoleSupabase = {
  from(table: string): {
    select(columns: string): EdgeSelectFilterBuilder;
    insert(values: Record<string, unknown>): EdgeInsertBuilder;
    update(values: Record<string, unknown>): EdgeModifyFilterBuilder;
    delete(): EdgeModifyFilterBuilder;
  };
};
