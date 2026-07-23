// Shared Jayapay helpers
// Uses node-forge (npm:node-forge) for raw RSA PKCS#1 private-key encrypt
// — node:crypto privateEncrypt is broken in Deno for this use case

import forge from "npm:node-forge@1.3.3";

export const JAYAPAY_BASE = (Deno.env.get("JAYAPAY_BASE_URL") || "https://global-id-openapi.jayapayment.com")
  .trim()
  .replace(/\/+$/, "");
export const JAYAPAY_ENV = (Deno.env.get("JAYAPAY_ENV") || "production").trim().toLowerCase();
export const JAYAPAY_MERCHANT_CODE = (Deno.env.get("JAYAPAY_MCH_NO") || "").trim();
const PRIVATE_KEY_RAW = (Deno.env.get("JAYAPAY_PRIVATE_KEY") || "").trim();
const PLATFORM_PUBLIC_KEY_RAW = (Deno.env.get("JAYAPAY_PLATFORM_PUBLIC_KEY") || "").trim();

export function jayapayUrl(path: string): string {
  let normalized = path.startsWith("/") ? path : `/${path}`;
  if (JAYAPAY_ENV !== "production" && !normalized.startsWith("/sandbox/")) {
    normalized = `/sandbox${normalized}`;
  }
  return `${JAYAPAY_BASE}${normalized}`;
}

function cleanBase64(raw: string): string {
  return raw
    .replace(/-----BEGIN[^-]*-----/g, "")
    .replace(/-----END[^-]*-----/g, "")
    .replace(/\s+/g, "");
}

