#!/usr/bin/env node
// Launch-day mailer: emails everyone on the waiting list who has not been
// notified yet, then stamps `notified_at` so reruns never double-send.
//
//   cd web && node --env-file=.env scripts/notify-waitlist.mjs --dry-run
//   cd web && node --env-file=.env scripts/notify-waitlist.mjs
const {
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, NOTIFY_FROM, APP_STORE_URL,
} = process.env;
const DRY = process.argv.includes('--dry-run');

for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_STORE_URL })) {
  if (!v) { console.error(`Missing ${k}`); process.exit(1); }
}
if (!DRY && (!RESEND_API_KEY || !NOTIFY_FROM)) {
  console.error('Missing RESEND_API_KEY or NOTIFY_FROM'); process.exit(1);
}

const sb = (path, init = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...init,
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...init.headers,
  },
});

const subject = 'Domura sudah ada di App Store';
const html = `
<div style="font-family:system-ui,sans-serif;background:#e7dfd3;padding:32px">
  <div style="max-width:480px;margin:auto;background:#fbf9f6;border-radius:24px;padding:32px;color:#3e2c23">
    <h1 style="font-size:24px;margin:0 0 12px">Domura sudah rilis!</h1>
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px">Terima kasih sudah menunggu. Domu siap bantu kamu merawat kulkas, mesin cuci, dan kompor, sekaligus menghitung berapa yang kamu hemat.</p>
    <a href="${APP_STORE_URL}" style="display:inline-block;background:#d84b33;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px">Unduh di App Store</a>
    <p style="font-size:12px;color:#7c7774;margin:24px 0 0">Kamu menerima email ini karena mendaftar di waiting list Domura. Email ini hanya dikirim sekali.</p>
  </div>
</div>`;

let sent = 0;
for (;;) {
  const r = await sb('waitlist?select=id,email&notified_at=is.null&unsubscribed_at=is.null&order=created_at.asc&limit=100');
  if (!r.ok) { console.error('Fetch failed', r.status, await r.text()); process.exit(1); }
  const rows = await r.json();
  if (!rows.length) break;
  if (DRY) { rows.forEach((x) => console.log('would notify', x.email)); console.log(`${rows.length}+ pending (dry run shows first page)`); break; }

  for (const row of rows) {
    const m = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: NOTIFY_FROM, to: row.email, subject, html }),
    });
    if (!m.ok) { console.error('Send failed for', row.email, m.status, await m.text()); process.exit(1); }
    const u = await sb(`waitlist?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ notified_at: new Date().toISOString() }),
    });
    if (!u.ok) { console.error('Mark failed for', row.email, u.status); process.exit(1); }
    sent += 1;
    await new Promise((ok) => setTimeout(ok, 120)); // stay under Resend rate limit
  }
}
console.log(DRY ? 'Dry run done.' : `Notified ${sent} people.`);
