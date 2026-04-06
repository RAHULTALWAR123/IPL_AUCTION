/** Shared CORS + JSON helpers for Edge Functions (server-to-server + optional browser). */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-auction-internal-secret",
};

export function jsonResponse(
  status: number,
  body: Record<string, unknown>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function corsPreflightResponse(): Response {
  return new Response("ok", { headers: corsHeaders });
}
