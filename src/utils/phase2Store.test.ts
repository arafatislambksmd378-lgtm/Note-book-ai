import test from 'node:test';
import assert from 'node:assert/strict';
import { OPEN_NOTEBOOKS, SEED_NOTES, type NotePreviewItem } from '../data/phase1Data';
import {
  createNotebookRecord,
  deleteNoteRecord,
  deserializeQuillDelta,
  extractSnippetFromDelta,
  fetchPaginatedNotes,
  serializeQuillDelta,
  upsertNoteRecord,
  type RichBlock,
} from './phase2Store';

test('serializeQuillDelta and deserializeQuillDelta round-trip rich formatting', () => {
  const blocks: RichBlock[] = [
    { id: '1', type: 'h1', text: 'Offline Architecture', bold: true },
    { id: '2', type: 'checklist', text: 'Configure SQLite WAL', checked: true },
    { id: '3', type: 'bullet', text: 'Limit 20 notes per page', italic: true },
  ];

  const json = serializeQuillDelta(blocks);
  const parsed = deserializeQuillDelta(json);

  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].type, 'h1');
  assert.equal(parsed[0].text, 'Offline Architecture');
  assert.equal(parsed[1].type, 'checklist');
  assert.equal(parsed[1].checked, true);
  assert.equal(parsed[2].type, 'bullet');
  assert.equal(parsed[2].italic, true);

  const snippet = extractSnippetFromDelta(json);
  assert.ok(snippet.includes('Offline Architecture'));
  assert.ok(snippet.includes('Configure SQLite WAL'));
});

test('upsertNoteRecord creates, updates, and deleteNoteRecord removes notes', () => {
  const { notes: afterCreate, savedNote } = upsertNoteRecord(SEED_NOTES, {
    notebookId: 'nb1',
    notebookName: 'My Notebook',
    notebookColor: '#6B4EFF',
    title: 'Phase 2 Notes',
    blocks: [{ id: 'b1', type: 'paragraph', text: 'Saved as Quill Delta JSON' }],
    tint: 'purple',
    nowMs: 1700000000000,
  });

  assert.equal(afterCreate.length, SEED_NOTES.length + 1);
  assert.equal(afterCreate[0].id, savedNote.id);
  assert.equal(afterCreate[0].snippet, 'Saved as Quill Delta JSON');

  const { notes: afterUpdate } = upsertNoteRecord(afterCreate, {
    id: savedNote.id,
    notebookId: 'nb1',
    notebookName: 'My Notebook',
    notebookColor: '#6B4EFF',
    title: 'Phase 2 Notes Updated',
    blocks: [{ id: 'b1', type: 'paragraph', text: 'Updated body text' }],
    tint: 'green',
    nowMs: 1700000005000,
  });

  assert.equal(afterUpdate.length, SEED_NOTES.length + 1);
  assert.equal(afterUpdate[0].title, 'Phase 2 Notes Updated');
  assert.equal(afterUpdate[0].tint, 'green');

  const afterDelete = deleteNoteRecord(afterUpdate, savedNote.id);
  assert.equal(afterDelete.length, SEED_NOTES.length);
  assert.equal(afterDelete.some((n) => n.id === savedNote.id), false);
});

test('createNotebookRecord adds a new open notebook', () => {
  const { notebooks, created } = createNotebookRecord(OPEN_NOTEBOOKS, {
    title: 'Research Notes',
    color: '#00C853',
    nowMs: 1700000000000,
  });

  assert.equal(notebooks.length, OPEN_NOTEBOOKS.length + 1);
  assert.equal(created.name, 'Research Notes');
  assert.equal(created.color, '#00C853');
});

test('fetchPaginatedNotes enforces LIMIT 20 OFFSET X across 45 notes', () => {
  const manyNotes: NotePreviewItem[] = Array.from({ length: 45 }, (_, idx) => ({
    id: `p_${idx}`,
    notebookId: 'nb1',
    notebookName: 'My Notebook',
    title: `Paginated Note ${idx + 1}`,
    snippet: `Content ${idx + 1}`,
    dateLabel: '18/11',
    tint: 'none',
    accentColor: '#6B4EFF',
    updatedAt: 1700000000000 - idx * 1000,
  }));

  const page1 = fetchPaginatedNotes(manyNotes, { limit: 20, offset: 0 });
  const page2 = fetchPaginatedNotes(manyNotes, { limit: 20, offset: 20 });
  const page3 = fetchPaginatedNotes(manyNotes, { limit: 20, offset: 40 });
  const page4 = fetchPaginatedNotes(manyNotes, { limit: 20, offset: 60 });

  assert.equal(page1.items.length, 20);
  assert.equal(page1.hasMore, true);
  assert.equal(page2.items.length, 20);
  assert.equal(page2.hasMore, true);
  assert.equal(page3.items.length, 5);
  assert.equal(page3.hasMore, false);
  assert.equal(page4.items.length, 0);
  assert.equal(page1.totalCount, 45);
});
