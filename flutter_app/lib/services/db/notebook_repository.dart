import 'package:drift/drift.dart';
import 'app_database.dart';

abstract interface class NotebookRepository {
  Stream<List<Notebook>> watchOpenNotebooks();
  Stream<List<Notebook>> watchClosedNotebooks();
  Future<List<Notebook>> getAllNotebooks();
  Future<List<Notebook>> searchNotebooks(String query);
  Future<Notebook> createNotebook({
    required String title,
    required int color,
  });
  Future<void> renameNotebook(String id, String newTitle);
  Future<void> setNotebookClosed(String id, bool isClosed);
  Future<void> deleteNotebook(String id);
}

class DriftNotebookRepository implements NotebookRepository {
  DriftNotebookRepository(this._db);

  final AppDatabase _db;

  @override
  Stream<List<Notebook>> watchOpenNotebooks() {
    return (_db.select(_db.notebooks)
          ..where((t) => t.isClosed.equals(false))
          ..orderBy([
            (t) => OrderingTerm(expression: t.isDefault, mode: OrderingMode.desc),
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc),
          ]))
        .watch();
  }

  @override
  Stream<List<Notebook>> watchClosedNotebooks() {
    return (_db.select(_db.notebooks)
          ..where((t) => t.isClosed.equals(true))
          ..orderBy([
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc),
          ]))
        .watch();
  }

  @override
  Future<List<Notebook>> getAllNotebooks() {
    return (_db.select(_db.notebooks)
          ..orderBy([
            (t) => OrderingTerm(expression: t.isDefault, mode: OrderingMode.desc),
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc),
          ]))
        .get();
  }

  @override
  Future<List<Notebook>> searchNotebooks(String query) {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      return getAllNotebooks();
    }
    final pattern = '%$trimmed%';
    // Queries indexed `notebooks.title` column via SQL LIKE
    return (_db.select(_db.notebooks)
          ..where((t) => t.title.like(pattern))
          ..orderBy([
            (t) => OrderingTerm(expression: t.isDefault, mode: OrderingMode.desc),
            (t) => OrderingTerm(expression: t.title, mode: OrderingMode.asc),
          ]))
        .get();
  }

  @override
  Future<Notebook> createNotebook({
    required String title,
    required int color,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final id = 'nb_$now';
    final companion = NotebooksCompanion.insert(
      id: id,
      title: title.trim(),
      color: color,
      createdAt: now,
    );
    await _db.into(_db.notebooks).insert(companion);
    return (_db.select(_db.notebooks)..where((t) => t.id.equals(id))).getSingle();
  }

  @override
  Future<void> renameNotebook(String id, String newTitle) async {
    await (_db.update(_db.notebooks)..where((t) => t.id.equals(id))).write(
      NotebooksCompanion(title: Value(newTitle.trim())),
    );
  }

  @override
  Future<void> setNotebookClosed(String id, bool isClosed) async {
    await (_db.update(_db.notebooks)..where((t) => t.id.equals(id))).write(
      NotebooksCompanion(isClosed: Value(isClosed)),
    );
  }

  @override
  Future<void> deleteNotebook(String id) async {
    await (_db.delete(_db.notebooks)..where((t) => t.id.equals(id))).go();
  }
}
