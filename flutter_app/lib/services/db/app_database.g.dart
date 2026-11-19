// GENERATED CODE - Drift model classes and table companions for NoteGenie AI.
// Run `dart run build_runner build --delete-conflicting-outputs` after modifying tables.dart.

part of 'app_database.dart';

class Notebook extends DataClass implements Insertable<Notebook> {
  final String id;
  final String title;
  final int color;
  final bool isClosed;
  final bool isDefault;
  final int createdAt;

  const Notebook({
    required this.id,
    required this.title,
    required this.color,
    required this.isClosed,
    required this.isDefault,
    required this.createdAt,
  });

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['title'] = Variable<String>(title);
    map['color'] = Variable<int>(color);
    map['is_closed'] = Variable<bool>(isClosed);
    map['is_default'] = Variable<bool>(isDefault);
    map['created_at'] = Variable<int>(createdAt);
    return map;
  }

  NotebooksCompanion toCompanion(bool nullToAbsent) {
    return NotebooksCompanion(
      id: Value(id),
      title: Value(title),
      color: Value(color),
      isClosed: Value(isClosed),
      isDefault: Value(isDefault),
      createdAt: Value(createdAt),
    );
  }

  Notebook copyWith({
    String? id,
    String? title,
    int? color,
    bool? isClosed,
    bool? isDefault,
    int? createdAt,
  }) =>
      Notebook(
        id: id ?? this.id,
        title: title ?? this.title,
        color: color ?? this.color,
        isClosed: isClosed ?? this.isClosed,
        isDefault: isDefault ?? this.isDefault,
        createdAt: createdAt ?? this.createdAt,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Notebook &&
          other.id == id &&
          other.title == title &&
          other.color == color &&
          other.isClosed == isClosed &&
          other.isDefault == isDefault &&
          other.createdAt == createdAt);

  @override
  int get hashCode => Object.hash(id, title, color, isClosed, isDefault, createdAt);
}

class NotebooksCompanion extends UpdateCompanion<Notebook> {
  final Value<String> id;
  final Value<String> title;
  final Value<int> color;
  final Value<bool> isClosed;
  final Value<bool> isDefault;
  final Value<int> createdAt;

  const NotebooksCompanion({
    this.id = const Value.absent(),
    this.title = const Value.absent(),
    this.color = const Value.absent(),
    this.isClosed = const Value.absent(),
    this.isDefault = const Value.absent(),
    this.createdAt = const Value.absent(),
  });

  NotebooksCompanion.insert({
    required String id,
    required String title,
    required int color,
    this.isClosed = const Value.absent(),
    this.isDefault = const Value.absent(),
    required int createdAt,
  })  : id = Value(id),
        title = Value(title),
        color = Value(color),
        createdAt = Value(createdAt);

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) map['id'] = Variable<String>(id.value);
    if (title.present) map['title'] = Variable<String>(title.value);
    if (color.present) map['color'] = Variable<int>(color.value);
    if (isClosed.present) map['is_closed'] = Variable<bool>(isClosed.value);
    if (isDefault.present) map['is_default'] = Variable<bool>(isDefault.value);
    if (createdAt.present) map['created_at'] = Variable<int>(createdAt.value);
    return map;
  }
}

class Note extends DataClass implements Insertable<Note> {
  final String id;
  final String notebookId;
  final String title;
  final String content;
  final String snippet;
  final String tint;
  final int createdAt;
  final int updatedAt;