function wrapPem(b64: string, label: string): string {
  const lines = b64.match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

function loadPrivateKey(): forge.pki.rsa.PrivateKey {
  if (!PRIVATE_KEY_RAW) throw new Error("JAYAPAY_PRIVATE_KEY not configured");
  const b64 = cleanBase64(PRIVATE_KEY_RAW);

  // Try PKCS#8 ("PRIVATE KEY") first — most keygen tools output this
  try {
    const pem = wrapPem(b64, "PRIVATE KEY");
    return forge.pki.privateKeyFromPem(pem);
  } catch (_) {
    /* fall through */
  }

  // Try PKCS#1 ("RSA PRIVATE KEY")
  try {
    const pem = wrapPem(b64, "RSA PRIVATE KEY");
    return forge.pki.privateKeyFromPem(pem);
  } catch (_) {
    /* fall through */
  }

  throw new Error("Cannot parse JAYAPAY_PRIVATE_KEY — must be RSA PKCS#8 or PKCS#1 base64");
}

function loadPublicKey(): forge.pki.rsa.PublicKey {
  if (!PLATFORM_PUBLIC_KEY_RAW) throw new Error("JAYAPAY_PLATFORM_PUBLIC_KEY not configured");
  const b64 = cleanBase64(PLATFORM_PUBLIC_KEY_RAW);

  try {
    return forge.pki.publicKeyFromPem(wrapPem(b64, "PUBLIC KEY"));
  } catch (_) {
    /* next */
  }
  try {
    return forge.pki.publicKeyFromPem(wrapPem(b64, "RSA PUBLIC KEY"));
  } catch (_) {
    /* next */
  }

  throw new Error("Cannot parse JAYAPAY_PLATFORM_PUBLIC_KEY");
}

/**
 * Build StrA for Jayapay signature.
 *
 * Rules (from official docs):
 *   - Sort all non-empty parameter keys in ascending ASCII order
 *   - Concatenate VALUES only — no keys, no separators
 *   - Exclude ONLY sign / platSign (per official docs)
 */
function sortedSignKeys(params: Record<string, unknown>): string[] {
  const OMIT = new Set(["sign", "platSign"]);
  return Object.keys(params)
    .filter((k) => !OMIT.has(k))
    .filter((k) => {
      const v = params[k];
      return v !== undefined && v !== null && String(v).length > 0;
    })
    .sort();
}

function buildStrA(params: Record<string, unknown>): string {
  const keys = sortedSignKeys(params);

  const strA = keys.map((k) => String(params[k])).join("");
  console.log("[Jayapay] Sign keys:", keys);
  console.log("[Jayapay] StrA bytes:", new TextEncoder().encode(strA).length);
  return strA;
}

function buildKeyValueStrA(params: Record<string, unknown>): string {
  return sortedSignKeys(params).map((k) => `${k}=${String(params[k])}`).join("&");
}

/**
 * Chunked RSA private-key encrypt (PKCS#1 v1.5) — matches Java rsaSplitCodec.
 * Block size = keySize/8 - 11 bytes per input chunk.
 */
function rsaPrivateEncryptChunked(data: string, priv: forge.pki.rsa.PrivateKey): string {
  const keyBytes = Math.floor(priv.n.bitLength() / 8);
  const maxBlock = keyBytes - 11;
  const bytes = forge.util.encodeUtf8(data);
  let out = "";
  for (let off = 0; off < bytes.length; off += maxBlock) {
    out += forge.pki.rsa.encrypt(bytes.substring(off, off + maxBlock), priv, 0x01);
  }
  return forge.util.encode64(out);
}

function rsaPublicDecryptChunked(b64: string, pub: forge.pki.rsa.PublicKey): string {
  const keyBytes = Math.floor(pub.n.bitLength() / 8);
  const encrypted = forge.util.decode64(b64);
  let out = "";
  for (let off = 0; off < encrypted.length; off += keyBytes) {
    out += forge.pki.rsa.decrypt(encrypted.substring(off, off + keyBytes), pub, true, false);
  }
  return forge.util.decodeUtf8(out);
}

type SignMode = "valueOnly" | "keyValue" | "sha256" | "sha1";

export function signParams(params: Record<string, unknown>, mode: SignMode = "valueOnly"): string {
  const strA = mode === "keyValue" ? buildKeyValueStrA(params) : buildStrA(params);
  const priv = loadPrivateKey();
  let b64: string;
  if (mode === "sha256") {
    const md = forge.md.sha256.create();
    md.update(strA, "utf8");
    b64 = forge.util.encode64(priv.sign(md));
  } else if (mode === "sha1") {
    const md = forge.md.sha1.create();
    md.update(strA, "utf8");
    b64 = forge.util.encode64(priv.sign(md));
  } else {
    b64 = rsaPrivateEncryptChunked(strA, priv);
  }
  console.log("[Jayapay] Signature mode:", mode, "length:", b64.length);
  return b64;
}

export function verifyCallback(params: Record<string, unknown>): boolean {
  const sign = (params["platSign"] || params["sign"]) as string | undefined;
  if (!sign || typeof sign !== "string") return false;
  try {
    const pub = loadPublicKey();
    const { sign: _s, platSign: _ps, ...rest } = params as Record<string, unknown>;
    const strA = buildStrA(rest);
    return rsaPublicDecryptChunked(sign, pub) === strA;
  } catch (e) {
    console.error("[Jayapay] verifyCallback error:", e);
    return false;
  }
}

export function jayapayTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function isSignatureRejected(json: Record<string, unknown>): boolean {
  const code = String(json?.code || "");
  const msg = String(json?.msg || json?.message || json?.platRespMessage || "");
  return code === "0002" || /signature.*verif|sign.*verif/i.test(msg);
}

export async function jayapayPost(path: string, body: Record<string, unknown>) {
  const attempts: Array<{ mode: SignMode; body: Record<string, unknown> }> = [
    { mode: "valueOnly", body },
    { mode: "keyValue", body },
    { mode: "sha256", body },
    { mode: "sha1", body },
  ];

  let last: { ok: boolean; status: number; json: Record<string, unknown>; signMode: string } | null = null;
  for (const attempt of attempts) {
    const sign = signParams(attempt.body, attempt.mode);
    const finalBody = { ...attempt.body, sign };
    console.log("[Jayapay] POST →", path, "| env:", JAYAPAY_ENV, "| merchant:", attempt.body.merchantCode || attempt.body.mchNo, "| mode:", attempt.mode);

    const res = await fetch(jayapayUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalBody),
    });

    const text = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    last = { ok: res.ok, status: res.status, json, signMode: attempt.mode };
    if (!isSignatureRejected(json)) {
      return last;
    }

    console.error("[Jayapay] Signature rejected for mode:", attempt.mode);
  }

  return last!;
}
