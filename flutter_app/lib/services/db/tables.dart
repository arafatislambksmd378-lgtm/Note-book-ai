import 'package:drift/drift.dart';

/// Drift table definition for `notebooks`.
/// Indexed on `title` for fast SQL LIKE search on low-end 3GB RAM devices.
@DataClassName('Notebook')
@TableIndex(name: 'idx_notebooks_title', columns: {#title})
class Notebooks extends Table {
  TextColumn get id => text()();
  TextColumn get title => text().withLength(min: 1, max: 120)();
  IntColumn get color => integer()();
  BoolColumn get isClosed => boolean().withDefault(const Constant(false))();
  BoolColumn get isDefault => boolean().withDefault(const Constant(false))();
  IntColumn get createdAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Drift table definition for `notes`.
/// Indexed on `updatedAt`, `notebookId`, and `title` so paginated queries
/// and LIKE searches never scan large unindexed Quill Delta JSON blobs.
@DataClassName('Note')
@TableIndex(name: 'idx_notes_updated_at', columns: {#updatedAt})
@TableIndex(name: 'idx_notes_notebook_id', columns: {#notebookId})
@TableIndex(name: 'idx_notes_title', columns: {#title})
class Notes extends Table {
  TextColumn get id => text()();
  TextColumn get notebookId =>
      text().references(Notebooks, #id, onDelete: KeyAction.cascade)();
  TextColumn get title => text().withDefault(const Constant('Untitled Note'))();
  TextColumn get content => text()(); // Quill Delta JSON string
  TextColumn get snippet => text().withDefault(const Constant(''))();
  TextColumn get tint => text().withDefault(const Constant('none'))();
  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}
