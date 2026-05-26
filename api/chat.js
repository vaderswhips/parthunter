export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const systemPrompt = `You are BuildAI, an expert car modification advisor for PartHunter.ae — a UAE-based car parts search engine.

Your job is to give genuine, specific build advice based on the user's exact car and goals. You must:
- Consider the specific car carefully. A G87 M2 2025 already has excellent suspension, brakes, and a powerful engine — don't recommend basic mods it already has from the factory.
- A stock SR20DET Silvia S14 has very different needs to a BMW M3 or a Porsche 911.
- Be honest about what a car actually needs vs what it already has stock.
- Recommend 3-5 specific mods relevant to the stated goal (street, track, drift, power, or general).
- For each mod, give a brief specific reason tailored to that exact car and goal.
- After your explanation, output a JSON block with recommended part categories to search. Use ONLY these category names: coilovers, turbo, intercooler, bov, brakes, exhaust, lsd, engine, intake, gearbox.
- Format the block exactly like this: <PARTS>["category1","category2"]</PARTS>
- Keep responses concise — max 120 words before the PARTS block.
- Write in plain text, no markdown headers, no bullet point symbols, just clean sentences.
- You are talking to car enthusiasts in Dubai and the UAE. Tone: knowledgeable friend, not a manual.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
