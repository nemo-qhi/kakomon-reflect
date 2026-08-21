import { env } from "cloudflare:workers";

const codePattern = /^[A-Z0-9]{6}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

async function ensureShareTable() {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS share_codes (
      code TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  ).run();
}

export function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const normalized = code.trim().toUpperCase();

    if (!codePattern.test(normalized)) {
      return json({ error: "invalid code" }, { status: 400 });
    }

    await ensureShareTable();
    const row = await env.DB.prepare(
      "SELECT payload FROM share_codes WHERE code = ?",
    )
      .bind(normalized)
      .first<{ payload: string }>();

    if (!row) {
      return json({ error: "code not found" }, { status: 404 });
    }

    return json({ payload: JSON.parse(row.payload) });
  } catch {
    return json({ error: "share code load failed" }, { status: 500 });
  }
}