  const Note({
    required this.id,
    required this.notebookId,
    required this.title,
    required this.content,
    required this.snippet,
    required this.tint,
    required this.createdAt,
    required this.updatedAt,
  });

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['notebook_id'] = Variable<String>(notebookId);
    map['title'] = Variable<String>(title);
    map['content'] = Variable<String>(content);
    map['snippet'] = Variable<String>(snippet);
    map['tint'] = Variable<String>(tint);
    map['created_at'] = Variable<int>(createdAt);
    map['updated_at'] = Variable<int>(updatedAt);
    return map;
  }

  NotesCompanion toCompanion(bool nullToAbsent) {
    return NotesCompanion(
      id: Value(id),
      notebookId: Value(notebookId),
      title: Value(title),
      content: Value(content),
      snippet: Value(snippet),
      tint: Value(tint),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  Note copyWith({
    String? id,
    String? notebookId,
    String? title,
    String? content,
    String? snippet,
    String? tint,
    int? createdAt,
    int? updatedAt,
  }) =>
      Note(
        id: id ?? this.id,
        notebookId: notebookId ?? this.notebookId,
        title: title ?? this.title,
        content: content ?? this.content,
        snippet: snippet ?? this.snippet,
        tint: tint ?? this.tint,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Note &&
          other.id == id &&
          other.notebookId == notebookId &&
          other.title == title &&
          other.content == content &&
          other.snippet == snippet &&
          other.tint == tint &&
          other.createdAt == createdAt &&
          other.updatedAt == updatedAt);

  @override
  int get hashCode => Object.hash(
        id,
        notebookId,
        title,
        content,
        snippet,
        tint,
        createdAt,
        updatedAt,
      );
}

class NotesCompanion extends UpdateCompanion<Note> {
  final Value<String> id;
  final Value<String> notebookId;
  final Value<String> title;
  final Value<String> content;
  final Value<String> snippet;
  final Value<String> tint;
  final Value<int> createdAt;
  final Value<int> updatedAt;

  const NotesCompanion({
    this.id = const Value.absent(),
    this.notebookId = const Value.absent(),
    this.title = const Value.absent(),
    this.content = const Value.absent(),
    this.snippet = const Value.absent(),
    this.tint = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });

  NotesCompanion.insert({
    required String id,
    required String notebookId,
    this.title = const Value.absent(),
    required String content,
    this.snippet = const Value.absent(),
    this.tint = const Value.absent(),
    required int createdAt,
    required int updatedAt,
  })  : id = Value(id),
        notebookId = Value(notebookId),
        content = Value(content),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) map['id'] = Variable<String>(id.value);
    if (notebookId.present) map['notebook_id'] = Variable<String>(notebookId.value);
    if (title.present) map['title'] = Variable<String>(title.value);
    if (content.present) map['content'] = Variable<String>(content.value);
    if (snippet.present) map['snippet'] = Variable<String>(snippet.value);
    if (tint.present) map['tint'] = Variable<String>(tint.value);
    if (createdAt.present) map['created_at'] = Variable<int>(createdAt.value);
    if (updatedAt.present) map['updated_at'] = Variable<int>(updatedAt.value);
    return map;
  }
}

class $NotebooksTable extends Notebooks with TableInfo<$NotebooksTable, Notebook> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $NotebooksTable(this.attachedDatabase, [this._alias]);

  @override
  String get actualTableName => 'notebooks';

  @override
  String get aliasedName => _alias ?? actualTableName;

  @override
  List<GeneratedColumn> get $columns =>
      [id, title, color, isClosed, isDefault, createdAt];

  @override
  $NotebooksTable createAlias(String alias) => $NotebooksTable(attachedDatabase, alias);

  @override
  Future<Notebook> map(Map<String, dynamic> data, {String? tablePrefix}) async {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Notebook(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      title: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}title'])!,
      color: attachedDatabase.typeMapping.read(DriftSqlType.int, data['${effectivePrefix}color'])!,
      isClosed: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}is_closed'])!,
      isDefault: attachedDatabase.typeMapping.read(DriftSqlType.bool, data['${effectivePrefix}is_default'])!,
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
    );
  }
}

class $NotesTable extends Notes with TableInfo<$NotesTable, Note> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $NotesTable(this.attachedDatabase, [this._alias]);

  @override
  String get actualTableName => 'notes';

  @override
  String get aliasedName => _alias ?? actualTableName;

  @override
  List<GeneratedColumn> get $columns =>
      [id, notebookId, title, content, snippet, tint, createdAt, updatedAt];

  @override
  $NotesTable createAlias(String alias) => $NotesTable(attachedDatabase, alias);

  @override
  Future<Note> map(Map<String, dynamic> data, {String? tablePrefix}) async {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Note(
      id: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      notebookId: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}notebook_id'])!,
      title: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}title'])!,
      content: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}content'])!,
      snippet: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}snippet'])!,
      tint: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}tint'])!,
      createdAt: attachedDatabase.typeMapping.read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping.read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
    );
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(super.e);

  late final $NotebooksTable notebooks = $NotebooksTable(this);
  late final $NotesTable notes = $NotesTable(this);
  late final Index idxNotesUpdatedAt = Index('idx_notes_updated_at',
      'CREATE INDEX idx_notes_updated_at ON notes (updated_at)');
  late final Index idxNotesNotebookId = Index('idx_notes_notebook_id',
      'CREATE INDEX idx_notes_notebook_id ON notes (notebook_id)');

  @override
  Iterable<TableInfo<Table, Object?>> get allTables => [notebooks, notes];

  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [notebooks, notes, idxNotesUpdatedAt, idxNotesNotebookId];
}
