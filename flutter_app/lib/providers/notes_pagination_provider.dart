import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../core/constants/app_colors.dart';
import '../models/note_preview.dart';
import '../services/db/note_repository.dart';
import 'database_providers.dart';

class PaginatedNotesState {
  const PaginatedNotesState({
    required this.items,
    required this.hasMore,
    required this.isLoadingMore,
    required this.searchQuery,
    this.notebookFilterId,
  });

  final List<NotePreview> items;
  final bool hasMore;
  final bool isLoadingMore;
  final String searchQuery;
  final String? notebookFilterId;

  PaginatedNotesState copyWith({
    List<NotePreview>? items,
    bool? hasMore,
    bool? isLoadingMore,
    String? searchQuery,
    String? notebookFilterId,
  }) {
    return PaginatedNotesState(
      items: items ?? this.items,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      searchQuery: searchQuery ?? this.searchQuery,
      notebookFilterId: notebookFilterId ?? this.notebookFilterId,
    );
  }
}

/// Fetches the 5 most recently updated notes for the Home horizontal Recent Notes strip.
final recentNotesProvider = FutureProvider<List<NotePreview>>((ref) async {
  final repo = ref.watch(noteRepositoryProvider);
  final records = await repo.fetchRecentNotes(limit: 5);
  return records
      .map(NotesPaginationNotifier.mapRecordToPreview)
      .toList(growable: false);
});

final notesPaginationProvider =
    AsyncNotifierProvider<NotesPaginationNotifier, PaginatedNotesState>(
  NotesPaginationNotifier.new,
);

class NotesPaginationNotifier extends AsyncNotifier<PaginatedNotesState> {
  static const int pageSize = 20;

  NoteRepository get _repo => ref.read(noteRepositoryProvider);

  @override
  Future<PaginatedNotesState> build() async {
    return _loadFirstPage(searchQuery: '', notebookFilterId: null);
  }

  Future<PaginatedNotesState> _loadFirstPage({
    required String searchQuery,
    required String? notebookFilterId,
  }) async {
    final records = await _repo.fetchNotesPage(
      limit: pageSize,
      offset: 0,
      searchQuery: searchQuery,
      notebookId: notebookFilterId,
    );

    return PaginatedNotesState(
      items: records.map(mapRecordToPreview).toList(),
      hasMore: records.length == pageSize,
      isLoadingMore: false,
      searchQuery: searchQuery,
      notebookFilterId: notebookFilterId,
    );
  }

  Future<void> refresh() async {
    final current = state.valueOrNull;
    final query = current?.searchQuery ?? '';
    final notebookId = current?.notebookFilterId;
    ref.invalidate(recentNotesProvider);
    state = AsyncData(
      await _loadFirstPage(searchQuery: query, notebookFilterId: notebookId),
    );
  }

  Future<void> setSearchQuery(String query) async {
    final notebookId = state.valueOrNull?.notebookFilterId;
    state = const AsyncLoading();
    state = AsyncData(
      await _loadFirstPage(searchQuery: query, notebookFilterId: notebookId),
    );
  }

  Future<void> loadNextPage() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoadingMore) return;

    state = AsyncData(current.copyWith(isLoadingMore: true));

    final nextRecords = await _repo.fetchNotesPage(
      limit: pageSize,
      offset: current.items.length,
      searchQuery: current.searchQuery,
      notebookId: current.notebookFilterId,
    );

    final mapped = nextRecords.map(mapRecordToPreview).toList();
    state = AsyncData(
      current.copyWith(
        items: [...current.items, ...mapped],
        hasMore: nextRecords.length == pageSize,
        isLoadingMore: false,
      ),
    );
  }

  Future<void> deleteNote(String noteId) async {
    await _repo.deleteNote(noteId);
    await refresh();
  }

  static NotePreview mapRecordToPreview(NoteCardRecord record) {
    final date = DateTime.fromMillisecondsSinceEpoch(record.updatedAt);
    final formattedDate = DateFormat('dd/MM').format(date);

    return NotePreview(
      id: record.id,
      notebookName: record.notebookTitle,
      title: record.title,
      snippet: record.snippet,
      dateLabel: formattedDate,
      tint: _parseTint(record.tint),
      accentColor: _parseColor(record.notebookColor),
    );
  }

  static NoteCardTint _parseTint(String tint) {
    switch (tint) {
      case 'yellow':
        return NoteCardTint.yellow;
      case 'green':
        return NoteCardTint.green;
      case 'purple':
        return NoteCardTint.purple;
      default:
        return NoteCardTint.none;
    }
  }

  static Color _parseColor(int colorInt) {
    if (colorInt == 0) return AppColors.primaryPurple;
    return Color(colorInt);
  }
}
