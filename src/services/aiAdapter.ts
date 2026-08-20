/**
 * Minimal AI adapter for prototyping.
 * Supports a "console" fallback and optional providers via env.
 */
type Provider = 'console' | 'huggingface' | 'openai';

const DEFAULT: Provider = 'console';

function getProvider(): Provider {
  if (import.meta.env.VITE_OPENAI_KEY) return 'openai';
  if (import.meta.env.VITE_HF_API_URL) return 'huggingface';
  return DEFAULT;
}

export async function askAI(prompt: string, context?: Record<string, any>) {
  const provider = getProvider();
  const cacheKey = `ai_cache:${btoa(prompt).slice(0, 64)}`;
  try {
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // ignore storage errors
  }

  let response: any = null;
  if (provider === 'openai') {
    const key = import.meta.env.VITE_OPENAI_KEY;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
    });
    const json = await res.json();
    response = json?.choices?.[0]?.message?.content ?? JSON.stringify(json);
  } else if (provider === 'huggingface') {
    const url = import.meta.env.VITE_HF_API_URL;
    const res = await fetch(url, { method: 'POST', body: JSON.stringify({ inputs: prompt }), headers: { 'Content-Type': 'application/json' } });
    const json = await res.json();
    response = json?.generated_text ?? JSON.stringify(json);
  } else {
    // Console fallback: echo prompt with brief instructions — useful for offline prototyping
    response = `AI (console fallback): ${prompt.slice(0, 300)}${prompt.length > 300 ? '…' : ''}`;
  }

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(response));
  } catch (e) {}

  return response;
}
