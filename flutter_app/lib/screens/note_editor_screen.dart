import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/app_colors.dart';
import '../providers/database_providers.dart';
import '../providers/notes_pagination_provider.dart';
import '../services/db/app_database.dart';
import '../services/export/export_service.dart';
import '../widgets/editor_toolbar.dart';
import '../widgets/export_bottom_sheet.dart';
import '../widgets/sync_status_indicator.dart';

class NoteEditorScreen extends ConsumerStatefulWidget {
  const NoteEditorScreen({
    super.key,
    this.noteId,
    this.initialNotebookId,
  });

  final String? noteId;
  final String? initialNotebookId;

  @override
  ConsumerState<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends ConsumerState<NoteEditorScreen> {
  final TextEditingController _titleController = TextEditingController();
  final FocusNode _editorFocusNode = FocusNode();
  final ExportService _exportService = ExportService();
  late QuillController _quillController;

  StreamSubscription<DocChange>? _docSubscription;
  Timer? _autosaveTimer;

  String? _activeNoteId;
  String _selectedNotebookId = 'nb_default';
  String _selectedTint = 'none';
  NoteSyncStatus _syncStatus = NoteSyncStatus.synced;
  bool _isLoading = true;
  bool _isMutating = false;

  @override
  void initState() {
    super.initState();
    _activeNoteId = widget.noteId;
    _selectedNotebookId = widget.initialNotebookId ?? 'nb_default';
    _quillController = QuillController.basic();
    _loadExistingNote();
  }

  Future<void> _loadExistingNote() async {
    if (_activeNoteId != null) {
      final note = await ref.read(noteRepositoryProvider).getNoteById(_activeNoteId!);
      if (note != null && mounted) {
        _titleController.text = note.title;
        _selectedNotebookId = note.notebookId;
        _selectedTint = note.tint;
        _quillController.dispose();
        _quillController = _buildControllerFromJson(note.content);
      }
    }

    _titleController.addListener(_scheduleDebouncedAutosave);
    _docSubscription = _quillController.document.changes.listen((_) {
      _scheduleDebouncedAutosave();
    });

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  QuillController _buildControllerFromJson(String deltaJson) {
    try {
      final decoded = jsonDecode(deltaJson);
      if (decoded is List) {
        return QuillController(
          document: Document.fromJson(decoded),
          selection: const TextSelection.collapsed(offset: 0),
        );
      }
    } catch (_) {
      // Fallback to empty document if malformed JSON
    }
    return QuillController.basic();
  }

  void _scheduleDebouncedAutosave() {
    if (_syncStatus != NoteSyncStatus.pending) {
      setState(() => _syncStatus = NoteSyncStatus.pending);
    }
    _autosaveTimer?.cancel();
    _autosaveTimer = Timer(const Duration(seconds: 2), () {
      _persistNote(silent: true);
    });
  }

  Future<void> _persistNote({bool silent = false}) async {
    if (_isMutating) return;

    final title = _titleController.text.trim();
    final plainText = _quillController.document.toPlainText().trim();

    if (silent && _activeNoteId == null && title.isEmpty && plainText.isEmpty) {
      return;
    }

    _autosaveTimer?.cancel();
    if (mounted) {
      setState(() {
        _isMutating = true;
        _syncStatus = NoteSyncStatus.saving;
      });
    }

    try {
      final deltaJson = jsonEncode(_quillController.document.toDelta().toJson());
      final repo = ref.read(noteRepositoryProvider);

      if (_activeNoteId == null) {
        final created = await repo.createNote(
          notebookId: _selectedNotebookId,
          title: title.isEmpty ? 'Untitled Note' : title,
          deltaJson: deltaJson,
          tint: _selectedTint,
        );
        _activeNoteId = created.id;
      } else {
        await repo.updateNote(
          id: _activeNoteId!,
          notebookId: _selectedNotebookId,
          title: title.isEmpty ? 'Untitled Note' : title,
          deltaJson: deltaJson,
          tint: _selectedTint,
        );
      }

      await ref.read(notesPaginationProvider.notifier).refresh();

      if (mounted) {
        setState(() => _syncStatus = NoteSyncStatus.synced);
        if (!silent) {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              const SnackBar(
                content: Text('Note saved to SQLite'),
                duration: Duration(seconds: 1),
                behavior: SnackBarBehavior.floating,
              ),
            );
        }
      }
    } finally {
      _isMutating = false;
    }
  }

  Future<void> _openExportSheet() async {
    // Ensure latest edits are persisted before exporting
    if (_syncStatus == NoteSyncStatus.pending) {
      await _persistNote(silent: true);
    }
    if (!mounted) return;

    final deltaJson = jsonEncode(_quillController.document.toDelta().toJson());
    final title = _titleController.text.trim().isEmpty
        ? 'Untitled Note'
        : _titleController.text.trim();

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => ExportBottomSheet(
        noteTitle: title,
        deltaJson: deltaJson,
        exportService: _exportService,
      ),
    );
  }

