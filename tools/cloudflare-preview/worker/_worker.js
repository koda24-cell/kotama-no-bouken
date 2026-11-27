// Password gate for the private Cloudflare Pages preview (Pages "advanced mode").
// Copied as _worker.js into every deployment's output directory, so EVERY
// hostname of that deployment (fixed URL, per-deployment URL, branch alias)
// runs this code before any file is served.
//
// - PREVIEW_PASSWORD (Pages project secret, >= 12 chars) is required; without it
//   every request gets 503 (fail-closed).
// - Unauthenticated requests get 401 + a small login page; no site file is served.
// - Successful login sets an HttpOnly, Secure, HMAC-signed cookie (30 days).
//   Changing the password invalidates all sessions.
// Free plan: each request is one Workers invocation (100,000/day free; beyond
// that requests fail, nothing is billed on the Free plan).

const COOKIE = "kp_session";
const MARK = "kotama-preview-login";
const MAX_AGE = 30 * 24 * 3600;
const enc = new TextEncoder();

async function hmacKey(pw) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode("kotama-session-v1:" + pw));
  return crypto.subtle.importKey("raw", d, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function fromB64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function makeToken(k) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode("v1." + exp));
  return "v1." + exp + "." + b64u(sig);
}
async function validToken(k, tok) {
  if (!tok) return false;
  const p = tok.split(".");
  if (p.length !== 3 || p[0] !== "v1" || !/^\d{1,12}$/.test(p[1])) return false;
  if (Number(p[1]) < Date.now() / 1000) return false;
  try {
    return await crypto.subtle.verify("HMAC", k, fromB64u(p[2]), enc.encode("v1." + p[1]));
  } catch {
    return false;
  }
}
function getCookie(req, name) {
  for (const part of (req.headers.get("Cookie") || "").split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}
async function sameSecret(k, a, b) {
  // compare HMACs of both values so timing does not reveal the password
  const [x, y] = await Promise.all([
    crypto.subtle.sign("HMAC", k, enc.encode("cmp:" + a)),
    crypto.subtle.sign("HMAC", k, enc.encode("cmp:" + b)),
  ]);
  const X = new Uint8Array(x), Y = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < X.length; i++) d |= X[i] ^ Y[i];
  return d === 0;
}
function safeNext(n) {
  return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") && n.length < 512 ? n : "/";
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SECURITY = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};
function loginPage(status, message, next) {
  const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>開発版ログイン</title><style>body{font-family:system-ui,sans-serif;max-width:22rem;margin:15vh auto;padding:0 1rem}input,button{font-size:1.1rem;width:100%;padding:.6rem;margin:.4rem 0;box-sizing:border-box}.e{color:#b00}</style><main id="${MARK}"><h1>コタマのぼうけん 開発版</h1>${message ? `<p class="e">${esc(message)}</p>` : ""}<form method="post" action="/__login"><input type="hidden" name="next" value="${esc(next)}"><input type="password" name="password" autocomplete="current-password" placeholder="パスワード" required autofocus><button type="submit">ログイン</button></form></main></html>`;
  return new Response(html, { status, headers: { ...SECURITY, "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" } });
}

export default {
  async fetch(req, env) {
    const pw = env.PREVIEW_PASSWORD;
    if (typeof pw !== "string" || pw.length < 12) {
      return new Response("Preview locked: password not configured.", { status: 503, headers: SECURITY });
    }
    const url = new URL(req.url);
    const k = await hmacKey(pw);

    if (url.pathname === "/__login") {
      if (req.method === "POST") {
        if (!(req.headers.get("Content-Type") || "").includes("application/x-www-form-urlencoded")) {
          return loginPage(400, "送信形式が正しくありません", "/");
        }
        const body = await req.text();
        if (body.length > 2048) return loginPage(400, "入力が長すぎます", "/");
        const f = new URLSearchParams(body);
        const next = safeNext(f.get("next"));
        if (!(await sameSecret(k, f.get("password") || "", pw))) {
          await new Promise((r) => setTimeout(r, 800)); // slow down guessing
          return loginPage(401, "パスワードが違います", next);
        }
        return new Response(null, { status: 303, headers: { ...SECURITY, Location: next,
          "Set-Cookie": `${COOKIE}=${await makeToken(k)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax` } });
      }
      return loginPage(200, "", safeNext(url.searchParams.get("next")));
    }
    if (url.pathname === "/__logout") {
      return new Response(null, { status: 303, headers: { ...SECURITY, Location: "/__login",
        "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
    }
    if (!(await validToken(k, getCookie(req, COOKIE)))) {
      return loginPage(401, "", url.pathname + url.search);
    }
    const res = await env.ASSETS.fetch(req);
    const h = new Headers(res.headers);
    h.set("X-Robots-Tag", "noindex, nofollow");
    h.set("Referrer-Policy", "no-referrer");
    h.set("Cache-Control", (h.get("Content-Type") || "").includes("text/html") ? "private, no-cache" : "private, max-age=3600");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  },
};
