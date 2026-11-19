import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Send,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type { NotePreviewItem } from '../data/phase1Data';
import {
  BASE_BENGALI_SYSTEM_PROMPT,
  buildBengaliChatPrompt,
  generateMockBengaliReply,
  MAX_CONTEXT_TOKENS,
  type AIChatMessage,
  type AIModelManagerState,
} from '../utils/phase4AiStore';

interface AIChatModalProps {
  modelState: AIModelManagerState;
  notes: NotePreviewItem[];
  onEnsureLoaded: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

const WELCOME_MESSAGE: AIChatMessage = {
  id: 'welcome_bn',
  role: 'assistant',
  text: 'স্বাগতম! আমি NoteGenie AI (অফলাইন সহকারী)। আপনি বাংলায় বা ইংরেজিতে প্রশ্ন করতে পারেন—আমি বাংলায় সংক্ষিপ্ত উত্তর দেব।',
  timestampMs: 1753100000000,
};

export function AIChatModal({
  modelState,
  notes,
  onEnsureLoaded,
  onOpenSettings,
  onClose,
}: AIChatModalProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);

  const historyRef = useRef<HTMLDivElement | null>(null);

  const activeModel =
    modelState.models.find((m) => m.path === modelState.selectedModelPath) ??
    modelState.models[0];

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    if (!modelState.isLoaded) {
      onEnsureLoaded();
    }

    const userMessage: AIChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestampMs: Date.now(),
    };

    const historySnapshot = [...messages];
    // Verify prompt remains under 2048-token budget with hidden Bengali system prompt
    buildBengaliChatPrompt(trimmed, historySnapshot);

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const replyText = generateMockBengaliReply(
        trimmed,
        activeModel?.name ?? 'Qwen-1.5B-Instruct (4-bit)',
        notes
      );
      const assistantMessage: AIChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestampMs: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsThinking(false);
    }, 340);
  };

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-white"
      data-testid="ai-chat-screen"
    >
      {/* Top AppBar */}
      <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#F0F0F4] px-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back from AI Chat"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1A1A24] hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="truncate font-display text-[15px] font-semibold text-[#1A1A24]">
              NoteGenie AI Chat
            </h2>
            <p
              className={`truncate text-[11px] font-medium ${
                modelState.isLoaded ? 'text-[#00A844]' : 'text-[#8C8F99]'
              }`}
            >
              {activeModel?.name ?? 'Local GGUF'} ·{' '}
              {modelState.isLoaded ? 'Loaded (2048 ctx)' : 'Auto-loads on send'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShowPromptDetails((prev) => !prev)}
            aria-label="Inspect hidden system prompt"
            aria-expanded={showPromptDetails}
            className={`px-2 py-1 text-[11px] font-medium transition-colors ${
              showPromptDetails ? 'text-[#6B4EFF]' : 'text-[#5F6368] hover:text-[#1A1A24]'
            }`}
          >
            Prompt
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open AI model settings"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#5F6368] hover:bg-slate-100"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMessages([WELCOME_MESSAGE])}
            aria-label="Clear chat history"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#5F6368] hover:bg-slate-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Optional Hidden Bengali System Prompt Inspector */}
      {showPromptDetails && (
        <div
          data-testid="hidden-system-prompt-panel"
          className="border-b border-[#E6E6EC] bg-[#F6F6F9] px-3.5 py-2.5 text-[11.5px] text-[#5F6368]"
        >
          <p className="font-semibold text-[#1A1A24]">
            Hidden Bengali System Prompt · Max {MAX_CONTEXT_TOKENS} tokens
          </p>
          <p className="mt-0.5 leading-relaxed">{BASE_BENGALI_SYSTEM_PROMPT}</p>
        </div>
      )}

      {/* Scrollable Chat History */}
      <div
        ref={historyRef}
        className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3"
        data-testid="ai-chat-history"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  isUser
                    ? 'rounded-br-sm bg-[#6B4EFF] text-white'
                    : 'rounded-bl-sm border border-[#E6E6EC] bg-[#F6F6F9] text-[#1A1A24]'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex justify-start" data-testid="ai-thinking-indicator">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[#C2EED2] bg-[#E6F9ED]/70 px-3.5 py-2 text-[12.5px] font-medium text-[#008C3A]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>AI is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Chat Input Bar */}
      <form
        onSubmit={handleSend}
        className="flex shrink-0 items-center gap-2 border-t border-[#F0F0F4] bg-white px-3 py-2.5"
      >
        <label htmlFor="ai-chat-input" className="sr-only">
          Ask NoteGenie AI in Bengali or English
        </label>
        <input
          id="ai-chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="বাংলায় বা ইংরেজিতে প্রশ্ন লিখুন..."
          className="h-10 flex-1 rounded-full border border-[#E6E6EC] bg-[#F6F6F9] px-4 text-[13px] text-[#1A1A24] placeholder:text-[#8C8F99] focus:border-[#6B4EFF] focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6B4EFF] text-white transition-colors hover:bg-[#5B3EE8] disabled:opacity-45"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
