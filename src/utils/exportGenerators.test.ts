import test from 'node:test';
import assert from 'node:assert/strict';
import { OPEN_NOTEBOOKS, SEED_NOTES, type NotePreviewItem } from '../data/phase1Data';
import {
  buildExportFilename,
  generateExportArtifact,
  getRecentNotes,
  searchIndexedNotebooks,
} from './exportGenerators';

const SAMPLE_DELTA = JSON.stringify([
  { insert: 'Weekly Budget' },
  { insert: '\n', attributes: { header: 1 } },
  { insert: 'Groceries | 450 BDT' },
  { insert: '\n' },
  { insert: 'Review SQLite cache' },
  { insert: '\n', attributes: { list: 'checked' } },
]);

test('generateExportArtifact creates valid TXT, PDF, DOCX, and XLSX outputs', () => {
  const txt = generateExportArtifact('txt', 'Sprint Note', SAMPLE_DELTA);
  assert.equal(txt.filename, 'Sprint_Note.txt');
  const txtDecoded = new TextDecoder().decode(txt.bytes);
  assert.ok(txtDecoded.includes('Sprint Note'));
  assert.ok(txtDecoded.includes('# Weekly Budget'));
  assert.ok(txtDecoded.includes('[x] Review SQLite cache'));

  const pdf = generateExportArtifact('pdf', 'Sprint Note', SAMPLE_DELTA);
  assert.equal(pdf.filename, 'Sprint_Note.pdf');
  const pdfHeader = new TextDecoder().decode(pdf.bytes.slice(0, 8));
  assert.equal(pdfHeader, '%PDF-1.4');

  const docx = generateExportArtifact('docx', 'Sprint Note', SAMPLE_DELTA);
  assert.equal(docx.filename, 'Sprint_Note.docx');
  assert.deepEqual(Array.from(docx.bytes.slice(0, 2)), [0x50, 0x4b]);

  const xlsx = generateExportArtifact('xlsx', 'Sprint Note', SAMPLE_DELTA);
  assert.equal(xlsx.filename, 'Sprint_Note.xlsx');
  assert.deepEqual(Array.from(xlsx.bytes.slice(0, 2)), [0x50, 0x4b]);
});

test('buildExportFilename sanitizes unsafe characters and enforces extension', () => {
  assert.equal(buildExportFilename('  My/Note: #1! ', 'pdf'), 'MyNote_1.pdf');
  assert.equal(buildExportFilename('   ', 'xlsx'), 'NoteGenie_Note.xlsx');
});

test('getRecentNotes returns at most 5 most recently updated notes', () => {
  const datedNotes: NotePreviewItem[] = SEED_NOTES.map((n, idx) => ({
    ...n,
    updatedAt: 1000 + idx * 100,
  }));

  const recent = getRecentNotes(datedNotes, 5);
  assert.equal(recent.length, 5);
  assert.equal(recent[0].id, SEED_NOTES[SEED_NOTES.length - 1].id);
});

import {
  deleteNotebookRecord,
  fetchPaginatedNotes,
} from './phase2Store';

test('searchIndexedNotebooks filters notebooks by indexed title match', () => {
  const matches = searchIndexedNotebooks(OPEN_NOTEBOOKS, 'travel');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, 'Travel Journal');
});

test('deleteNotebookRecord cascades note removal while preserving default notebook', () => {
  const afterDeleteCustom = deleteNotebookRecord(OPEN_NOTEBOOKS, SEED_NOTES, 'nb2');
  assert.equal(afterDeleteCustom.notebooks.some((n) => n.id === 'nb2'), false);
  assert.equal(afterDeleteCustom.notes.some((n) => n.notebookId === 'nb2'), false);

  const afterAttemptDefault = deleteNotebookRecord(OPEN_NOTEBOOKS, SEED_NOTES, 'nb1');
  assert.equal(afterAttemptDefault.notebooks.some((n) => n.id === 'nb1'), true);
});

test('fetchPaginatedNotes restricts search strictly to indexed title & notebookName columns', () => {
  const titleMatch = fetchPaginatedNotes(SEED_NOTES, { query: 'grocery' });
  assert.equal(titleMatch.items.length, 1);
  assert.equal(titleMatch.items[0].id, 'n5');

  const notebookMatch = fetchPaginatedNotes(SEED_NOTES, { query: 'travel journal' });
  assert.equal(notebookMatch.items.length, 2);

  // Snippet-only term should not trigger full-text body scan
  const bodyOnlyMatch = fetchPaginatedNotes(SEED_NOTES, { query: 'cinnamon' });
  assert.equal(bodyOnlyMatch.items.length, 0);
});
