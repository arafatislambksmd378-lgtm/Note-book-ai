import type { NotePreviewItem } from '../data/phase1Data';

export const MAX_CONTEXT_TOKENS = 2048;
export const RESERVED_RESPONSE_TOKENS = 384;

export const BASE_BENGALI_SYSTEM_PROMPT =
  "You are NoteGenie AI, an offline assistant. You must answer the user's queries naturally in Bengali. Keep responses concise to save processing time.";

export interface AIModelEntry {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  quantization: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestampMs: number;
}

export interface AIModelManagerState {
  models: AIModelEntry[];
  selectedModelPath: string;
  isLoaded: boolean;
}

export const DEFAULT_GGUF_MODELS: AIModelEntry[] = [
  {
    id: 'qwen_1_5b',
    name: 'Qwen-1.5B-Instruct (4-bit)',
    path: '/storage/emulated/0/Download/Qwen-1.5B-Instruct-Q4_K_M.gguf',
    sizeBytes: 1033895936,
    quantization: 'Q4_K_M (4-bit)',
  },
  {
    id: 'phi_3_mini',
    name: 'Phi-3-Mini-4K (4-bit)',
    path: '/storage/emulated/0/Download/Phi-3-Mini-4K-Q4.gguf',
    sizeBytes: 2254857830,
    quantization: 'Q4_K_M (4-bit)',
  },
];

export function clampContextTokens(requestedTokens: number): number {
  if (requestedTokens > MAX_CONTEXT_TOKENS) return MAX_CONTEXT_TOKENS;
  if (requestedTokens < 256) return 256;
  return Math.floor(requestedTokens);
}

export function estimateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.length / 3.5);
}

export function formatModelSize(sizeBytes: number): string {
  if (sizeBytes <= 0) return 'Not imported';
  const mb = sizeBytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

export function buildBengaliChatPrompt(
  userQuery: string,
  recentHistory: AIChatMessage[] = []
): string {
  const maxPromptTokens = MAX_CONTEXT_TOKENS - RESERVED_RESPONSE_TOKENS;
  const header = `<|im_start|>system\n${BASE_BENGALI_SYSTEM_PROMPT}\n<|im_end|>\n`;
  let usedTokens =
    estimateTokenCount(header) + estimateTokenCount(userQuery) + 32;

  const chosen: AIChatMessage[] = [];
  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const msg = recentHistory[i];
    const cost = estimateTokenCount(msg.text) + 12;
    if (usedTokens + cost > maxPromptTokens) break;
    chosen.unshift(msg);
    usedTokens += cost;
  }

  const parts = [header];
  for (const msg of chosen) {
    parts.push(`<|im_start|>${msg.role}\n${msg.text.trim()}\n<|im_end|>\n`);
  }
  parts.push(`<|im_start|>user\n${userQuery.trim()}\n<|im_end|>\n<|im_start|>assistant\n`);
  return parts.join('');
}

export function registerGgufModel(
  state: AIModelManagerState,
  input: { fileNameOrPath: string; sizeBytes: number; nowMs?: number }
): { state: AIModelManagerState; imported: AIModelEntry } {
  const raw = input.fileNameOrPath.trim();
  if (!raw.toLowerCase().endsWith('.gguf')) {
    throw new Error('Only 4-bit quantized .gguf model files are supported.');
  }
  const now = input.nowMs ?? Date.now();
  const baseName = raw.split('/').pop()?.split('\\').pop() || raw;
  const fullPath = raw.includes('/') || raw.includes('\\')
    ? raw
    : `/storage/emulated/0/Download/${baseName}`;

  const imported: AIModelEntry = {
    id: `gguf_${now}`,
    name: baseName,
    path: fullPath,
    sizeBytes: input.sizeBytes > 0 ? input.sizeBytes : 780 * 1024 * 1024,
    quantization: 'Q4_K_M (4-bit)',
  };

  const remaining = state.models.filter((m) => m.path !== fullPath);
  return {
    imported,
    state: {
      models: [imported, ...remaining],
      selectedModelPath: fullPath,
      isLoaded: true,
    },
  };
}

export function swapSelectedModel(
  state: AIModelManagerState,
  modelPath: string
): AIModelManagerState {
  const exists = state.models.some((m) => m.path === modelPath);
  if (!exists) return state;
  return {
    ...state,
    selectedModelPath: modelPath,
    isLoaded: true,
  };
}

export function unloadActiveModel(state: AIModelManagerState): AIModelManagerState {
  return {
    ...state,
    isLoaded: false,
  };
}

export function generateMockBengaliReply(
  query: string,
  modelName: string,
  notes: NotePreviewItem[]
): string {
  const lower = query.toLowerCase();
  if (
    lower.includes('note') ||
    lower.includes('summary') ||
    lower.includes('নোট') ||
    lower.includes('সারাংশ')
  ) {
    const topTitles = notes
      .slice(0, 3)
      .map((n) => `• ${n.title} (${n.notebookName})`)
      .join('\n');
    return `আপনার সাম্প্রতিক নোটগুলোর সংক্ষিপ্ত তালিকা (${modelName} অফলাইন):\n${topTitles}\n\nআরও বিস্তারিত চাইলে নোটের নাম লিখুন।`;
  }

  if (lower.includes('list') || lower.includes('plan') || lower.includes('তালিকা')) {
    return `অবশ্যই! ${modelName} থেকে সংক্ষিপ্ত বাংলা পরামর্শ:\n• কাজের অগ্রাধিকার অনুযায়ী নোট সাজান\n• গুরুত্বপূর্ণ তথ্য অফলাইন SQLite-এ সংরক্ষণ করুন`;
  }

  return `হ্যালো! আমি NoteGenie AI (${modelName})। আপনার প্রশ্ন "${query.trim()}" বুঝেছি—ইন্টারনেট ছাড়াই ২,০৪৮ টোকেন সীমার মধ্যে বাংলায় সাহায্য করতে আমি প্রস্তুত।`;
}
