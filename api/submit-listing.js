// api/submit-listing.js — PartHunter user listing submission (Vercel)
// Receives a part listing from the "Sell a part" form, validates it, and emails it
// to partner@parthunter.ae for review before it goes live.
//
// Email delivery uses Resend (https://resend.com) — set RESEND_API_KEY in Vercel.
// If RESEND_API_KEY is absent, the endpoint still validates and returns success
// so the front end works immediately; the listing is just logged, not emailed.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, car, price, condition, contact, link, description } = req.body || {};

  // Validation
  const errors = [];
  if (!title || title.trim().length < 3) errors.push('Title is required.');
  if (!car || car.trim().length < 2) errors.push('Car / fitment is required.');
  if (!price || isNaN(parseFloat(String(price).replace(/[^\d.]/g, '')))) errors.push('Valid price required.');
  if (!contact || contact.trim().length < 5) errors.push('A contact (phone or email) is required.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const listing = {
    title: title.trim(),
    car: car.trim(),
    price: String(price).trim(),
    condition: condition || 'Used',
    contact: contact.trim(),
    link: (link || '').trim(),
    description: (description || '').trim(),
    submittedAt: new Date().toISOString()
  };

  const resendKey = process.env.RESEND_API_KEY;

  // If no email provider configured, accept + log so the UI works during setup.
  if (!resendKey) {
    console.log('NEW LISTING (email not configured):', JSON.stringify(listing));
    return res.status(200).json({ ok: true, queued: true, note: 'Listing received. Email delivery not yet configured.' });
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'PartHunter Listings <listings@mail.parthunter.ae>',
        to: 'partner@parthunter.ae',
        subject: `New listing: ${listing.title} (${listing.car})`,
        text:
`New part submitted on PartHunter.ae

Title:      ${listing.title}
Fitment:    ${listing.car}
Price:      ${listing.price} AED
Condition:  ${listing.condition}
Contact:    ${listing.contact}
Link:       ${listing.link || '—'}

Description:
${listing.description || '—'}

Submitted: ${listing.submittedAt}`
      })
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      console.error('Resend error:', detail);
      // Still accept the listing; just report email failed.
      return res.status(200).json({ ok: true, queued: true, note: 'Listing received; email notification failed.' });
    }

    return res.status(200).json({ ok: true, queued: false });
  } catch (err) {
    console.error('submit-listing error:', err);
    return res.status(200).json({ ok: true, queued: true, note: 'Listing received; delivery pending.' });
  }
}
