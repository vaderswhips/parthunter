// api/chat.js — PartHunter BuildAI serverless function (Vercel)
// Calls the Claude API and returns a structured, prioritized build plan as JSON.
// Requires env var ANTHROPIC_API_KEY (set in Vercel → Settings → Environment Variables).

export default async function handler(req, res) {
  // CORS (same-origin in prod, but keep it permissive for local testing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY. Add it in Vercel → Settings → Environment Variables, then redeploy.' });
  }

  const { car, goal, budget } = req.body || {};
  if (!car || !goal) {
    return res.status(400).json({ error: 'Missing car or goal.' });
  }

  const systemPrompt = `You are BuildAI, the build planner for PartHunter.ae — a UAE-based performance car parts search engine.
Given a car, a power/usage goal, and a budget in AED, return a prioritized parts plan tailored to that exact platform.
Rules:
- Be specific to the platform (correct engine, common turbo sizing, real supporting mods).
- Order items by priority — what they must buy first comes first.
- Flag compatibility issues or supporting-mod requirements honestly in the "note".
- Prices are rough UAE estimates in AED. Use ranges like "~5,800".
- Keep each note to one or two punchy sentences. Tone: knowledgeable car-enthusiast, no fluff.
- Stay within the stated budget where realistic; if the goal isn't achievable on budget, say so in the first item's note.
Respond with ONLY valid JSON, no markdown, no preamble, in exactly this shape:
{"summary":"one-line summary of the build direction","items":[{"part":"short part/category name","note":"why + compatibility advice","price":"~X,XXX AED"}]}`;

  const userPrompt = `Car: ${car}\nGoal: ${goal}\nBudget: ${budget || 'not specified'} AED\nGenerate the prioritized build plan as JSON.`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(502).json({ error: 'Claude API error', detail: errText });
    }

    const data = await apiRes.json();
    const raw = (data.content || [])
      .map(b => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();

    // Strip any accidental code fences, then parse.
    const clean = raw.replace(/```json|```/g, '').trim();
    let plan;
    try {
      plan = JSON.parse(clean);
    } catch (e) {
      return res.status(200).json({
        summary: 'BuildAI returned an unexpected format.',
        items: [{ part: 'Raw response', note: clean.slice(0, 400), price: '' }]
      });
    }

    return res.status(200).json(plan);
  } catch (err) {
    return res.status(500).json({ error: 'Request failed', detail: String(err) });
  }
}
