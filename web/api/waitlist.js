// POST /api/waitlist  { email, website? }  -> { ok: true }
// Stores the email in Supabase `public.waitlist`. Duplicate emails are ignored
// and answered the same way, so the endpoint never reveals who signed up.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('waitlist: missing Supabase env vars');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: real users never fill the hidden "website" field.
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  const row = {
    email,
    source: String(body.source || 'landing').slice(0, 40),
    locale: String(req.headers['accept-language'] || '').split(',')[0].slice(0, 20) || null,
  };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?on_conflict=email`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      console.error('waitlist: supabase insert failed', r.status, await r.text());
      return res.status(502).json({ ok: false, error: 'storage_failed' });
    }
  } catch (err) {
    console.error('waitlist: supabase unreachable', err);
    return res.status(502).json({ ok: false, error: 'storage_failed' });
  }

  return res.status(200).json({ ok: true });
}
