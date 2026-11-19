import type { NoteCardTint, NotePreviewItem, NotebookEntry } from '../data/phase1Data';

export type RichBlockType = 'paragraph' | 'h1' | 'h2' | 'bullet' | 'ordered' | 'checklist';

export interface RichBlock {
  id: string;
  type: RichBlockType;
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  checked?: boolean;
}

export interface QuillDeltaOp {
  insert: string;
  attributes?: Record<string, unknown>;
}

export interface UpsertNoteInput {
  id?: string;
  notebookId: string;
  notebookName: string;
  notebookColor: string;
  title: string;
  blocks: RichBlock[];
  tint: NoteCardTint;
  nowMs?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  totalCount: number;
}

export function serializeQuillDelta(blocks: RichBlock[]): string {
  const ops: QuillDeltaOp[] = [];

  for (const block of blocks) {
    const inlineAttrs: Record<string, unknown> = {};
    if (block.bold) inlineAttrs.bold = true;
    if (block.italic) inlineAttrs.italic = true;
    if (block.underline) inlineAttrs.underline = true;

    if (block.text.length > 0) {
      ops.push(
        Object.keys(inlineAttrs).length > 0
          ? { insert: block.text, attributes: inlineAttrs }
          : { insert: block.text }
      );
    }

    const lineAttrs: Record<string, unknown> = {};
    if (block.type === 'h1') lineAttrs.header = 1;
    if (block.type === 'h2') lineAttrs.header = 2;
    if (block.type === 'bullet') lineAttrs.list = 'bullet';
    if (block.type === 'ordered') lineAttrs.list = 'ordered';
    if (block.type === 'checklist') {
      lineAttrs.list = block.checked ? 'checked' : 'unchecked';
    }

    ops.push(
      Object.keys(lineAttrs).length > 0
        ? { insert: '\n', attributes: lineAttrs }
        : { insert: '\n' }
    );
  }

  if (ops.length === 0) {
    ops.push({ insert: '\n' });
  }

  return JSON.stringify(ops);
}

export function deserializeQuillDelta(deltaJson?: string): RichBlock[] {
  if (!deltaJson) {
    return [{ id: 'blk_0', type: 'paragraph', text: '' }];
  }

  try {
    const parsed = JSON.parse(deltaJson) as QuillDeltaOp[];
    if (!Array.isArray(parsed)) {
      return [{ id: 'blk_0', type: 'paragraph', text: deltaJson }];
    }

    const blocks: RichBlock[] = [];
    let currentText = '';
    let currentBold = false;
    let currentItalic = false;
    let currentUnderline = false;

    const pushLine = (attrs?: Record<string, unknown>) => {
      let type: RichBlockType = 'paragraph';
      let checked = false;

      if (attrs?.header === 1) type = 'h1';
      else if (attrs?.header === 2) type = 'h2';
      else if (attrs?.list === 'bullet') type = 'bullet';
      else if (attrs?.list === 'ordered') type = 'ordered';
      else if (attrs?.list === 'checked') {
        type = 'checklist';
        checked = true;
      } else if (attrs?.list === 'unchecked') {
        type = 'checklist';
        checked = false;
      }

      blocks.push({
        id: `blk_${blocks.length}`,
        type,
        text: currentText,
        bold: currentBold || undefined,
        italic: currentItalic || undefined,
        underline: currentUnderline || undefined,
        checked: type === 'checklist' ? checked : undefined,
      });

      currentText = '';
      currentBold = false;
      currentItalic = false;
      currentUnderline = false;
    };

    for (const op of parsed) {
      if (typeof op.insert !== 'string') continue;
      if (op.insert === '\n') {
        pushLine(op.attributes);
        continue;
      }

      const parts = op.insert.split('\n');
      parts.forEach((part, idx) => {
        if (part.length > 0) {
          currentText += part;
          if (op.attributes?.bold) currentBold = true;
          if (op.attributes?.italic) currentItalic = true;
          if (op.attributes?.underline) currentUnderline = true;
        }
        if (idx < parts.length - 1) {
          pushLine(idx === parts.length - 2 ? op.attributes : undefined);
        }
      });
    }

    if (currentText.length > 0 || blocks.length === 0) {
      pushLine();
    }

    return blocks;
  } catch {
    return [{ id: 'blk_0', type: 'paragraph', text: deltaJson }];
  }
}

