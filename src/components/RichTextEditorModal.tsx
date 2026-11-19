import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  CheckCircle2,
  CheckSquare,
  Clock3,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Share2,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import type { NoteCardTint, NotePreviewItem, NotebookEntry } from '../data/phase1Data';
import {
  generateExportArtifact,
  type WebExportFormat,
} from '../utils/exportGenerators';
import {
  deserializeQuillDelta,
  serializeQuillDelta,
  type RichBlock,
  type RichBlockType,
} from '../utils/phase2Store';

interface RichTextEditorModalProps {
  note: NotePreviewItem | null;
  notebooks: NotebookEntry[];
  initialNotebookId?: string;
  onSave: (payload: {
    id?: string;
    notebookId: string;
    title: string;
    blocks: RichBlock[];
    tint: NoteCardTint;
  }) => string;
  onDelete?: (noteId: string) => void;
  onClose: () => void;
}

type NoteSyncStatus = 'synced' | 'pending' | 'saving';

const EXPORT_OPTIONS: Array<{
  format: WebExportFormat;
  label: string;
  subtitle: string;
  accentClass: string;
  icon: 'pdf' | 'docx' | 'txt' | 'xlsx';
}> = [
  {
    format: 'pdf',
    label: 'Export as PDF',
    subtitle: 'Formatted headings, lists & bold spans (.pdf)',
    accentClass: 'bg-red-50 text-red-600',
    icon: 'pdf',
  },
  {
    format: 'docx',
    label: 'Export as DOCX',
    subtitle: 'Word OpenXML document (.docx)',
    accentClass: 'bg-[#EEF4FF] text-[#2979FF]',
    icon: 'docx',
  },
  {
    format: 'txt',
    label: 'Export as TXT',
    subtitle: 'Lightweight plain text (.txt)',
    accentClass: 'bg-[#F3F0FF] text-[#6B4EFF]',
    icon: 'txt',
  },
  {
    format: 'xlsx',
    label: 'Export as Excel',
    subtitle: 'Table/paragraph rows (.xlsx)',
    accentClass: 'bg-[#E6F9ED] text-[#00C853]',
    icon: 'xlsx',
  },
];

