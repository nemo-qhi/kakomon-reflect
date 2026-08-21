import { env } from "cloudflare:workers";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const codePattern = /^[A-Z0-9]{6}$/;
const maxPayloadLength = 300_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

function createCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    await ensureShareTable();

    const body = (await request.json()) as { payload?: unknown };
    const payload = JSON.stringify(body.payload);

    if (!body.payload || payload.length > maxPayloadLength) {
      return json({ error: "invalid payload" }, { status: 400 });
    }

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = createCode();
      if (!codePattern.test(code)) continue;

      const result = await env.DB.prepare(
        "INSERT OR IGNORE INTO share_codes (code, payload, created_at) VALUES (?, ?, ?)",
      )
        .bind(code, payload, new Date().toISOString())
        .run();

      if (result.meta.changes === 1) {
        return json({ code });
      }
    }

    return json({ error: "could not create code" }, { status: 503 });
  } catch {
    return json({ error: "share code save failed" }, { status: 500 });
  }
}
