import React, { useState } from 'react';
import { Check, Copy, FileCode2, FolderTree, Layers, Package } from 'lucide-react';
import {
  FLUTTER_FOLDER_TREE,
  FLUTTER_UI_FILES,
  PUBSPEC_YAML,
} from '../data/flutterFiles';
import { PHASE_ROADMAP } from '../data/phase1Data';

export type CodeStudioTab = 'structure' | 'pubspec' | 'dart' | 'roadmap';

interface FlutterCodeExplorerProps {
  activeTab: CodeStudioTab;
  onTabChange: (tab: CodeStudioTab) => void;
}

export function FlutterCodeExplorer({
  activeTab,
  onTabChange,
}: FlutterCodeExplorerProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedFile = FLUTTER_UI_FILES[selectedFileIndex] ?? FLUTTER_UI_FILES[0];

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <section
      aria-label="Phase 4 Flutter Deliverables"
      className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:h-[740px]"
    >
      {/* Header & Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Phase 4 Flutter Deliverables
          </h2>
          <p className="text-xs text-slate-500">
            llama.cpp Isolate · 4-bit GGUF Model Manager · Bengali Chat · Batch Export
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Flutter deliverable views"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'structure'}
            onClick={() => onTabChange('structure')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'structure'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Folder Structure</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pubspec'}
            onClick={() => onTabChange('pubspec')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'pubspec'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            <span>pubspec.yaml</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dart'}
            onClick={() => onTabChange('dart')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'dart'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Flutter Source</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'roadmap'}
            onClick={() => onTabChange('roadmap')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'roadmap'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>6-Phase Plan</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'structure' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                Phase 4 adds <code className="font-mono text-xs text-slate-900">services/ai/</code> (<code className="font-mono text-xs text-slate-900">LlamaCppAIService</code> Isolate, <code className="font-mono text-xs text-slate-900">AIModelManager</code>, <code className="font-mono text-xs text-slate-900">MockAIService</code>), <code className="font-mono text-xs text-slate-900">ai_chat_screen.dart</code>, <code className="font-mono text-xs text-slate-900">settings_screen.dart</code>, <code className="font-mono text-xs text-slate-900">batch_export_service.dart</code>, and <code className="font-mono text-xs text-slate-900">sync_status_indicator.dart</code>.
              </p>
              <button
                type="button"
                onClick={() => handleCopy('tree', FLUTTER_FOLDER_TREE)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copiedKey === 'tree' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#00C853]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Tree</span>
                  </>
                )}
              </button>
            </div>

            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
              <code>{FLUTTER_FOLDER_TREE}</code>
            </pre>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3.5">
                <h3 className="text-sm font-semibold text-slate-900">Local AI Memory Guardrails</h3>
                <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-900">Context Cap</span>
                    <span>2048 tokens (clamped via AIEngineConfig)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-900">Quantization</span>
                    <span>4-bit GGUF + useMemorymap (mmap)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-900">Thread Isolation</span>
                    <span>Persistent Dart Isolate SendPort loop</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Batch Export &amp; Sync Lifecycle
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                  <li>· <code className="font-mono text-slate-800">BatchExportService</code> encodes bulk PDF/DOCX notes in <code className="font-mono text-slate-800">compute()</code> Isolates.</li>
                  <li>· <code className="font-mono text-slate-800">SyncStatusIndicator</code> tracks <code className="font-mono text-slate-800">Pending</code> → <code className="font-mono text-slate-800">Saving</code> → <code className="font-mono text-slate-800">Synced</code>.</li>
                  <li>· <code className="font-mono text-slate-800">unloadModel()</code> frees native llama.cpp RAM on demand.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pubspec' && (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                Complete dependency manifest in <code className="font-mono text-xs text-slate-900">flutter_app/pubspec.yaml</code> covering UI, SQLite, Export, llama.cpp FFI, ML Kit OCR, and Vosk Bengali STT.
              </p>
              <button
                type="button"
                onClick={() => handleCopy('pubspec', PUBSPEC_YAML)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copiedKey === 'pubspec' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#00C853]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy YAML</span>
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
              <code>{PUBSPEC_YAML}</code>
            </pre>
          </div>
        )}

        {activeTab === 'dart' && (
          <div className="flex h-full flex-col gap-3 md:flex-row">
            {/* File list sidebar */}
            <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-1 md:w-60 md:flex-col md:overflow-y-auto md:pb-0">
              {FLUTTER_UI_FILES.map((file, idx) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`shrink-0 truncate rounded-lg border px-2.5 py-2 text-left font-mono text-xs transition-colors ${
                    selectedFileIndex === idx
                      ? 'border-[#6B4EFF] bg-[#F3F0FF] font-medium text-[#6B4EFF]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {file.label}
                </button>
              ))}
            </div>

            {/* Code display */}
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3.5 py-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-medium text-slate-900">
                    flutter_app/{selectedFile.path}
                  </p>
                  <p className="truncate text-xs text-slate-500">{selectedFile.phaseNote}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedFile.path, selectedFile.content)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {copiedKey === selectedFile.path ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#00C853]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy File</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {PHASE_ROADMAP.map((item) => (
              <div
                key={item.phase}
                className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Phase {item.phase}. {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">{item.summary}</p>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    item.status === 'completed' ? 'text-[#6B4EFF]' : 'text-slate-400'
                  }`}
                >
                  {item.status === 'completed' ? 'Ready for review' : 'Awaiting approval'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
