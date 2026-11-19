import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  FileType,
  Grid2x2,
  List,
  Loader2,
  Mic,
  MoreVertical,
  PenLine,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import {
  CLOSED_NOTEBOOKS,
  OPEN_NOTEBOOKS,
  SEED_NOTES,
  USER_AVATAR_URL,
  type NoteCardTint,
  type NotePreviewItem,
  type NotebookEntry,
} from '../data/phase1Data';
import {
  formatBreadcrumb,
  getVisibleClosedNotebooks,
  splitIntoMasonryColumns,
} from '../utils/noteFilters';
import {
  createNotebookRecord,
  deleteNotebookRecord,
  deleteNoteRecord,
  fetchPaginatedNotes,
  upsertNoteRecord,
  type RichBlock,
} from '../utils/phase2Store';
import {
  generateBatchExportArtifact,
  getRecentNotes,
  searchIndexedNotebooks,
} from '../utils/exportGenerators';
import {
  DEFAULT_GGUF_MODELS,
  registerGgufModel,
  swapSelectedModel,
  unloadActiveModel,
  type AIModelManagerState,
} from '../utils/phase4AiStore';
import { AIChatModal } from './AIChatModal';
import { AISettingsModal } from './AISettingsModal';
import { RichTextEditorModal } from './RichTextEditorModal';

type ActiveTab = 'home' | 'notebooks';

interface PhaseNotice {
  title: string;
  phaseLabel: string;
  description: string;
}

const NOTES_STORAGE_KEY = 'notegenie_phase2_notes_v1';
const NOTEBOOKS_STORAGE_KEY = 'notegenie_phase2_notebooks_v1';
const AI_MODELS_STORAGE_KEY = 'notegenie_phase4_models_v1';
const PAGE_SIZE = 20;

const DEFAULT_AI_STATE: AIModelManagerState = {
  models: DEFAULT_GGUF_MODELS,
  selectedModelPath: DEFAULT_GGUF_MODELS[0].path,
  isLoaded: true,
};

function loadStoredAiState(): AIModelManagerState {
  try {
    const raw = localStorage.getItem(AI_MODELS_STORAGE_KEY);
    if (!raw) return DEFAULT_AI_STATE;
    const parsed = JSON.parse(raw) as AIModelManagerState;
    return Array.isArray(parsed?.models) && parsed.models.length > 0
      ? parsed
      : DEFAULT_AI_STATE;
  } catch {
    return DEFAULT_AI_STATE;
  }
}

function loadStoredNotes(): NotePreviewItem[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return SEED_NOTES;
    const parsed = JSON.parse(raw) as NotePreviewItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_NOTES;
  } catch {
    return SEED_NOTES;
  }
}

function loadStoredNotebooks(): NotebookEntry[] {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
    if (!raw) return OPEN_NOTEBOOKS;
    const parsed = JSON.parse(raw) as NotebookEntry[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : OPEN_NOTEBOOKS;
  } catch {
    return OPEN_NOTEBOOKS;
  }
}

function getCardTintClasses(tint: NoteCardTint): string {
  switch (tint) {
    case 'yellow':
      return 'bg-[#FFF8CC] border-[#F3E59A]';
    case 'green':
      return 'bg-[#E6F9ED] border-[#C2EED2]';
    case 'purple':
      return 'bg-[#F3F0FF] border-[#DCD3FF]';
    case 'none':
    default:
      return 'bg-white border-[#E6E6EC]';
  }
}

function NotebookGlyph({ color }: { color: string }) {
  return (
    <span className="relative inline-flex h-6 w-5 shrink-0 items-center" aria-hidden="true">
      <span
        className="block h-6 w-[18px] rounded-[4px]"
        style={{ backgroundColor: color }}
      />
      <span className="-ml-[1px] flex flex-col gap-[2px]">
        <span className="block h-1 w-[3px] rounded-r-sm opacity-75" style={{ backgroundColor: color }} />
        <span className="block h-1 w-[3px] rounded-r-sm opacity-75" style={{ backgroundColor: color }} />
        <span className="block h-1 w-[3px] rounded-r-sm opacity-75" style={{ backgroundColor: color }} />
      </span>
    </span>
  );
}

function NotePhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="mt-2 flex h-20 w-full items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <FileText className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-lg bg-slate-100">
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-22 w-full object-cover"
      />
    </div>
  );
}

function NoteCard({
  note,
  onSelect,
}: {
  note: NotePreviewItem;
  onSelect: (note: NotePreviewItem) => void;
}) {
  const tintClasses = getCardTintClasses(note.tint);

  return (
    <button
      type="button"
      onClick={() => onSelect(note)}
      aria-label={`Open note ${note.title}`}
      className={`w-full rounded-[14px] border p-3 text-left transition-transform duration-150 hover:border-[#6B4EFF]/50 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B4EFF] ${tintClasses}`}
    >
      {!note.isStickyStyle && (
        <p className="truncate text-[11px] font-normal text-[#8C8F99]">
          {formatBreadcrumb(note)}
        </p>
      )}

      <h3
        className={`${
          !note.isStickyStyle ? 'mt-1' : ''
        } line-clamp-2 text-[14px] font-semibold leading-snug text-[#1A1A24]`}
      >
        {note.title}
      </h3>

      {note.imageUrl && (
        <NotePhoto src={note.imageUrl} alt={note.imageAlt ?? note.title} />
      )}

      {note.snippet && (
        <p className="mt-1.5 whitespace-pre-line line-clamp-4 text-[12.5px] leading-[1.42] text-[#5F6368]">
          {note.snippet}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between pt-0.5">
        {note.isStickyStyle ? (
          <StickyNote
            className="h-4 w-4 shrink-0"
            style={{ color: note.accentColor === '#FFD600' ? '#D4A800' : note.accentColor }}
            aria-hidden="true"
          />
        ) : (
          <FileText
            className="h-4 w-4 shrink-0"
            style={{ color: note.accentColor }}
            aria-hidden="true"
          />
        )}
        <span className="tabular-nums text-[11px] font-normal text-[#8C8F99]">
          {note.dateLabel}
        </span>
      </div>
    </button>
  );
}

export function MobileAppPreview() {
  const [notes, setNotes] = useState<NotePreviewItem[]>(loadStoredNotes);
  const [openNotebooks, setOpenNotebooks] = useState<NotebookEntry[]>(loadStoredNotebooks);
  const [visibleLimit, setVisibleLimit] = useState<number>(PAGE_SIZE);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isGridView, setIsGridView] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTint, setActiveTint] = useState<NoteCardTint | 'all'>('all');
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [notice, setNotice] = useState<PhaseNotice | null>(null);

  // Phase 2 Editor & Create Notebook Modal State
  const [editorState, setEditorState] = useState<{
    open: boolean;
    note: NotePreviewItem | null;
    initialNotebookId?: string;
  }>({ open: false, note: null });

  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState('#6B4EFF');
  const [notebookPendingDelete, setNotebookPendingDelete] =
    useState<NotebookEntry | null>(null);

  // Phase 4 Local AI & More/Batch Export States
  const [aiState, setAiState] = useState<AIModelManagerState>(loadStoredAiState);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [batchExportingFormat, setBatchExportingFormat] = useState<'pdf' | 'docx' | null>(
    null
  );

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // Ignore quota errors in private mode
    }
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(openNotebooks));
    } catch {
      // Ignore quota errors in private mode
    }
  }, [openNotebooks]);

  useEffect(() => {
    try {
      localStorage.setItem(AI_MODELS_STORAGE_KEY, JSON.stringify(aiState));
    } catch {
      // Ignore quota errors in private mode
    }
  }, [aiState]);

  const paginatedResult = useMemo(
    () =>
      fetchPaginatedNotes(notes, {
        limit: visibleLimit,
        offset: 0,
        query: searchQuery,
        tint: activeTint,
      }),
    [notes, visibleLimit, searchQuery, activeTint]
  );

  const [leftCol, rightCol] = useMemo(
    () => splitIntoMasonryColumns(paginatedResult.items),
    [paginatedResult.items]
  );

  const recentNotes = useMemo(() => getRecentNotes(notes, 5), [notes]);

  const filteredOpenNotebooks = useMemo(
    () => searchIndexedNotebooks(openNotebooks, searchQuery),
    [openNotebooks, searchQuery]
  );

  const filteredClosedNotebooks = useMemo(() => {
    const matched = searchIndexedNotebooks(CLOSED_NOTEBOOKS, searchQuery);
    return searchQuery.trim()
      ? matched
      : getVisibleClosedNotebooks(matched, showAllClosed, 5);
  }, [searchQuery, showAllClosed]);

  const openPhaseNotice = (title: string, phaseLabel: string, description: string) => {
    setNotice({ title, phaseLabel, description });
  };

  const handleSaveNote = (payload: {
    id?: string;
    notebookId: string;
    title: string;
    blocks: RichBlock[];
    tint: NoteCardTint;
  }): string => {
    const allNotebooks = [...openNotebooks, ...CLOSED_NOTEBOOKS];
    const targetNb =
      allNotebooks.find((n) => n.id === payload.notebookId) ?? openNotebooks[0];

    const result = upsertNoteRecord(notes, {
      id: payload.id,
      notebookId: targetNb.id,
      notebookName: targetNb.name,
      notebookColor: targetNb.color,
      title: payload.title,
      blocks: payload.blocks,
      tint: payload.tint,
    });
    setNotes(result.notes);
    return result.savedNote.id;
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => deleteNoteRecord(prev, noteId));
  };

  const handleCreateNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim()) return;
    const { notebooks } = createNotebookRecord(openNotebooks, {
      title: newNotebookName,
      color: newNotebookColor,
    });
    setOpenNotebooks(notebooks);
    setNewNotebookName('');
    setNotebookDialogOpen(false);
  };

  const handleConfirmDeleteNotebook = () => {
    if (!notebookPendingDelete) return;
    const result = deleteNotebookRecord(
      openNotebooks,
      notes,
      notebookPendingDelete.id
    );
    setOpenNotebooks(result.notebooks);
    setNotes(result.notes);
    setNotebookPendingDelete(null);
  };

  const handleBatchExport = (format: 'pdf' | 'docx') => {
    if (batchExportingFormat || notes.length === 0) return;
    setBatchExportingFormat(format);

    setTimeout(() => {
      try {
        const artifact = generateBatchExportArtifact(format, notes);
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

        setMoreSheetOpen(false);
        openPhaseNotice(
          'Batch Export Complete',
          'Background Isolate Worker',
          `Exported ${artifact.noteCount} notes to ${artifact.filename} and freed temporary memory.`
        );
      } finally {
        setBatchExportingFormat(null);
      }
    }, 240);
  };

  return (
    <div
      className="relative mx-auto flex h-[calc(100dvh-118px)] min-h-[560px] w-full max-w-[400px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:mx-0 lg:h-[740px]"
      data-testid="mobile-preview-shell"
    >
      {/* Top App Bar */}
      <header className="flex shrink-0 items-center justify-between bg-white px-4 pb-2 pt-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() =>
              openPhaseNotice(
                'Offline Profile',
                'Phase 2 Local SQLite',
                'Notes and notebooks are persisted locally via Drift + sqflite with LIMIT 20 pagination.'
              )
            }
            aria-label="User profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E6E6EC] bg-[#EEEAFF] focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
          >
            {avatarFailed ? (
              <span className="text-xs font-bold text-[#6B4EFF]">NG</span>
            ) : (
              <img
                src={USER_AVATAR_URL}
                alt="User profile avatar"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-full w-full object-cover"
              />
            )}
          </button>
          <span className="truncate font-display text-[19px] font-semibold tracking-tight text-[#1A1A24]">
            NoteGenie AI
          </span>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((prev) => !prev);
              if (searchOpen) setSearchQuery('');
            }}
            aria-label={searchOpen ? 'Close search' : 'Search notes'}
            aria-expanded={searchOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#1A1A24] transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => setAiSettingsOpen(true)}
            aria-label="Open settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#1A1A24] transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Expandable Search Input */}
      {searchOpen && (
        <div className="border-b border-[#F0F0F4] bg-white px-4 pb-3 pt-1">
          <label htmlFor="notegenie-search-input" className="sr-only">
            Search notes
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-[#E6E6EC] bg-[#F6F6F9] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#8C8F99]" aria-hidden="true" />
            <input
              id="notegenie-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search indexed note & notebook titles..."
              className="w-full bg-transparent text-[13.5px] text-[#1A1A24] placeholder:text-[#8C8F99] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="text-xs font-medium text-[#6B4EFF]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pill-shaped Home / Notebooks Toggle + Home View Controls */}
      <div className="flex shrink-0 items-center justify-between bg-white px-4 py-2">
        <div
          role="tablist"
          aria-label="Main sections"
          className="inline-flex items-center rounded-full border border-[#E6E6EC] bg-[#F6F6F9] p-[3px]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
            className={`min-h-[36px] whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#6B4EFF] ${
              activeTab === 'home'
                ? 'bg-[#6B4EFF] text-white'
                : 'text-[#5F6368] hover:text-[#1A1A24]'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notebooks'}
            onClick={() => setActiveTab('notebooks')}
            className={`min-h-[36px] whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#6B4EFF] ${
              activeTab === 'notebooks'
                ? 'bg-[#6B4EFF] text-white'
                : 'text-[#5F6368] hover:text-[#1A1A24]'
            }`}
          >
            Notebooks
          </button>
        </div>

        {activeTab === 'home' && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              aria-label="Filter notes by tint"
              aria-expanded={filterOpen}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#6B4EFF] ${
                activeTint !== 'all' ? 'text-[#6B4EFF]' : 'text-[#5F6368]'
              }`}
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setIsGridView((prev) => !prev)}
              aria-label={isGridView ? 'Switch to list view' : 'Switch to grid view'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#5F6368] transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
            >
              {isGridView ? (
                <List className="h-[19px] w-[19px]" />
              ) : (
                <Grid2x2 className="h-[19px] w-[19px]" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Optional Tint Filter Row */}
      {activeTab === 'home' && filterOpen && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-[#F0F0F4] px-4 pb-2.5">
          {(['all', 'none', 'yellow', 'green', 'purple'] as const).map((tint) => {
            const labels: Record<typeof tint, string> = {
              all: 'All',
              none: 'White',
              yellow: 'Yellow',
              green: 'Green',
              purple: 'Purple',
            };
            return (
              <button
                key={tint}
                type="button"
                onClick={() => setActiveTint(tint)}
                className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  activeTint === tint
                    ? 'bg-[#6B4EFF] text-white'
                    : 'bg-[#F6F6F9] text-[#5F6368] hover:text-[#1A1A24]'
                }`}
              >
                {labels[tint]}
              </button>
            );
          })}
        </div>
      )}

      {/* Scrollable Screen Body */}
      <main className="flex-1 overflow-y-auto bg-white">
        {activeTab === 'home' ? (
          paginatedResult.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-[#1A1A24]">No matching notes</p>
              <p className="mt-1 text-xs text-[#8C8F99]">
                Clear your search or tap + Page below to create a new offline note.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTint('all');
                }}
                className="mt-3 rounded-lg bg-[#6B4EFF] px-3.5 py-2 text-xs font-semibold text-white"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="pb-5">
              {/* Phase 3 Addendum: Horizontal Recent Notes Strip */}
              {!searchQuery.trim() && recentNotes.length > 0 && (
                <section
                  aria-label="Recent Notes"
                  data-testid="recent-notes-strip"
                  className="mb-3 pt-0.5"
                >
                  <div className="mb-2 flex items-center justify-between px-4">
                    <h2 className="text-[12.5px] font-semibold text-[#5F6368]">
                      Recent Notes
                    </h2>
                    <span className="text-[11px] text-[#8C8F99]">
                      Last {recentNotes.length} updated
                    </span>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto px-3.5 pb-1">
                    {recentNotes.map((recent) => (
                      <button
                        key={`recent_${recent.id}`}
                        type="button"
                        onClick={() =>
                          setEditorState({ open: true, note: recent })
                        }
                        aria-label={`Open recent note ${recent.title}`}
                        className={`flex w-[156px] shrink-0 flex-col justify-between rounded-[14px] border p-2.5 text-left transition-colors hover:border-[#6B4EFF]/50 ${getCardTintClasses(
                          recent.tint
                        )}`}
                      >
                        <div>
                          <p className="truncate text-[10.5px] text-[#8C8F99]">
                            {recent.notebookName}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-[#1A1A24]">
                            {recent.title}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: recent.accentColor }}
                            aria-hidden="true"
                          />
                          <span className="tabular-nums text-[10.5px] text-[#8C8F99]">
                            {recent.dateLabel}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {isGridView ? (
                <div
                  className="grid grid-cols-2 items-start gap-2.5 px-3.5 pt-1"
                  data-testid="notes-masonry-grid"
                >
                  <div className="flex flex-col gap-2.5">
                    {leftCol.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onSelect={(n) =>
                          setEditorState({ open: true, note: n })
                        }
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {rightCol.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onSelect={(n) =>
                          setEditorState({ open: true, note: n })
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 px-4 pt-1" data-testid="notes-list-view">
                  {paginatedResult.items.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onSelect={(n) =>
                        setEditorState({ open: true, note: n })
                      }
                    />
                  ))}
                </div>
              )}

              {paginatedResult.hasMore && (
                <div className="mt-4 flex justify-center px-4">
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
                    className="rounded-lg border border-[#E6E6EC] bg-[#F6F6F9] px-4 py-2 text-xs font-semibold text-[#6B4EFF] hover:bg-[#EEEAFF]"
                  >
                    Load next 20 notes ({paginatedResult.items.length} of{' '}
                    {paginatedResult.totalCount})
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="pb-6 pt-1" data-testid="notebooks-list-view">
            {filteredOpenNotebooks.length === 0 &&
            filteredClosedNotebooks.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-[#1A1A24]">
                  No matching notebooks
                </p>
                <p className="mt-1 text-xs text-[#8C8F99]">
                  Indexed title search checked open and closed notebooks.
                </p>
              </div>
            ) : (
              <>
                {filteredOpenNotebooks.map((notebook: NotebookEntry) => (
                  <div
                    key={notebook.id}
                    className="flex min-h-[50px] w-full items-center pr-2 transition-colors hover:bg-slate-50"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setEditorState({
                          open: true,
                          note: null,
                          initialNotebookId: notebook.id,
                        })
                      }
                      className="flex min-w-0 flex-1 items-center gap-4 px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
                    >
                      <NotebookGlyph color={notebook.color} />
                      <span className="flex-1 truncate text-[15px] font-normal text-[#1A1A24]">
                        {notebook.name}
                      </span>
                      {notebook.isDefault && (
                        <span className="text-[12.5px] font-normal text-[#8C8F99]">
                          Default
                        </span>
                      )}
                    </button>
                    {!notebook.isDefault && (
                      <button
                        type="button"
                        onClick={() => setNotebookPendingDelete(notebook)}
                        aria-label={`Delete notebook ${notebook.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8C8F99] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                {filteredClosedNotebooks.length > 0 && (
                  <>
                    <div className="px-5 pb-2 pt-5">
                      <h2 className="text-[13px] font-medium text-[#5F6368]">
                        Closed Notebooks
                      </h2>
                    </div>

                    {filteredClosedNotebooks.map((notebook: NotebookEntry) => (
                      <button
                        key={notebook.id}
                        type="button"
                        onClick={() =>
                          openPhaseNotice(
                            notebook.name,
                            'Phase 3 SQLite Archive',
                            'Closed notebook stored locally in SQLite. Tap + Notebook below to add active notebooks.'
                          )
                        }
                        className="flex min-h-[48px] w-full items-center gap-4 px-5 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
                      >
                        <NotebookGlyph color={notebook.color} />
                        <span className="flex-1 truncate text-[15px] font-normal text-[#1A1A24]">
                          {notebook.name}
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {!searchQuery.trim() && CLOSED_NOTEBOOKS.length > 5 && (
                  <div className="pl-[54px] pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAllClosed((prev) => !prev)}
                      className="inline-flex min-h-[44px] items-center gap-1 px-2 text-[14px] font-medium text-[#6B4EFF] hover:underline focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
                    >
                      <span>{showAllClosed ? 'Show less' : 'Show more'}</span>
                      {showAllClosed ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <footer className="flex h-[58px] shrink-0 items-center justify-between border-t border-[#F0F0F4] bg-white px-3">
        {activeTab === 'home' ? (
          <>
            <button
              type="button"
              onClick={() => setEditorState({ open: true, note: null })}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-[15px] font-semibold text-[#1A1A24] transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
            >
              <Plus className="h-5 w-5 text-[#6B4EFF]" aria-hidden="true" />
              <span>Page</span>
            </button>

            <div className="flex items-center">
              <button
                type="button"
                aria-label="Pen drawing tool"
                onClick={() =>
                  openPhaseNotice(
                    'Pen & Ink Canvas',
                    'Upcoming',
                    'Lightweight touch drawing and handwriting canvas.'
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#6B4EFF] transition-colors hover:bg-[#EEEAFF] focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
              >
                <PenLine className="h-[20px] w-[20px]" />
              </button>
              <button
                type="button"
                aria-label="Camera document OCR"
                onClick={() =>
                  openPhaseNotice(
                    'Camera OCR + AI Summary',
                    'Phase 5',
                    'Extracts text via google_mlkit_text_recognition and summarizes in Bengali via llama.cpp.'
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#6B4EFF] transition-colors hover:bg-[#EEEAFF] focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
              >
                <Camera className="h-[20px] w-[20px]" />
              </button>
              <button
                type="button"
                aria-label="Bengali voice input"
                onClick={() =>
                  openPhaseNotice(
                    'Offline Bengali Voice Note',
                    'Phase 5',
                    'Real-time offline speech-to-text powered by vosk_flutter Bengali model.'
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#6B4EFF] transition-colors hover:bg-[#EEEAFF] focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
              >
                <Mic className="h-[20px] w-[20px]" />
              </button>
              <button
                type="button"
                aria-label="More options and Local AI"
                onClick={() => setMoreSheetOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#6B4EFF] transition-colors hover:bg-[#EEEAFF] focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
              >
                <MoreVertical className="h-[20px] w-[20px]" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setNotebookDialogOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-[15px] font-semibold text-[#6B4EFF] transition-colors hover:bg-[#EEEAFF] focus-visible:outline-2 focus-visible:outline-[#6B4EFF]"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span>Notebook</span>
          </button>
        )}
      </footer>

      {/* Rich Text Editor Screen (Phases 2–4) */}
      {editorState.open && (
        <RichTextEditorModal
          note={editorState.note}
          notebooks={openNotebooks}
          initialNotebookId={editorState.initialNotebookId}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onClose={() => setEditorState({ open: false, note: null })}
        />
      )}

      {/* Phase 4: Local Bengali AI Chat Screen */}
      {aiChatOpen && (
        <AIChatModal
          modelState={aiState}
          notes={notes}
          onEnsureLoaded={() =>
            setAiState((prev) => swapSelectedModel(prev, prev.selectedModelPath))
          }
          onOpenSettings={() => {
            setAiChatOpen(false);
            setAiSettingsOpen(true);
          }}
          onClose={() => setAiChatOpen(false)}
        />
      )}

      {/* Phase 4: Local AI Model Manager / Settings Screen */}
      {aiSettingsOpen && (
        <AISettingsModal
          modelState={aiState}
          onImportGguf={(fileNameOrPath, sizeBytes) => {
            const { state: next } = registerGgufModel(aiState, {
              fileNameOrPath,
              sizeBytes,
            });
            setAiState(next);
          }}
          onSwapModel={(path) => setAiState((prev) => swapSelectedModel(prev, path))}
          onUnloadModel={() => setAiState((prev) => unloadActiveModel(prev))}
          onClose={() => setAiSettingsOpen(false)}
        />
      )}

      {/* Phase 4: More Options & Batch Export Sheet */}
      {moreSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More options"
          className="absolute inset-0 z-30 flex items-end bg-black/35 p-3 backdrop-blur-[1px]"
          onClick={() => {
            if (!batchExportingFormat) setMoreSheetOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-2xl border border-[#E6E6EC] bg-white p-4 shadow-lg"
          >
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-[15px] font-semibold text-[#1A1A24]">
                Local AI &amp; Batch Tools
              </h3>
              <button
                type="button"
                disabled={Boolean(batchExportingFormat)}
                onClick={() => setMoreSheetOpen(false)}
                aria-label="Close more options"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#5F6368] hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="divide-y divide-[#F0F0F4]">
              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  setAiChatOpen(true);
                }}
                className="flex min-h-[52px] w-full items-center gap-3 py-2.5 text-left hover:bg-[#F6F6F9]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F0FF] text-[#6B4EFF]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[#1A1A24]">
                    Ask NoteGenie AI (Bengali Chat)
                  </span>
                  <span className="block truncate text-[11.5px] text-[#8C8F99]">
                    Offline llama.cpp 4-bit Isolate · 2048 tokens
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  setAiSettingsOpen(true);
                }}
                className="flex min-h-[52px] w-full items-center gap-3 py-2.5 text-left hover:bg-[#F6F6F9]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6F9ED] text-[#00A844]">
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[#1A1A24]">
                    Local AI Model Manager
                  </span>
                  <span className="block truncate text-[11.5px] text-[#8C8F99]">
                    Import .gguf, swap models &amp; unload RAM
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={Boolean(batchExportingFormat)}
                onClick={() => handleBatchExport('pdf')}
                className="flex min-h-[52px] w-full items-center gap-3 py-2.5 text-left hover:bg-[#F6F6F9] disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  {batchExportingFormat === 'pdf' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[#1A1A24]">
                    Batch Export All Notes (PDF)
                  </span>
                  <span className="block truncate text-[11.5px] text-[#8C8F99]">
                    Combine {notes.length} notes in background worker
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={Boolean(batchExportingFormat)}
                onClick={() => handleBatchExport('docx')}
                className="flex min-h-[52px] w-full items-center gap-3 py-2.5 text-left hover:bg-[#F6F6F9] disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2979FF]">
                  {batchExportingFormat === 'docx' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileType className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[#1A1A24]">
                    Batch Export All Notes (DOCX)
                  </span>
                  <span className="block truncate text-[11.5px] text-[#8C8F99]">
                    Bulk OpenXML document for all {notes.length} notes
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Notebook Dialog (Phase 2) */}
      {notebookDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create Notebook"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
          onClick={() => setNotebookDialogOpen(false)}
        >
          <form
            onSubmit={handleCreateNotebook}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] rounded-2xl border border-[#E6E6EC] bg-white p-4 shadow-lg"
          >
            <h3 className="text-[15px] font-semibold text-[#1A1A24]">New Notebook</h3>
            <label htmlFor="new-notebook-input" className="sr-only">
              Notebook name
            </label>
            <input
              id="new-notebook-input"
              type="text"
              autoFocus
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              placeholder="Notebook name..."
              className="mt-3 w-full rounded-xl border border-[#E6E6EC] px-3 py-2 text-[13.5px] text-[#1A1A24] focus:border-[#6B4EFF] focus:outline-none"
            />

            <div className="mt-3 flex items-center gap-2.5">
              {['#6B4EFF', '#2979FF', '#00C853', '#FF5252'].map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Select color ${color}`}
                  onClick={() => setNewNotebookColor(color)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    newNotebookColor === color
                      ? 'ring-2 ring-[#1A1A24] ring-offset-2 scale-110'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotebookDialogOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#5F6368] hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#6B4EFF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#5B3EE8]"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Notebook Confirmation Dialog (Phase 3 Addendum) */}
      {notebookPendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete notebook confirmation"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
          onClick={() => setNotebookPendingDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[300px] rounded-2xl border border-[#E6E6EC] bg-white p-4 shadow-lg"
          >
            <h3 className="text-[15px] font-semibold text-[#1A1A24]">
              Delete &ldquo;{notebookPendingDelete.name}&rdquo;?
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5F6368]">
              All notes inside this notebook will also be permanently deleted from SQLite.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNotebookPendingDelete(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#5F6368] hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNotebook}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Phone Phase Preview Notice Sheet */}
      {notice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={notice.title}
          className="absolute inset-0 z-30 flex items-end bg-black/35 p-3 backdrop-blur-[1px]"
          onClick={() => setNotice(null)}
        >
          <div
            className="w-full rounded-2xl border border-[#E6E6EC] bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[#6B4EFF]">
                  {notice.phaseLabel}
                </p>
                <h3 className="mt-0.5 text-[15px] font-semibold text-[#1A1A24]">
                  {notice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Close preview notice"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#5F6368] hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#5F6368]">
              {notice.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
