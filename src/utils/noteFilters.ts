import type { NoteCardTint, NotePreviewItem, NotebookEntry } from '../data/phase1Data';

export interface NoteFilterOptions {
  query: string;
  tint: NoteCardTint | 'all';
}

export function formatBreadcrumb(note: Pick<NotePreviewItem, 'notebookName' | 'sectionName'>): string {
  if (note.sectionName && note.sectionName.trim().length > 0) {
    return `${note.notebookName} » ${note.sectionName}`;
  }
  return note.notebookName;
}

export function filterNotes(
  notes: NotePreviewItem[],
  options: NoteFilterOptions
): NotePreviewItem[] {
  const normalizedQuery = options.query.trim().toLowerCase();

  return notes.filter((note) => {
    const matchesTint = options.tint === 'all' || note.tint === options.tint;
    if (!matchesTint) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      note.title,
      note.snippet ?? '',
      note.notebookName,
      note.sectionName ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function getVisibleClosedNotebooks(
  closedNotebooks: NotebookEntry[],
  showAll: boolean,
  collapsedLimit = 5
): NotebookEntry[] {
  if (showAll) {
    return closedNotebooks;
  }
  return closedNotebooks.slice(0, collapsedLimit);
}

export function splitIntoMasonryColumns<T>(items: T[]): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, index) => {
    if (index % 2 === 0) {
      left.push(item);
    } else {
      right.push(item);
    }
  });
  return [left, right];
}
