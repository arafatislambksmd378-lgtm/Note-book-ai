import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/db/app_database.dart';
import '../services/db/note_repository.dart';
import '../services/db/notebook_repository.dart';

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final notebookRepositoryProvider = Provider<NotebookRepository>((ref) {
  return DriftNotebookRepository(ref.watch(appDatabaseProvider));
});

final noteRepositoryProvider = Provider<NoteRepository>((ref) {
  return DriftNoteRepository(ref.watch(appDatabaseProvider));
});

final openNotebooksProvider = StreamProvider<List<Notebook>>((ref) {
  return ref.watch(notebookRepositoryProvider).watchOpenNotebooks();
});

final closedNotebooksProvider = StreamProvider<List<Notebook>>((ref) {
  return ref.watch(notebookRepositoryProvider).watchClosedNotebooks();
});
