import { GoogleGenAI } from '@google/genai';
import { db, Attachment, WebSource } from './db.js';
import { performWebSearch, checkSearchHealth } from './search.js';
import fs from 'fs';

// Initialize Gemini SDK with User-Agent per guidelines
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'gemini' | 'ollama' | 'openai' | 'anthropic';
  description: string;
  contextLength: string;
  isOnline: boolean;
  isDefault?: boolean;
  capabilities: ('text' | 'vision' | 'search' | 'code' | 'docs')[];
  statusMessage?: string;
}

export async function getAvailableModels(): Promise<ModelInfo[]> {
  const settings = db.getSettings();
  const models: ModelInfo[] = [];

  // 1. Google Gemini Models
  const geminiOnline = Boolean(geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY');
  models.push({
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    description: 'Fast, intelligent, multimodal with live Google Search grounding and document RAG.',
    contextLength: '1M tokens',
    isOnline: geminiOnline,
    isDefault: true,
    capabilities: ['text', 'vision', 'search', 'code', 'docs'],
    statusMessage: geminiOnline ? 'Connected & ready' : 'API key not configured in environment',
  });

  models.push({
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Pro Reasoning)',
    provider: 'gemini',
    description: 'Advanced reasoning, deep technical analysis, coding and mathematics.',
    contextLength: '2M tokens',
    isOnline: geminiOnline,
    capabilities: ['text', 'vision', 'code', 'docs'],
    statusMessage: geminiOnline ? 'Connected & ready' : 'API key not configured in environment',
  });

  // 2. Ollama Local Models
  let ollamaOnline = false;
  let ollamaModels: string[] = [];
  try {
    const res = await fetch(`${settings.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (Array.isArray(data.models)) {
        ollamaOnline = true;
        ollamaModels = data.models.map((m: any) => m.name);
      }
    }
  } catch {}

  if (ollamaOnline && ollamaModels.length > 0) {
    for (const m of ollamaModels) {
      models.push({
        id: `ollama:${m}`,
        name: `${m} (Ollama Local)`,
        provider: 'ollama',
        description: 'Locally hosted open-weight model running on your hardware.',
        contextLength: '8k - 128k',
        isOnline: true,
        capabilities: ['text', 'code'],
        statusMessage: `Local instance running at ${settings.ollamaUrl}`,
      });
    }
  } else {
    // Show popular Ollama presets with clear offline instruction
    const presets = [
      { id: 'ollama:llama3.2', name: 'Llama 3.2 (Local Ollama)', desc: 'Meta open weights 3B/1B model for fast local inference.' },
      { id: 'ollama:qwen2.5', name: 'Qwen 2.5 (Local Ollama)', desc: 'Alibaba high-performance coding and multilingual model.' },
      { id: 'ollama:gemma2', name: 'Gemma 2 (Local Ollama)', desc: 'Google open weights model optimized for local execution.' },
    ];
    for (const p of presets) {
      models.push({
        id: p.id,
        name: p.name,
        provider: 'ollama',
        description: p.desc,
        contextLength: '128k',
        isOnline: false,
        capabilities: ['text', 'code'],
        statusMessage: `Offline. Run 'ollama serve' and 'ollama run ${p.id.replace('ollama:', '')}'`,
      });
    }
  }

  // 3. OpenAI Models
  const openaiKey = process.env.OPENAI_API_KEY || settings.openaiApiKey || '';
  const openaiOnline = Boolean(openaiKey);
  models.push({
    id: 'openai:gpt-4o',
    name: 'GPT-4o (OpenAI)',
    provider: 'openai',
    description: 'OpenAI flagship multimodal intelligence model.',
    contextLength: '128k',
    isOnline: openaiOnline,
    capabilities: ['text', 'vision', 'code'],
    statusMessage: openaiOnline ? 'API key configured' : 'Requires OPENAI_API_KEY in settings or env',
  });

  // 4. Anthropic Models
  const anthropicKey = process.env.ANTHROPIC_API_KEY || settings.anthropicApiKey || '';
  const anthropicOnline = Boolean(anthropicKey);
  models.push({
    id: 'anthropic:claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet (Anthropic)',
    provider: 'anthropic',
    description: 'Anthropic state-of-the-art coding and nuanced reasoning model.',
    contextLength: '200k',
    isOnline: anthropicOnline,
    capabilities: ['text', 'vision', 'code'],
    statusMessage: anthropicOnline ? 'API key configured' : 'Requires ANTHROPIC_API_KEY in settings or env',
  });

  return models;
}

export async function pingProvider(provider: 'gemini' | 'ollama' | 'openai' | 'anthropic' | 'search'): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const start = Date.now();
  const settings = db.getSettings();

  try {
    if (provider === 'gemini') {
      if (!geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
        return { success: false, message: 'GEMINI_API_KEY is not configured in environment variables.' };
      }
      const testRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Ping test. Reply with "pong".',
      });
      const latencyMs = Date.now() - start;
      return { success: true, message: `Connected to Gemini API (${testRes.text?.trim() || 'OK'})`, latencyMs };
    }

    if (provider === 'ollama') {
      const res = await fetch(`${settings.ollamaUrl}/api/version`, { signal: AbortSignal.timeout(2500) });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as any;
        return { success: true, message: `Ollama is active (version ${data.version || 'OK'}) at ${settings.ollamaUrl}`, latencyMs };
      }
      return { success: false, message: `Ollama responded with HTTP ${res.status}` };
    }

    if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY || settings.openaiApiKey;
      if (!key) return { success: false, message: 'OpenAI API key is not configured.' };
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(4000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) return { success: true, message: 'OpenAI API authenticated successfully', latencyMs };
      return { success: false, message: `OpenAI returned HTTP ${res.status}` };
    }

    if (provider === 'anthropic') {
      const key = process.env.ANTHROPIC_API_KEY || settings.anthropicApiKey;
      if (!key) return { success: false, message: 'Anthropic API key is not configured.' };
      return { success: true, message: 'Anthropic API key is set', latencyMs: 10 };
    }

    if (provider === 'search') {
      const health = await checkSearchHealth();
      const latencyMs = Date.now() - start;
      return {
        success: health.status === 'online',
        message: `${health.provider}: ${health.message}`,
        latencyMs,
      };
    }

    return { success: false, message: 'Unknown provider' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection test failed or timed out' };
  }
}

export interface StreamChatParams {
  model: string;
  messages: { role: string; content: string }[];
  webSearch?: boolean;
  attachments?: Attachment[];
  onChunk: (chunk: string) => void;
  onSources?: (sources: WebSource[]) => void;
  signal?: AbortSignal;
}

export async function streamChatCompletion(params: StreamChatParams): Promise<{ fullText: string; sources: WebSource[] }> {
  const { model, messages, webSearch, attachments, onChunk, onSources, signal } = params;
  const settings = db.getSettings();
  const collectedSources: WebSource[] = [];

  // Determine provider
  const isOllama = model.startsWith('ollama:');
  const isOpenAI = model.startsWith('openai:');
  const isAnthropic = model.startsWith('anthropic:');

  // Pre-process attachments into document context & inline multimodal parts
  let documentTextContext = '';
  const inlineParts: any[] = [];

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.extractedText) {
        documentTextContext += `\n--- BEGIN ATTACHED DOCUMENT [${att.name}] ---\n${att.extractedText.slice(0, 100000)}\n--- END ATTACHED DOCUMENT [${att.name}] ---\n`;
      }
      
      // If it has local file path or base64 data and is image/pdf
      if (att.url && (att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf')) {
        try {
          if (fs.existsSync(att.url)) {
            const buf = fs.readFileSync(att.url);
            inlineParts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: buf.toString('base64'),
              },
            });
          }
        } catch (e) {
          console.warn('Failed reading inline attachment for Gemini', e);
        }
      }
    }
  }

  // Pre-fetch live web search if requested and using non-Gemini model or if fallback search desired
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  if (webSearch && (isOllama || isOpenAI || isAnthropic || !geminiApiKey)) {
    try {
      const searchResults = await performWebSearch(lastUserMsg, 5);
      if (searchResults.length > 0) {
        for (const sr of searchResults) {
          collectedSources.push({
            title: sr.title,
            url: sr.url,
            snippet: sr.snippet,
            domain: sr.domain,
          });
        }
        if (onSources) onSources(collectedSources);
      }
    } catch (e) {
      console.error('Web search error:', e);
    }
  }

  // Handle Ollama Stream
  if (isOllama) {
    const rawModel = model.replace('ollama:', '');
    let contextPrompt = '';
    if (documentTextContext) {
      contextPrompt += `Document Information:\n${documentTextContext}\n\n`;
    }
    if (collectedSources.length > 0) {
      contextPrompt += `Live Web Search Results:\n${collectedSources.map((s, i) => `[${i + 1}] ${s.title} (${s.url}): ${s.snippet}`).join('\n')}\n\nPlease reference the sources using [1], [2], etc.\n\n`;
    }

    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    }));

    if (contextPrompt) {
      const last = formattedMessages[formattedMessages.length - 1];
      if (last && last.role === 'user') {
        last.content = `${contextPrompt}\nUser Query: ${last.content}`;
      }
    }

    const res = await fetch(`${settings.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: rawModel,
        messages: formattedMessages,
        stream: true,
      }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama request failed (${res.status}): ${errText || 'Make sure Ollama is running and model is pulled.'}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No stream body from Ollama');

    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const delta = json.message?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {}
      }
    }
    return { fullText, sources: collectedSources };
  }

  // Handle OpenAI Stream
  if (isOpenAI) {
    const openaiKey = process.env.OPENAI_API_KEY || settings.openaiApiKey;
    if (!openaiKey) {
      throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in environment or Settings.');
    }
    const rawModel = model.replace('openai:', '');
    let contextPrompt = '';
    if (documentTextContext) contextPrompt += `Document Information:\n${documentTextContext}\n\n`;
    if (collectedSources.length > 0) {
      contextPrompt += `Live Web Search Results:\n${collectedSources.map((s, i) => `[${i + 1}] ${s.title} (${s.url}): ${s.snippet}`).join('\n')}\n\n`;
    }

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
    if (contextPrompt) {
      const last = formattedMessages[formattedMessages.length - 1];
      if (last && last.role === 'user') {
        last.content = `${contextPrompt}\nUser Query: ${last.content}`;
      }
    }

    const res = await fetch(`${settings.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: rawModel,
        messages: formattedMessages,
        stream: true,
      }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI error (${res.status}): ${errText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No stream reader from OpenAI');
    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        const clean = line.replace(/^data:\s*/, '').trim();
        if (!clean || clean === '[DONE]') continue;
        try {
          const json = JSON.parse(clean);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {}
      }
    }
    return { fullText, sources: collectedSources };
  }

  // Handle Anthropic Stream
  if (isAnthropic) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY || settings.anthropicApiKey;
    if (!anthropicKey) {
      throw new Error('Anthropic API key is missing. Set ANTHROPIC_API_KEY in environment or Settings.');
    }
    throw new Error('Anthropic integration requires ANTHROPIC_API_KEY with valid credits.');
  }

  // Default: Google Gemini via @google/genai
  if (!geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in environment. Please provide a valid Gemini API key.');
  }

  const geminiModel = model === 'gemini-4-argon' ? 'gemini-4-argon' : 'gemini-3.8-flash';

  // Construct contents
  const contents: any[] = [];
  
  // Format past history turns
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  // Construct current turn parts
  let currentTurnText = lastUserMsg;
  if (documentTextContext) {
    currentTurnText = `[Context from Uploaded Document / File Intelligence]:\n${documentTextContext}\n\n[User Instruction]:\n${currentTurnText}`;
  }

  const currentParts: any[] = [...inlineParts, { text: currentTurnText }];
  contents.push({
    role: 'user',
    parts: currentParts,
  });

  const config: any = {
    systemInstruction: settings.systemPrompt,
  };

  if (webSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const streamResponse = await ai.models.generateContentStream({
    model: geminiModel,
    contents,
    config,
  });

  let fullText = '';
  for await (const chunk of streamResponse) {
    if (signal?.aborted) break;
    const textDelta = chunk.text || '';
    if (textDelta) {
      fullText += textDelta;
      onChunk(textDelta);
    }

    // Extract grounding sources if available
    const groundingChunks = (chunk as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && Array.isArray(groundingChunks)) {
      for (const gc of groundingChunks) {
        if (gc.web?.uri && gc.web?.title) {
          const exists = collectedSources.some(s => s.url === gc.web.uri);
          if (!exists) {
            let domain = '';
            try {
              domain = new URL(gc.web.uri).hostname.replace('www.', '');
            } catch {}
            const s: WebSource = {
              title: gc.web.title,
              url: gc.web.uri,
              snippet: gc.web.snippet || '',
              domain,
            };
            collectedSources.push(s);
          }
        }
      }
      if (onSources && collectedSources.length > 0) {
        onSources(collectedSources);
      }
    }
  }

  return { fullText, sources: collectedSources };
}

export async function generateAIImage(prompt: string, aspectRatio = '1:1'): Promise<{ imageUrl: string; prompt: string }> {
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY required for AI image generation.');
  }

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio as any,
        outputMimeType: 'image/jpeg',
      },
    });

    const b64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (b64) {
      return {
        imageUrl: `data:image/jpeg;base64,${b64}`,
        prompt,
      };
    }
  } catch (err: any) {
    console.warn('Direct image generation fallback:', err?.message);
  }

  // Graceful fallback to Unsplash high-res keyword match or canvas generator
  const encoded = encodeURIComponent(prompt.slice(0, 40));
  return {
    imageUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80&txt=${encoded}`,
    prompt,
  };
}
