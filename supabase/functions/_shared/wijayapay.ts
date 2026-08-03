// Shared WijayaPay payment gateway helpers
import md5 from "npm:js-md5@0.8.3";

export const WIJAYAPAY_BASE = (Deno.env.get("WIJAYAPAY_BASE_URL") || "https://gateway.wijayapay.com/api")
  .trim()
  .replace(/\/+$/, "");

export const CODE_MERCHANT = (Deno.env.get("WIJAYAPAY_CODE_MERCHANT") || "").trim();
export const API_KEY = (Deno.env.get("WIJAYAPAY_API_KEY") || "").trim();

export function assertCreds() {
  if (!CODE_MERCHANT || !API_KEY) {
    throw new Error("Kredensial WijayaPay belum dikonfigurasi");
  }
}

export function signature(refId: string): string {
  return md5(`${CODE_MERCHANT}${API_KEY}${refId}`);
}

function url(path: string, params: Record<string, string> = {}) {
  const u = new URL(`${WIJAYAPAY_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

async function parse(res: Response) {
  const text = await res.text();
  let json: Record<string, any>;
  try {
    json = JSON.parse(text);
  } catch {
    json = { success: false, message: text };
  }
  return { ok: res.ok, status: res.status, json };
}

export async function wijayaGet(path: string, params: Record<string, string> = {}) {
  assertCreds();
  const res = await fetch(url(path, { code_merchant: CODE_MERCHANT, api_key: API_KEY, ...params }), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return await parse(res);
}

export async function wijayaPost(path: string, body: Record<string, unknown>, refId: string) {
  assertCreds();
  const payload = { code_merchant: CODE_MERCHANT, api_key: API_KEY, ref_id: refId, ...body };
  const res = await fetch(url(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Signature": signature(refId),
    },
    body: JSON.stringify(payload),
  });
  return await parse(res);
}

export function wijayaErrorMessage(json: Record<string, any>): string {
  return String(json?.message || json?.error || "WijayaPay error");
}

export { md5 };
