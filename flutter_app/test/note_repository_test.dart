import 'dart:convert';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:notegenie_ai/services/db/app_database.dart';
import 'package:notegenie_ai/services/db/note_repository.dart';
import 'package:notegenie_ai/services/db/notebook_repository.dart';

void main() {
  late AppDatabase db;
  late DriftNotebookRepository notebookRepo;
  late DriftNoteRepository noteRepo;

  setUp(() async {
    // Use fast in-memory SQLite executor for deterministic CRUD & pagination tests
    db = AppDatabase(NativeDatabase.memory());
    notebookRepo = DriftNotebookRepository(db);
    noteRepo = DriftNoteRepository(db);
  });

  tearDown(() async {
    await db.close();
  });

  group('Phase 2 SQLite CRUD & Pagination', () {
    test('creates and reads a notebook in SQLite', () async {
      final created = await notebookRepo.createNotebook(
        title: 'Bengali Poetry',
        color: 0xFF6B4EFF,
      );

      expect(created.title, 'Bengali Poetry');
      expect(created.isClosed, false);

      final all = await notebookRepo.getAllNotebooks();
      expect(all.any((nb) => nb.id == created.id), true);
    });

    test('creates, reads, updates with Quill JSON, and deletes a note', () async {
      final nb = await notebookRepo.createNotebook(
        title: 'Architecture Notes',
        color: 0xFF2979FF,
      );

      final initialDelta = jsonEncode([
        {'insert': 'Offline SQLite + Drift schema\n'}
      ]);

      final createdNote = await noteRepo.createNote(
        notebookId: nb.id,
        title: 'Phase 2 Spec',
        deltaJson: initialDelta,
        tint: 'purple',
      );

      expect(createdNote.title, 'Phase 2 Spec');
      expect(createdNote.snippet, 'Offline SQLite + Drift schema');

      final fetched = await noteRepo.getNoteById(createdNote.id);
      expect(fetched, isNotNull);
      expect(fetched!.content, initialDelta);

      final updatedDelta = jsonEncode([
        {
          'insert': 'Updated rich text checklist',
          'attributes': {'bold': true}
        },
        {'insert': '\n'}
      ]);

      final updatedNote = await noteRepo.updateNote(
        id: createdNote.id,
        notebookId: nb.id,
        title: 'Phase 2 Spec v2',
        deltaJson: updatedDelta,
      );

      expect(updatedNote.title, 'Phase 2 Spec v2');
      expect(updatedNote.snippet, 'Updated rich text checklist');

      await noteRepo.deleteNote(createdNote.id);
      final afterDelete = await noteRepo.getNoteById(createdNote.id);
      expect(afterDelete, isNull);
    });

    test('fetchNotesPage enforces LIMIT 20 OFFSET X lazy pagination', () async {
      final nb = await notebookRepo.createNotebook(
        title: 'Pagination Test Notebook',
        color: 0xFF00C853,
      );

      // Clear seeded notes first so total count is exact (45)
      final existing = await noteRepo.fetchNotesPage(limit: 100, offset: 0);
      for (final item in existing) {
        await noteRepo.deleteNote(item.id);
      }

      for (var i = 0; i < 45; i++) {
        await noteRepo.createNote(
          notebookId: nb.id,
          title: 'Note #$i',
          deltaJson: jsonEncode([
            {'insert': 'Body content for note $i\n'}
          ]),
        );
      }

      final page1 = await noteRepo.fetchNotesPage(limit: 20, offset: 0);
      final page2 = await noteRepo.fetchNotesPage(limit: 20, offset: 20);
      final page3 = await noteRepo.fetchNotesPage(limit: 20, offset: 40);
      final page4 = await noteRepo.fetchNotesPage(limit: 20, offset: 60);

      expect(page1.length, 20);
      expect(page2.length, 20);
      expect(page3.length, 5);
      expect(page4, isEmpty);

      // Ensure zero overlap across pages
      final page1Ids = page1.map((e) => e.id).toSet();
      final page2Ids = page2.map((e) => e.id).toSet();
      expect(page1Ids.intersection(page2Ids), isEmpty);
    });
  });
}
