import 'dart:convert';
import 'package:drift/drift.dart';
import 'app_database.dart';

/// Lightweight joined projection for Home screen cards & Recent Notes strip.
/// Avoids loading full Quill Delta JSON blobs into memory during grid scrolling.
class NoteCardRecord {
  const NoteCardRecord({
    required this.id,
    required this.notebookId,
    required this.notebookTitle,
    required this.notebookColor,
    required this.title,
    required this.snippet,
    required this.tint,
    required this.updatedAt,
  });

  final String id;
  final String notebookId;
  final String notebookTitle;
  final int notebookColor;
  final String title;
  final String snippet;
  final String tint;
  final int updatedAt;
}

abstract interface class NoteRepository {
  Future<List<NoteCardRecord>> fetchNotesPage({
    int limit = 20,
    int offset = 0,
    String? searchQuery,
    String? notebookId,
  });

  /// Returns the top N most recently updated notes (default 5) for the Home carousel.
  Future<List<NoteCardRecord>> fetchRecentNotes({int limit = 5});

  Future<Note?> getNoteById(String id);

  Future<Note> createNote({
    required String notebookId,
    required String title,
    required String deltaJson,
    String tint = 'none',
  });

  Future<Note> updateNote({
    required String id,
    required String notebookId,
    required String title,
    required String deltaJson,
    String? tint,
  });

  Future<void> moveNoteToNotebook(String noteId, String targetNotebookId);

  Future<void> deleteNote(String id);
}

class DriftNoteRepository implements NoteRepository {
  DriftNoteRepository(this._db);

  final AppDatabase _db;

  static String extractSnippet(String deltaJson, {int maxChars = 140}) {
    try {
      final decoded = jsonDecode(deltaJson);
      if (decoded is! List) return '';
      final buffer = StringBuffer();
      for (final op in decoded) {
        if (op is Map && op['insert'] is String) {
          buffer.write(op['insert']);
          if (buffer.length >= maxChars) break;
        }
      }
      final cleaned = buffer.toString().replaceAll(RegExp(r'\s+'), ' ').trim();
      if (cleaned.length <= maxChars) return cleaned;
      return '${cleaned.substring(0, maxChars)}...';
    } catch (_) {
      return '';
    }
  }

  @override
  Future<List<NoteCardRecord>> fetchNotesPage({
    int limit = 20,
    int offset = 0,
    String? searchQuery,
    String? notebookId,
  }) async {
    final query = _db.select(_db.notes).join([
      innerJoin(
        _db.notebooks,
        _db.notebooks.id.equalsExp(_db.notes.notebookId),
      ),
    ]);

    if (notebookId != null && notebookId.isNotEmpty) {
      query.where(_db.notes.notebookId.equals(notebookId));
    }

    // Query strictly against indexed title columns (notes.title & notebooks.title)
    // to keep SQL LIKE fast and memory-safe on 3GB RAM devices.
    final trimmed = searchQuery?.trim();
    if (trimmed != null && trimmed.isNotEmpty) {
      final pattern = '%$trimmed%';
      query.where(
        _db.notes.title.like(pattern) | _db.notebooks.title.like(pattern),
      );
    }

    query
      ..orderBy([OrderingTerm.desc(_db.notes.updatedAt)])
      ..limit(limit, offset: offset);

    final rows = await query.get();
    return _mapRows(rows);
  }

  @override
  Future<List<NoteCardRecord>> fetchRecentNotes({int limit = 5}) async {
    final query = _db.select(_db.notes).join([
      innerJoin(
        _db.notebooks,
        _db.notebooks.id.equalsExp(_db.notes.notebookId),
      ),
    ])
      ..orderBy([OrderingTerm.desc(_db.notes.updatedAt)])
      ..limit(limit);

    final rows = await query.get();
    return _mapRows(rows);
  }

  List<NoteCardRecord> _mapRows(List<TypedResult> rows) {
    return rows.map((row) {
      final note = row.readTable(_db.notes);
      final notebook = row.readTable(_db.notebooks);
      return NoteCardRecord(
        id: note.id,
        notebookId: note.notebookId,
        notebookTitle: notebook.title,
        notebookColor: notebook.color,
        title: note.title,
        snippet: note.snippet,
        tint: note.tint,
        updatedAt: note.updatedAt,
      );
    }).toList(growable: false);
  }

  @override
  Future<Note?> getNoteById(String id) {
    return (_db.select(_db.notes)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  @override
  Future<Note> createNote({
    required String notebookId,
    required String title,
    required String deltaJson,
    String tint = 'none',
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final id = 'note_$now';
    final cleanTitle = title.trim().isEmpty ? 'Untitled Note' : title.trim();
    final snippet = extractSnippet(deltaJson);

    await _db.into(_db.notes).insert(
          NotesCompanion.insert(
            id: id,
            notebookId: notebookId,
            title: Value(cleanTitle),
            content: deltaJson,
            snippet: Value(snippet),
            tint: Value(tint),
            createdAt: now,
            updatedAt: now,
          ),
        );

    return (_db.select(_db.notes)..where((t) => t.id.equals(id))).getSingle();
  }

  @override
  Future<Note> updateNote({
    required String id,
    required String notebookId,
    required String title,
    required String deltaJson,
    String? tint,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final cleanTitle = title.trim().isEmpty ? 'Untitled Note' : title.trim();
    final snippet = extractSnippet(deltaJson);

    await (_db.update(_db.notes)..where((t) => t.id.equals(id))).write(
      NotesCompanion(
        notebookId: Value(notebookId),
        title: Value(cleanTitle),
        content: Value(deltaJson),
        snippet: Value(snippet),
        tint: tint != null ? Value(tint) : const Value.absent(),
        updatedAt: Value(now),
      ),
    );

    return (_db.select(_db.notes)..where((t) => t.id.equals(id))).getSingle();
  }

  @override
  Future<void> moveNoteToNotebook(String noteId, String targetNotebookId) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.notes)..where((t) => t.id.equals(noteId))).write(
      NotesCompanion(
        notebookId: Value(targetNotebookId),
        updatedAt: Value(now),
      ),
    );
  }

  @override
  Future<void> deleteNote(String id) async {
    await (_db.delete(_db.notes)..where((t) => t.id.equals(id))).go();
  }
}
