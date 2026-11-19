import 'package:drift/drift.dart';
import 'package:drift_sqflite/drift_sqflite.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'tables.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Notebooks, Notes])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? _openSqfliteConnection());

  @override
  int get schemaVersion => 1;

  static QueryExecutor _openSqfliteConnection() {
    return LazyDatabase(() async {
      final dir = await getApplicationDocumentsDirectory();
      final dbPath = p.join(dir.path, 'notegenie_ai.db');
      return SqfliteQueryExecutor(
        path: dbPath,
        singleInstance: true,
        logStatements: false,
      );
    });
  }

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
        await _seedInitialData();
      },
      beforeOpen: (details) async {
        // Enforce foreign keys & WAL journal mode for low-latency writes on 3GB RAM devices.
        await customStatement('PRAGMA foreign_keys = ON;');
        await customStatement('PRAGMA journal_mode = WAL;');
      },
    );
  }

  Future<void> _seedInitialData() async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await batch((b) {
      b.insertAll(notebooks, [
        NotebooksCompanion.insert(
          id: 'nb_default',
          title: 'My Notebook',
          color: 0xFF6B4EFF,
          isDefault: const Value(true),
          createdAt: now,
        ),
        NotebooksCompanion.insert(
          id: 'nb_travel',
          title: 'Travel Journal',
          color: 0xFFFF5252,
          createdAt: now - 1000,
        ),
        NotebooksCompanion.insert(
          id: 'nb_work',
          title: 'Work Notebook',
          color: 0xFF2979FF,
          createdAt: now - 2000,
        ),
        NotebooksCompanion.insert(
          id: 'nb_school',
          title: 'School',
          color: 0xFFC4C6CE,
          isClosed: const Value(true),
          createdAt: now - 3000,
        ),
        NotebooksCompanion.insert(
          id: 'nb_class',
          title: 'Class work',
          color: 0xFFC4C6CE,
          isClosed: const Value(true),
          createdAt: now - 4000,
        ),
        NotebooksCompanion.insert(
          id: 'nb_maths',
          title: 'Maths',
          color: 0xFFC4C6CE,
          isClosed: const Value(true),
          createdAt: now - 5000,
        ),
        NotebooksCompanion.insert(
          id: 'nb_science',
          title: 'Science',
          color: 0xFFC4C6CE,
          isClosed: const Value(true),
          createdAt: now - 6000,
        ),
        NotebooksCompanion.insert(
          id: 'nb_english',
          title: 'English',
          color: 0xFFC4C6CE,
          isClosed: const Value(true),
          createdAt: now - 7000,
        ),
      ]);

      b.insertAll(notes, [
        NotesCompanion.insert(
          id: 'note_1',
          notebookId: 'nb_travel',
          title: const Value('France bike ride'),
          content: '[{"insert":"The bike ride from Paris to Vernon is scenic along the Seine...\\n"}]',
          snippet: const Value('The bike ride from Paris to Vernon is scenic along the Seine...'),
          tint: const Value('none'),
          createdAt: now - 10000,
          updatedAt: now - 10000,
        ),
        NotesCompanion.insert(
          id: 'note_2',
          notebookId: 'nb_default',
          title: const Value('Grocery List'),
          content: '[{"insert":"Toothpaste\\nHarissa paste\\nMilk\\n"}]',
          snippet: const Value('Toothpaste\nHarissa paste\nMilk'),
          tint: const Value('yellow'),
          createdAt: now - 20000,
          updatedAt: now - 20000,
        ),
        NotesCompanion.insert(
          id: 'note_3',
          notebookId: 'nb_work',
          title: const Value('Build List'),
          content: '[{"insert":"Spoke, Rim, Chains, Cog, Valve, Pedal\\n"}]',
          snippet: const Value('Spoke, Rim, Chains, Cog, Valve, Pedal'),
          tint: const Value('purple'),
          createdAt: now - 30000,
          updatedAt: now - 30000,
        ),
        NotesCompanion.insert(
          id: 'note_4',
          notebookId: 'nb_default',
          title: const Value('Confirmation code: XMALNSAD'),
          content: '[{"insert":"Offline ticket reference saved locally.\\n"}]',
          snippet: const Value('Offline ticket reference saved locally.'),
          tint: const Value('green'),
          createdAt: now - 40000,
          updatedAt: now - 40000,
        ),
      ]);
    });
  }
}
