import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  FolderOpen,
  PowerOff,
  RefreshCw,
} from 'lucide-react';
import {
  formatModelSize,
  MAX_CONTEXT_TOKENS,
  type AIModelEntry,
  type AIModelManagerState,
} from '../utils/phase4AiStore';

interface AISettingsModalProps {
  modelState: AIModelManagerState;
  onImportGguf: (fileNameOrPath: string, sizeBytes: number) => void;
  onSwapModel: (modelPath: string) => void;
  onUnloadModel: () => void;
  onClose: () => void;
}

export function AISettingsModal({
  modelState,
  onImportGguf,
  onSwapModel,
  onUnloadModel,
  onClose,
}: AISettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const selectedModel: AIModelEntry | undefined =
    modelState.models.find((m) => m.path === modelState.selectedModelPath) ??
    modelState.models[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorText(null);
    try {
      onImportGguf(file.name, file.size);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Invalid GGUF model');
    }
    e.target.value = '';
  };

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-white"
      data-testid="ai-settings-screen"
    >
      {/* Top AppBar */}
      <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#F0F0F4] px-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back from AI settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#1A1A24] hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-[16px] font-semibold text-[#1A1A24]">
            Local AI &amp; Settings
          </h2>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3.5">
        {/* Active Loaded Model Summary */}
        <div className="rounded-2xl border border-[#DCD3FF] bg-[#F3F0FF]/70 p-3.5">
          <div className="flex items-center gap-2">
            <Cpu
              className={`h-4 w-4 ${
                modelState.isLoaded ? 'text-[#00A844]' : 'text-[#6B4EFF]'
              }`}
              aria-hidden="true"
            />
            <span
              data-testid="ai-model-ram-status"
              className={`text-[12px] font-semibold ${
                modelState.isLoaded ? 'text-[#00A844]' : 'text-[#6B4EFF]'
              }`}
            >
              {modelState.isLoaded ? 'Model Loaded in RAM' : 'Model Unloaded (RAM Free)'}
            </span>
          </div>

          <h3
            data-testid="active-gguf-name"
            className="mt-2 truncate text-[15px] font-bold text-[#1A1A24]"
          >
            {selectedModel?.name ?? 'No GGUF model selected'}
          </h3>
          <p className="mt-0.5 text-[12px] text-[#5F6368]">
            Size: {selectedModel ? formatModelSize(selectedModel.sizeBytes) : '--'} ·{' '}
            {selectedModel?.quantization ?? '4-bit'} · Max {MAX_CONTEXT_TOKENS} tokens
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".gguf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#6B4EFF] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[#5B3EE8]"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              <span>Import .gguf</span>
            </button>
            <button
              type="button"
              disabled={!modelState.isLoaded}
              onClick={onUnloadModel}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E6E6EC] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1A1A24] hover:bg-slate-50 disabled:opacity-45"
            >
              <PowerOff className="h-4 w-4" aria-hidden="true" />
              <span>Unload</span>
            </button>
          </div>
        </div>

        {errorText && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {errorText}
          </div>
        )}

        {/* Swap Available Models */}
        <div>
          <h3 className="text-[13px] font-semibold text-[#1A1A24]">
            Available Offline Models
          </h3>
          <p className="mt-0.5 text-[11.5px] text-[#8C8F99]">
            Select a 4-bit quantized .gguf model. Choice persists across restarts.
          </p>

          <div className="mt-2.5 space-y-2">
            {modelState.models.map((model) => {
              const isSelected = model.path === modelState.selectedModelPath;
              return (
                <button
                  key={model.path}
                  type="button"
                  onClick={() => {
                    setErrorText(null);
                    onSwapModel(model.path);
                  }}
                  aria-label={`Select model ${model.name}`}
                  className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border-[#6B4EFF] bg-[#F3F0FF]/40'
                      : 'border-[#E6E6EC] bg-white hover:bg-[#F6F6F9]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-[13.5px] font-semibold text-[#1A1A24]">
                      {model.name}
                    </p>
                    <p className="text-[11.5px] text-[#5F6368]">
                      {formatModelSize(model.sizeBytes)} · {model.quantization}
                    </p>
                  </div>
                  {isSelected ? (
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${
                        modelState.isLoaded ? 'text-[#00C853]' : 'text-[#6B4EFF]'
                      }`}
                      aria-hidden="true"
                    />
                  ) : (
                    <RefreshCw
                      className="h-4 w-4 shrink-0 text-[#8C8F99]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3GB RAM Guardrails */}
        <div className="rounded-xl border border-[#E6E6EC] bg-[#F6F6F9] p-3">
          <p className="text-[12px] font-semibold text-[#1A1A24]">
            3GB RAM Guardrails
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-[#5F6368]">
            <li>· 4-bit GGUF weights loaded via memory-mapped mmap</li>
            <li>· Context window hard-capped at 2048 tokens</li>
            <li>· Inference isolated on a background Dart worker thread</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
