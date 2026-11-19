import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/app_colors.dart';
import '../models/note_preview.dart';
import '../models/notebook_item.dart';
import '../providers/database_providers.dart';
import '../providers/notes_pagination_provider.dart';
import '../services/db/app_database.dart';
import '../services/export/batch_export_service.dart';
import '../widgets/bottom_action_bar.dart';
import '../widgets/segmented_tab_toggle.dart';
import '../widgets/top_app_bar.dart';
import 'ai_chat_screen.dart';
import 'home_screen.dart';
import 'note_editor_screen.dart';
import 'notebooks_screen.dart';
import 'settings_screen.dart';

class MainShellScreen extends ConsumerStatefulWidget {
  const MainShellScreen({super.key});

  @override
  ConsumerState<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends ConsumerState<MainShellScreen> {
  MainTab _activeTab = MainTab.home;
  bool _isGridView = true;
  bool _isSearchVisible = false;
  String _notebookQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openEditor({String? noteId, String? notebookId}) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NoteEditorScreen(
          noteId: noteId,
          initialNotebookId: notebookId,
        ),
      ),
    );
  }

  Future<void> _confirmAndDeleteNotebook(NotebookItem notebook) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Delete "${notebook.name}"?'),
        content: const Text(
          'Deleting this notebook will also remove all notes inside it from local SQLite storage.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(notebookRepositoryProvider).deleteNotebook(notebook.id);
      await ref.read(notesPaginationProvider.notifier).refresh();
    }
  }

  Future<void> _showCreateNotebookDialog() async {
    final titleController = TextEditingController();
    int selectedColor = AppColors.primaryPurple.toARGB32();

    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final colors = [
              AppColors.primaryPurple.toARGB32(),
              AppColors.secondaryBlue.toARGB32(),
              AppColors.secondaryGreen.toARGB32(),
              AppColors.travelCoral.toARGB32(),
            ];

            return AlertDialog(
              title: const Text('New Notebook'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: titleController,
                    autofocus: true,
                    decoration: const InputDecoration(
                      hintText: 'Notebook name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      for (final colorValue in colors)
                        GestureDetector(
                          onTap: () => setDialogState(() => selectedColor = colorValue),
                          child: Container(
                            width: 28,
                            height: 28,
                            margin: const EdgeInsets.only(right: 10),
                            decoration: BoxDecoration(
                              color: Color(colorValue),
                              shape: BoxShape.circle,
                              border: selectedColor == colorValue
                                  ? Border.all(color: AppColors.textPrimary, width: 2.5)
                                  : null,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () {
                    if (titleController.text.trim().isNotEmpty) {
                      Navigator.of(dialogContext).pop(true);
                    }
                  },
                  child: const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );

    if (created == true && titleController.text.trim().isNotEmpty) {
      await ref.read(notebookRepositoryProvider).createNotebook(
            title: titleController.text.trim(),
            color: selectedColor,
          );
    }
    titleController.dispose();
  }

  void _showUpcomingPhaseNotice(String featureTitle, String phaseDetails) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('$featureTitle — $phaseDetails'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.textPrimary,
          duration: const Duration(seconds: 2),
        ),
      );
  }

  void _openAIChat() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const AIChatScreen()),
    );
  }

  void _openSettings() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const SettingsScreen()),
    );
  }

  Future<void> _runBatchExport(BatchExportFormat format) async {
    final pageNotes = ref.read(notesPaginationProvider).valueOrNull?.items ?? const [];
    if (pageNotes.isEmpty) {
      _showUpcomingPhaseNotice('Batch Export', 'Create at least one note first.');
      return;
    }

    final repo = ref.read(noteRepositoryProvider);
    final loadedNotes = <Note>[];
    for (final preview in pageNotes) {
      final full = await repo.getNoteById(preview.id);
      if (full != null) loadedNotes.add(full);
    }
    if (loadedNotes.isEmpty || !mounted) return;

    final batchService = BatchExportService();
    await batchService.exportNotesBatch(
      notes: loadedNotes,
      format: format,
      bundleTitle: 'NoteGenie AI Export (${loadedNotes.length} Notes)',
    );
  }

  Future<void> _showMoreMenuSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: AppColors.primaryPurpleSoft,
                  child: Icon(Icons.auto_awesome_rounded, color: AppColors.primaryPurple),
                ),
                title: const Text('Ask NoteGenie AI (Bengali Chat)'),
                subtitle: const Text('Offline 4-bit llama.cpp assistant in Isolate'),
                onTap: () {
                  Navigator.of(sheetCtx).pop();
                  _openAIChat();
                },
              ),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFE6F9ED),
                  child: Icon(Icons.tune_rounded, color: AppColors.secondaryGreen),
                ),
                title: const Text('Local AI Model Manager'),
                subtitle: const Text('Import .gguf, swap models & unload RAM'),
                onTap: () {
                  Navigator.of(sheetCtx).pop();
                  _openSettings();
                },
              ),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFFFF2F0),
                  child: Icon(Icons.picture_as_pdf_rounded, color: Color(0xFFE53935)),
                ),
                title: const Text('Batch Export All Notes (PDF)'),
                subtitle: const Text('Combine notes in background Isolate'),
                onTap: () {
                  Navigator.of(sheetCtx).pop();
                  _runBatchExport(BatchExportFormat.pdf);
                },
              ),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFEEF4FF),
                  child: Icon(Icons.description_rounded, color: AppColors.secondaryBlue),
                ),
                title: const Text('Batch Export All Notes (DOCX)'),
                subtitle: const Text('Generate combined Word OpenXML package'),
                onTap: () {
                  Navigator.of(sheetCtx).pop();
                  _runBatchExport(BatchExportFormat.docx);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  static NotebookItem _mapNotebook(Notebook nb) {
    return NotebookItem(
      id: nb.id,
      name: nb.title,
      color: Color(nb.color),
      isDefault: nb.isDefault,
      isClosed: nb.isClosed,
    );
  }

  @override
  Widget build(BuildContext context) {
    final notesAsync = ref.watch(notesPaginationProvider);
    final recentNotes = ref.watch(recentNotesProvider).valueOrNull ?? const <NotePreview>[];
    final openNotebooksAsync = ref.watch(openNotebooksProvider);
    final closedNotebooksAsync = ref.watch(closedNotebooksProvider);

    final openNotebooks = (openNotebooksAsync.valueOrNull ?? const <Notebook>[])
        .where((nb) =>
            _notebookQuery.isEmpty ||
            nb.title.toLowerCase().contains(_notebookQuery.toLowerCase()))
        .map(_mapNotebook)
        .toList();

    final closedNotebooks = (closedNotebooksAsync.valueOrNull ?? const <Notebook>[])
        .where((nb) =>
            _notebookQuery.isEmpty ||
            nb.title.toLowerCase().contains(_notebookQuery.toLowerCase()))
        .map(_mapNotebook)
        .toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            NoteGenieTopAppBar(
              onSearchTap: () {
                setState(() => _isSearchVisible = !_isSearchVisible);
                if (!_isSearchVisible) {
                  _searchController.clear();
                  setState(() => _notebookQuery = '');
                  ref.read(notesPaginationProvider.notifier).setSearchQuery('');
                }
              },
              onSettingsTap: _openSettings,
            ),
            if (_isSearchVisible)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 2, 16, 6),
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) {
                    setState(() => _notebookQuery = value.trim());
                    ref.read(notesPaginationProvider.notifier).setSearchQuery(value);
                  },
                  decoration: InputDecoration(
                    hintText: 'Search indexed notes & notebooks...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _notebookQuery = '');
                        ref.read(notesPaginationProvider.notifier).setSearchQuery('');
                      },
                    ),
                    filled: true,
                    fillColor: AppColors.surfaceSubtle,
                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.borderHairline),
                    ),
                  ),
                ),
              ),
            SegmentedTabToggle(
              activeTab: _activeTab,
              showHomeActions: _activeTab == MainTab.home,
              isGridView: _isGridView,
              onTabChanged: (tab) => setState(() => _activeTab = tab),
              onFilterTap: () => _showUpcomingPhaseNotice(
                'Filter Notes',
                'Use the search bar above to filter indexed titles.',
              ),
              onViewModeToggle: () => setState(() => _isGridView = !_isGridView),
            ),
            Expanded(
              child: IndexedStack(
                index: _activeTab == MainTab.home ? 0 : 1,
                children: [
                  notesAsync.when(
                    data: (pageState) => HomeScreen(
                      recentNotes: recentNotes,
                      notes: pageState.items,
                      isGridView: _isGridView,
                      hasMore: pageState.hasMore,
                      isLoadingMore: pageState.isLoadingMore,
                      onLoadMore: () =>
                          ref.read(notesPaginationProvider.notifier).loadNextPage(),
                      onNoteTap: (note) => _openEditor(noteId: note.id),
                    ),
                    loading: () => const Center(
                      child: CircularProgressIndicator(color: AppColors.primaryPurple),
                    ),
                    error: (err, _) => Center(
                      child: Text('Failed to load local notes: $err'),
                    ),
                  ),
                  NotebooksScreen(
                    openNotebooks: openNotebooks,
                    closedNotebooks: closedNotebooks,
                    onNotebookTap: (nb) => _openEditor(notebookId: nb.id),
                    onDeleteNotebook: _confirmAndDeleteNotebook,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomActionBar(
        activeTab: _activeTab,
        onCreatePage: () => _openEditor(),
        onCreateNotebook: _showCreateNotebookDialog,
        onPenTap: () => _showUpcomingPhaseNotice(
          'Drawing Canvas',
          'Handwriting canvas arrives in an upcoming update.',
        ),
        onCameraTap: () => _showUpcomingPhaseNotice(
          'Document OCR + AI',
          'ML Kit OCR & Bengali AI summary arrive in Phase 5.',
        ),
        onMicTap: () => _showUpcomingPhaseNotice(
          'Bengali Voice Note',
          'Offline Vosk STT arrives in Phase 5.',
        ),
        onMoreTap: _showMoreMenuSheet,
      ),
    );
  }
}