export function extractSnippetFromDelta(deltaJson: string, maxChars = 140): string {
  try {
    const parsed = JSON.parse(deltaJson) as QuillDeltaOp[];
    if (!Array.isArray(parsed)) return '';
    const joined = parsed
      .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

    if (joined.length <= maxChars) return joined;
    return `${joined.slice(0, maxChars)}...`;
  } catch {
    return '';
  }
}

export function formatShortDate(ms: number): string {
  const date = new Date(ms);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function upsertNoteRecord(
  allNotes: NotePreviewItem[],
  input: UpsertNoteInput
): { notes: NotePreviewItem[]; savedNote: NotePreviewItem } {
  const now = input.nowMs ?? Date.now();
  const contentDeltaJson = serializeQuillDelta(input.blocks);
  const snippet = extractSnippetFromDelta(contentDeltaJson);
  const cleanTitle = input.title.trim() || 'Untitled Note';
  const existing = input.id ? allNotes.find((n) => n.id === input.id) : undefined;

  const savedNote: NotePreviewItem = {
    id: existing?.id ?? `note_${now}`,
    notebookId: input.notebookId,
    notebookName: input.notebookName,
    sectionName: existing?.sectionName,
    title: cleanTitle,
    snippet,
    contentDeltaJson,
    dateLabel: formatShortDate(now),
    imageUrl: existing?.imageUrl,
    imageAlt: existing?.imageAlt,
    tint: input.tint,
    accentColor: input.notebookColor,
    isStickyStyle: existing?.isStickyStyle ?? false,
    updatedAt: now,
  };

  const remaining = allNotes.filter((n) => n.id !== savedNote.id);
  return {
    notes: [savedNote, ...remaining],
    savedNote,
  };
}

export function deleteNoteRecord(
  allNotes: NotePreviewItem[],
  noteId: string
): NotePreviewItem[] {
  return allNotes.filter((n) => n.id !== noteId);
}

export function createNotebookRecord(
  allNotebooks: NotebookEntry[],
  input: { title: string; color: string; nowMs?: number }
): { notebooks: NotebookEntry[]; created: NotebookEntry } {
  const now = input.nowMs ?? Date.now();
  const created: NotebookEntry = {
    id: `nb_${now}`,
    name: input.title.trim(),
    color: input.color,
    isDefault: false,
    isClosed: false,
    noteCount: 0,
  };
  return {
    notebooks: [created, ...allNotebooks],
    created,
  };
}

export function deleteNotebookRecord(
  allNotebooks: NotebookEntry[],
  allNotes: NotePreviewItem[],
  notebookId: string
): { notebooks: NotebookEntry[]; notes: NotePreviewItem[] } {
  return {
    notebooks: allNotebooks.filter((nb) => nb.id !== notebookId || Boolean(nb.isDefault)),
    notes: allNotes.filter((n) => n.notebookId !== notebookId),
  };
}

export function fetchPaginatedNotes(
  allNotes: NotePreviewItem[],
  options: {
    limit?: number;
    offset?: number;
    query?: string;
    tint?: NoteCardTint | 'all';
  }
): PaginatedResult<NotePreviewItem> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const normalizedQuery = (options.query ?? '').trim().toLowerCase();
  const tint = options.tint ?? 'all';

  const filtered = allNotes.filter((note) => {
    if (tint !== 'all' && note.tint !== tint) return false;
    if (!normalizedQuery) return true;
    // Matches SQLite LIKE strictly against indexed title columns (notes.title, notebooks.title)
    return (
      note.title.toLowerCase().includes(normalizedQuery) ||
      note.notebookName.toLowerCase().includes(normalizedQuery)
    );
  });

  const sliced = filtered.slice(offset, offset + limit);
  return {
    items: sliced,
    hasMore: offset + sliced.length < filtered.length,
    totalCount: filtered.length,
  };
}