  Future<void> _confirmAndDeleteNote() async {
    if (_activeNoteId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete note?'),
        content: const Text(
          'This note will be permanently removed from your local SQLite database.',
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

    if (confirmed == true && _activeNoteId != null) {
      _autosaveTimer?.cancel();
      await ref.read(notesPaginationProvider.notifier).deleteNote(_activeNoteId!);
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  Future<void> _handleBackNavigation() async {
    if (_syncStatus == NoteSyncStatus.pending) {
      await _persistNote(silent: true);
    }
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  void dispose() {
    _autosaveTimer?.cancel();
    _docSubscription?.cancel();
    _titleController.removeListener(_scheduleDebouncedAutosave);
    _titleController.dispose();
    _editorFocusNode.dispose();
    _quillController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final openNotebooks = ref.watch(openNotebooksProvider).valueOrNull ?? const <Notebook>[];

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop) {
          await _handleBackNavigation();
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          leading: IconButton(
            onPressed: _handleBackNavigation,
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Back to notes',
          ),
          title: _NotebookPicker(
            notebooks: openNotebooks,
            selectedId: _selectedNotebookId,
            onChanged: (id) {
              setState(() => _selectedNotebookId = id);
              _scheduleDebouncedAutosave();
            },
          ),
          actions: [
            SyncStatusIndicator(status: _syncStatus),
            IconButton(
              onPressed: _openExportSheet,
              tooltip: 'Export / Share',
              icon: const Icon(
                Icons.ios_share_rounded,
                color: AppColors.textPrimary,
                size: 21,
              ),
            ),
            if (_activeNoteId != null)
              IconButton(
                onPressed: _confirmAndDeleteNote,
                tooltip: 'Delete note',
                icon: const Icon(
                  Icons.delete_outline_rounded,
                  color: AppColors.textSecondary,
                  size: 21,
                ),
              ),
            TextButton(
              onPressed: () => _persistNote(silent: false),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primaryPurple,
              ),
              child: const Text(
                'Save',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5),
              ),
            ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryPurple))
            : Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 6, 18, 4),
                    child: TextField(
                      controller: _titleController,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontSize: 21,
                            fontWeight: FontWeight.w700,
                          ),
                      decoration: const InputDecoration(
                        hintText: 'Note title...',
                        hintStyle: TextStyle(color: AppColors.textMuted),
                        border: InputBorder.none,
                      ),
                      textInputAction: TextInputAction.next,
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
                      child: QuillEditor.basic(
                        controller: _quillController,
                        focusNode: _editorFocusNode,
                        configurations: const QuillEditorConfigurations(
                          placeholder: 'Start writing offline notes...',
                          expands: true,
                        ),
                      ),
                    ),
                  ),
                  EditorFormattingToolbar(controller: _quillController),
                ],
              ),
      ),
    );
  }
}

class _NotebookPicker extends StatelessWidget {
  const _NotebookPicker({
    required this.notebooks,
    required this.selectedId,
    required this.onChanged,
  });

  final List<Notebook> notebooks;
  final String selectedId;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    if (notebooks.isEmpty) {
      return const Text('My Notebook', style: TextStyle(fontSize: 14.5));
    }

    final currentValue =
        notebooks.any((n) => n.id == selectedId) ? selectedId : notebooks.first.id;

    return DropdownButtonHideUnderline(
      child: DropdownButton<String>(
        value: currentValue,
        icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 18),
        style: const TextStyle(
          fontSize: 14.5,
          fontWeight: FontWeight.w500,
          color: AppColors.textPrimary,
        ),
        items: notebooks
            .map(
              (nb) => DropdownMenuItem<String>(
                value: nb.id,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: Color(nb.color),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(nb.title, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            )
            .toList(),
        onChanged: (val) {
          if (val != null) onChanged(val);
        },
      ),
    );
  }
}
