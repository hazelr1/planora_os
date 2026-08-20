import { VercelRequest, VercelResponse } from '@vercel/node';

// Minimal Vercel serverless function to forward prompts to OpenAI.
// Reads OPENAI_API_KEY from server env. Protects key from browser.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send({ error: 'Method not allowed' });
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).send({ error: 'Missing prompt' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).send({ error: 'AI provider not configured' });

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
    });
    const j = await r.json();
    const result = j?.choices?.[0]?.message?.content ?? j;
    res.status(200).json({ result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
