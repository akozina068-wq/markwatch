// Markwatch — funnel counter. No cookies, no IPs, no personal data.
import { getStore } from "@netlify/blobs";

const EVENTS = ["home", "buy", "paid"];
const LABELS = {
  home: "1. Landing opened",
  buy: "2. Clicked Start watching (£24.99)",
  paid: "3. Reached thanks page",
};

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore("funnel");

  if (url.pathname === "/api/event") {
    if (req.method !== "POST") return text("POST only", 405);
    let e = "";
    try { e = JSON.parse(await req.text()).e; } catch {}
    if (!EVENTS.includes(e)) return text("bad event", 400);
    const day = new Date().toISOString().slice(0, 10);
    await store.set(`${e}/${day}/${crypto.randomUUID()}`, "1");
    return text("ok");
  }

  const { blobs } = await store.list();
  const total = {}, byDay = {};
  for (const { key } of blobs) {
    const [e, day] = key.split("/");
    total[e] = (total[e] || 0) + 1;
    byDay[day] = byDay[day] || {};
    byDay[day][e] = (byDay[day][e] || 0) + 1;
  }
  let out = "MARKWATCH FUNNEL (all time)\n\n";
  for (const e of EVENTS) out += `${LABELS[e].padEnd(36)} ${total[e] || 0}\n`;
  out += "\nBY DAY            home  buy  paid\n";
  for (const day of Object.keys(byDay).sort().reverse()) {
    const d = byDay[day];
    out += `${day}        ${String(d.home || 0).padEnd(6)}${String(d.buy || 0).padEnd(5)}${d.paid || 0}\n`;
  }
  out += "\nReal payments: check Stripe → Payments.\n";
  return text(out);
};

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

export const config = { path: ["/api/event", "/api/stats"] };
