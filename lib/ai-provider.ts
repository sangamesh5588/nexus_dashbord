/**
 * Unified AI calling layer
 * Supports: Anthropic (Claude), OpenAI (GPT), Google (Gemini)
 *
 * Uses the user's own API key stored in email_settings.
 * Falls back to ANTHROPIC_API_KEY env var for backward compatibility.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { EmailSettings, AIProvider } from '../types/email';

const MODELS: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
};

function resolveProvider(settings: EmailSettings): { provider: AIProvider; apiKey: string } {
  // 1. Use the key stored in DB if present
  if (settings.ai_provider && settings.ai_api_key) {
    return { provider: settings.ai_provider, apiKey: settings.ai_api_key };
  }
  // 2. Fall back to env vars (legacy / server-level config)
  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your_')) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY };
  }
  throw new Error(
    'No AI provider configured. Go to Settings → AI Provider and add your API key.',
  );
}

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  settings: EmailSettings,
  maxTokens = 500,
): Promise<string> {
  const { provider, apiKey } = resolveProvider(settings);

  // ── Anthropic / Claude ────────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODELS.anthropic,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = msg.content[0];
    return block.type === 'text' ? block.text.trim() : '';
  }

  // ── OpenAI / GPT ──────────────────────────────────────────────────────────
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODELS.openai,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(`OpenAI error: ${err.error?.message ?? res.statusText}`);
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  // ── Google / Gemini ───────────────────────────────────────────────────────
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(`Gemini error: ${err.error?.message ?? res.statusText}`);
    }
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }

  throw new Error(`Unknown AI provider: ${provider as string}`);
}

/** Quick connectivity test — returns the model name or throws */
export async function testAIConnection(settings: EmailSettings): Promise<string> {
  const { provider } = resolveProvider(settings);
  const reply = await callAI('You are a test assistant.', 'Reply with only: OK', settings, 10);
  if (!reply) throw new Error('Empty response from AI — check your API key.');
  return MODELS[provider];
}
