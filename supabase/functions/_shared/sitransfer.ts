// Shared SiTransfer payment gateway helpers
export const SITRANSFER_BASE = (Deno.env.get("SITRANSFER_BASE_URL") || "https://rest.sitranfer.com/payment/api")
  .trim()
  .replace(/\/+$/, "");

export const SITRANSFER_KEY = (Deno.env.get("SITRANSFER_KEY") || "").trim();

export async function sitransferPost(path: string, body: Record<string, unknown>) {
  if (!SITRANSFER_KEY) throw new Error("SITRANSFER_KEY belum dikonfigurasi");
  const url = `${SITRANSFER_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const payload = { key: SITRANSFER_KEY, ...body };

  console.log("[SiTransfer] POST →", path, Object.keys(payload));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: Record<string, any>;
  try {
    json = JSON.parse(text);
  } catch {
    json = { success: false, message: text };
  }

  return { ok: res.ok, status: res.status, json };
}

export function sitransferErrorMessage(json: Record<string, any>): string {
  return String(json?.message || json?.error || "SiTransfer error");
}
