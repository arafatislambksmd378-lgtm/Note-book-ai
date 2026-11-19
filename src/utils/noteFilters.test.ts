import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOSED_NOTEBOOKS,
  SEED_NOTES,
} from '../data/phase1Data';
import {
  filterNotes,
  formatBreadcrumb,
  getVisibleClosedNotebooks,
  splitIntoMasonryColumns,
} from './noteFilters';

test('formatBreadcrumb formats notebook and optional section', () => {
  assert.equal(
    formatBreadcrumb({ notebookName: 'Travel Journal', sectionName: 'France' }),
    'Travel Journal » France'
  );
  assert.equal(
    formatBreadcrumb({ notebookName: 'My Notebook' }),
    'My Notebook'
  );
});

test('filterNotes filters by search query across title, snippet, and notebook', () => {
  const grocery = filterNotes(SEED_NOTES, { query: 'grocery', tint: 'all' });
  assert.equal(grocery.length, 1);
  assert.equal(grocery[0].id, 'n5');

  const france = filterNotes(SEED_NOTES, { query: 'france', tint: 'all' });
  assert.equal(france.length, 2);

  const empty = filterNotes(SEED_NOTES, { query: 'nonexistent-xyz', tint: 'all' });
  assert.equal(empty.length, 0);
});

test('filterNotes filters by card tint color', () => {
  const yellowNotes = filterNotes(SEED_NOTES, { query: '', tint: 'yellow' });
  assert.equal(yellowNotes.length, 1);
  assert.equal(yellowNotes[0].title, 'Grocery List');

  const greenNotes = filterNotes(SEED_NOTES, { query: '', tint: 'green' });
  assert.equal(greenNotes.length, 1);
  assert.equal(greenNotes[0].id, 'n8');
});

test('getVisibleClosedNotebooks respects collapsed limit and expansion', () => {
  const collapsed = getVisibleClosedNotebooks(CLOSED_NOTEBOOKS, false, 5);
  assert.equal(collapsed.length, 5);

  const expanded = getVisibleClosedNotebooks(CLOSED_NOTEBOOKS, true, 5);
  assert.equal(expanded.length, CLOSED_NOTEBOOKS.length);
});

test('splitIntoMasonryColumns distributes items evenly across two columns', () => {
  const [left, right] = splitIntoMasonryColumns(SEED_NOTES);
  assert.equal(left.length, 4);
  assert.equal(right.length, 4);
  assert.equal(left[0].id, 'n1');
  assert.equal(right[0].id, 'n2');
});