export function RichTextEditorModal({
  note,
  notebooks,
  initialNotebookId,
  onSave,
  onDelete,
  onClose,
}: RichTextEditorModalProps) {
  const defaultNbId =
    note?.notebookId ??
    initialNotebookId ??
    notebooks.find((n) => n.isDefault)?.id ??
    notebooks[0]?.id ??
    'nb1';

  const [activeNoteId, setActiveNoteId] = useState<string | undefined>(note?.id);
  const [notebookId, setNotebookId] = useState<string>(defaultNbId);
  const [title, setTitle] = useState<string>(note?.title ?? '');
  const [tint, setTint] = useState<NoteCardTint>(note?.tint ?? 'none');
  const [blocks, setBlocks] = useState<RichBlock[]>(() =>
    note?.contentDeltaJson
      ? deserializeQuillDelta(note.contentDeltaJson)
      : [{ id: 'blk_0', type: 'paragraph', text: note?.snippet ?? '' }]
  );
  const [focusedBlockId, setFocusedBlockId] = useState<string>(blocks[0]?.id ?? 'blk_0');
  const [syncStatus, setSyncStatus] = useState<NoteSyncStatus>('synced');

  // Phase 3 UI States: Export Bottom Sheet & Delete Confirmation Dialog
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<WebExportFormat | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isFirstRender = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusedBlock =
    blocks.find((b) => b.id === focusedBlockId) ?? blocks[0];

  const performSave = (silent: boolean) => {
    const hasContent =
      title.trim().length > 0 || blocks.some((b) => b.text.trim().length > 0);
    if (silent && !activeNoteId && !hasContent) {
      return;
    }

    setSyncStatus('saving');
    const savedId = onSave({
      id: activeNoteId,
      notebookId,
      title,
      blocks,
      tint,
    });
    setActiveNoteId(savedId);
    setSyncStatus('synced');
  };

  // 2-second debounced autosave matching Flutter NoteEditorScreen Timer(Duration(seconds: 2))
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSyncStatus('pending');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      performSave(true);
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, blocks, notebookId, tint]);

  const handleBack = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    if (syncStatus === 'pending') {
      performSave(true);
    }
    onClose();
  };

  const handleManualSave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    performSave(false);
    onClose();
  };

  const handleExport = (format: WebExportFormat) => {
    if (exportingFormat) return;
    setExportingFormat(format);
    setExportNotice(null);

    const deltaJson = serializeQuillDelta(blocks);
    const noteTitle = title.trim() || 'Untitled Note';

    setTimeout(() => {
      try {
        const artifact = generateExportArtifact(format, noteTitle, deltaJson);
        const buffer = new ArrayBuffer(artifact.bytes.byteLength);
        new Uint8Array(buffer).set(artifact.bytes);
        const blob = new Blob([buffer], { type: artifact.mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = artifact.filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setExportNotice(`Generated ${artifact.filename} & cleared temp buffer`);
        setExportSheetOpen(false);
      } finally {
        setExportingFormat(null);
      }
    }, 220);
  };

  const updateBlock = (id: string, patch: Partial<RichBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const toggleInlineFormat = (key: 'bold' | 'italic' | 'underline') => {
    if (!focusedBlock) return;
    updateBlock(focusedBlock.id, { [key]: !focusedBlock[key] });
  };

  const toggleBlockType = (targetType: RichBlockType) => {
    if (!focusedBlock) return;
    const nextType: RichBlockType =
      focusedBlock.type === targetType ? 'paragraph' : targetType;
    updateBlock(focusedBlock.id, {
      type: nextType,
      checked: nextType === 'checklist' ? focusedBlock.checked ?? false : undefined,
    });
  };

  const addBlockAfter = (afterId: string, inheritType?: RichBlockType) => {
    const newId = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newType: RichBlockType =
      inheritType === 'bullet' ||
      inheritType === 'ordered' ||
      inheritType === 'checklist'
        ? inheritType
        : 'paragraph';

    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === afterId);
      const nextBlock: RichBlock = {
        id: newId,
        type: newType,
        text: '',
        checked: newType === 'checklist' ? false : undefined,
      };
      if (idx === -1) return [...prev, nextBlock];
      const copy = [...prev];
      copy.splice(idx + 1, 0, nextBlock);
      return copy;
    });
    setFocusedBlockId(newId);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((b) => b.id === id);
      const filtered = prev.filter((b) => b.id !== id);
      const fallback = filtered[Math.max(0, idx - 1)];
      if (fallback) setFocusedBlockId(fallback.id);
      return filtered;
    });
  };

  let orderedCounter = 0;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-white"
      data-testid="rich-text-editor-screen"
    >
      {/* Top AppBar */}
      <header className="flex h-[54px] shrink-0 items-center justify-between border-b border-[#F0F0F4] px-2">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to notes"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1A1A24] hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <label htmlFor="editor-notebook-select" className="sr-only">
            Target notebook
          </label>
          <select
            id="editor-notebook-select"
            value={notebookId}
            onChange={(e) => setNotebookId(e.target.value)}
            className="max-w-[116px] truncate rounded-lg bg-[#F6F6F9] px-2 py-1.5 text-[12px] font-medium text-[#1A1A24] focus:outline-2 focus:outline-[#6B4EFF]"
          >
            {notebooks.map((nb) => (
              <option key={nb.id} value={nb.id}>
                {nb.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Visual SQLite Sync-Status Indicator: Pending -> Saving -> Synced */}
          <span
            data-testid="editor-save-status"
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
              syncStatus === 'synced'
                ? 'bg-[#E6F9ED] text-[#00A844]'
                : syncStatus === 'saving'
                ? 'bg-[#EEEAFF] text-[#6B4EFF]'
                : 'bg-[#FFF8CC] text-[#9E7B00]'
            }`}
          >
            {syncStatus === 'synced' && (
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            )}
            {syncStatus === 'saving' && (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            )}
            {syncStatus === 'pending' && (
              <Clock3 className="h-3 w-3" aria-hidden="true" />
            )}
            <span>
              {syncStatus === 'synced'
                ? 'Synced'
                : syncStatus === 'saving'
                ? 'Saving'
                : 'Pending'}
            </span>
          </span>

          <button
            type="button"
            onClick={() => setExportSheetOpen(true)}
            aria-label="Export note"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B4EFF] hover:bg-[#EEEAFF]"
          >
            <Share2 className="h-4 w-4" />
          </button>

          {activeNoteId && onDelete && (
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              aria-label="Delete note"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#5F6368] hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleManualSave}
            className="min-h-[34px] rounded-lg bg-[#6B4EFF] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#5B3EE8]"
          >
            Save
          </button>
        </div>
      </header>

      {/* Export Success Confirmation Bar */}
      {exportNotice && (
        <div
          role="status"
          data-testid="export-confirmation-banner"
          className="flex items-center justify-between border-b border-[#C2EED2] bg-[#E6F9ED] px-3.5 py-2 text-[12px] font-medium text-[#008C3A]"
        >
          <span className="truncate">{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            aria-label="Dismiss export message"
            className="ml-2 shrink-0 text-[#008C3A] hover:opacity-75"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Card Tint Picker */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#8C8F99]">Card Tint:</span>
          {(['none', 'yellow', 'green', 'purple'] as const).map((t) => {
            const swatchMap: Record<NoteCardTint, string> = {
              none: 'bg-white border-slate-300',
              yellow: 'bg-[#FFF8CC] border-[#E6D159]',
              green: 'bg-[#E6F9ED] border-[#00C853]',
              purple: 'bg-[#F3F0FF] border-[#6B4EFF]',
            };
            const labelMap: Record<NoteCardTint, string> = {
              none: 'White tint',
              yellow: 'Yellow tint',
              green: 'Green tint',
              purple: 'Purple tint',
            };
            return (
              <button
                key={t}
                type="button"
                aria-label={labelMap[t]}
                onClick={() => setTint(t)}
                className={`h-5 w-5 rounded-full border transition-transform ${swatchMap[t]} ${
                  tint === t ? 'ring-2 ring-[#6B4EFF] ring-offset-1 scale-110' : ''
                }`}
              />
            );
          })}
        </div>

        {/* Title */}
        <label htmlFor="editor-note-title" className="sr-only">
          Note title
        </label>
        <input
          id="editor-note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full border-b border-[#F0F0F4] pb-2 font-display text-[19px] font-bold text-[#1A1A24] placeholder:text-[#8C8F99] focus:border-[#6B4EFF] focus:outline-none"
        />

        {/* Rich Text Blocks */}
        <div className="mt-3 space-y-1.5">
          {blocks.map((block, index) => {
            if (block.type === 'ordered') {
              orderedCounter += 1;
            } else {
              orderedCounter = 0;
            }

            const textStyleClasses = [
              block.type === 'h1'
                ? 'text-[18px] font-bold text-[#1A1A24]'
                : block.type === 'h2'
                ? 'text-[15.5px] font-semibold text-[#1A1A24]'
                : 'text-[13.5px] text-[#1A1A24]',
              block.bold ? 'font-bold' : '',
              block.italic ? 'italic' : '',
              block.underline ? 'underline' : '',
              block.type === 'checklist' && block.checked
                ? 'line-through text-[#8C8F99]'
                : '',
            ].join(' ');

            return (
              <div
                key={block.id}
                className="flex items-start gap-2 rounded-lg px-1 py-0.5 focus-within:bg-[#F6F6F9]/70"
              >
                {block.type === 'bullet' && (
                  <span className="mt-1.5 text-sm font-bold text-[#6B4EFF]" aria-hidden="true">
                    •
                  </span>
                )}
                {block.type === 'ordered' && (
                  <span className="mt-1 tabular-nums text-[12.5px] font-semibold text-[#6B4EFF]">
                    {orderedCounter}.
                  </span>
                )}
                {block.type === 'checklist' && (
                  <input
                    type="checkbox"
                    checked={Boolean(block.checked)}
                    onChange={(e) =>
                      updateBlock(block.id, { checked: e.target.checked })
                    }
                    aria-label={`Checklist item ${index + 1}`}
                    className="mt-1.5 h-4 w-4 rounded border-slate-300 accent-[#6B4EFF]"
                  />
                )}

                <input
                  type="text"
                  value={block.text}
                  onFocus={() => setFocusedBlockId(block.id)}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addBlockAfter(block.id, block.type);
                    } else if (
                      e.key === 'Backspace' &&
                      block.text === '' &&
                      blocks.length > 1
                    ) {
                      e.preventDefault();
                      removeBlock(block.id);
                    }
                  }}
                  placeholder={index === 0 ? 'Start writing offline notes...' : 'Continue writing...'}
                  aria-label={`Note content line ${index + 1}`}
                  className={`w-full bg-transparent py-1 focus:outline-none ${textStyleClasses}`}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => addBlockAfter(blocks[blocks.length - 1].id)}
          className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#6B4EFF] hover:bg-[#EEEAFF]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Add line</span>
        </button>
      </div>

      {/* Bottom Rich Formatting Toolbar */}
      <div
        className="flex h-[50px] shrink-0 items-center gap-1 overflow-x-auto border-t border-[#F0F0F4] bg-white px-2"
        role="toolbar"
        aria-label="Rich text formatting"
      >
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={Boolean(focusedBlock?.bold)}
          onClick={() => toggleInlineFormat('bold')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            focusedBlock?.bold
              ? 'bg-[#EEEAFF] text-[#6B4EFF]'
              : 'text-[#1A1A24] hover:bg-slate-100'
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={Boolean(focusedBlock?.italic)}
          onClick={() => toggleInlineFormat('italic')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            focusedBlock?.italic
              ? 'bg-[#EEEAFF] text-[#6B4EFF]'
              : 'text-[#1A1A24] hover:bg-slate-100'
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Underline"
          aria-pressed={Boolean(focusedBlock?.underline)}
          onClick={() => toggleInlineFormat('underline')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            focusedBlock?.underline
              ? 'bg-[#EEEAFF] text-[#6B4EFF]'
              : 'text-[#1A1A24] hover:bg-slate-100'
          }`}
        >
          <Underline className="h-4 w-4" />
        </button>

        <span className="mx-1 h-5 w-[1px] shrink-0 bg-[#E6E6EC]" aria-hidden="true" />

        <button
          type="button"
          aria-label="Heading 1"
          aria-pressed={focusedBlock?.type === 'h1'}
          onClick={() => toggleBlockType('h1')}
          className={`flex h-9 shrink-0 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-colors ${
            focusedBlock?.type === 'h1'
              ? 'bg-[#EEEAFF] text-[#6B4EFF]'
              : 'text-[#1A1A24] hover:bg-slate-100'
          }`}
        >
          H1
        </button>
        <button
          type="button"
          aria-label="Heading 2"
          aria-pressed={focusedBlock?.type === 'h2'}
          onClick={() => toggleBlockType('h2')}
          className={`flex h-9 shrink-0 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-colors ${
            focusedBlock?.type === 'h2'
              ? 'bg-[#EEEAFF] text-[#6B4EFF]'
              : 'text-[#1A1A24] hover:bg-slate-100'
          }`}
        >
          H2
        </button>

        <span className="mx-1 h-5 w-[1px] shrink-0 bg-[#E6E6EC]" aria-hidden="true" />

        <button
          type="button"
          aria-label="Bullet list"
          aria-pressed={focusedBlock?.type === 'bullet'}
          onClick={() => toggleBlockType('bullet')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            focusedBlock?.type === 'bullet'
              ? 'bg-[#EEEAFF] text-[#6B4EFF]'
              : 'text-[#1A1A24] hover:bg-slate-100'
          }`}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          aria-pressed={focusedBlock?.type === 'ordered'}
          onClick={() => toggleBlockType('ordered')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            focusedBlock?.type === 'ordered'
              ? 'bg-[#EEEAFF] text-[#6B4EFF]'
              : 'text-[#1A1A24] hover:bg-slate-100'
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Checklist"
          aria-pressed={Boolean(focusedBlock?.type === 'checklist')}
          onClick={() => toggleBlockType('checklist')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            focusedBlock?.type === 'checklist'
              ? 'bg-[#EEEAFF] text-[#6B4EFF]'
              : 'text-[#1A1A24] hover:bg-slate-100'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
        </button>
      </div>

      {/* Phase 3: Export ModalBottomSheet */}
      {exportSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Export Note"
          className="absolute inset-0 z-30 flex items-end bg-black/35 p-3 backdrop-blur-[1px]"
          onClick={() => {
            if (!exportingFormat) setExportSheetOpen(false);
          }}
        >
          <div
            className="w-full rounded-2xl border border-[#E6E6EC] bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1A1A24]">
                  Export &amp; Share Note
                </h3>
                <p className="text-[11.5px] text-[#8C8F99]">
                  Generated offline in a background worker &amp; cleaned after share
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(exportingFormat)}
                onClick={() => setExportSheetOpen(false)}
                aria-label="Close export options"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#5F6368] hover:bg-slate-100 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 divide-y divide-[#F0F0F4]">
              {EXPORT_OPTIONS.map((opt) => {
                const isBusy = exportingFormat === opt.format;
                return (
                  <button
                    key={opt.format}
                    type="button"
                    disabled={Boolean(exportingFormat)}
                    onClick={() => handleExport(opt.format)}
                    className="flex min-h-[52px] w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-[#F6F6F9] disabled:opacity-60"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${opt.accentClass}`}
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : opt.icon === 'pdf' ? (
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      ) : opt.icon === 'docx' ? (
                        <FileType className="h-4 w-4" aria-hidden="true" />
                      ) : opt.icon === 'xlsx' ? (
                        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <FileCode2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-[#1A1A24]">
                        {opt.label}
                      </span>
                      <span className="block truncate text-[11.5px] text-[#8C8F99]">
                        {opt.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Phase 3 Addendum: Delete Note Confirmation Dialog */}
      {deleteDialogOpen && activeNoteId && onDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete note confirmation"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
          onClick={() => setDeleteDialogOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[300px] rounded-2xl border border-[#E6E6EC] bg-white p-4 shadow-lg"
          >
            <h3 className="text-[15px] font-semibold text-[#1A1A24]">Delete note?</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5F6368]">
              This note will be permanently removed from your offline SQLite database.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#5F6368] hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  onDelete(activeNoteId);
                  onClose();
                }}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
